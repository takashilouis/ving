import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkCredits, deductCredits, CREDIT_COSTS } from "@/lib/credits";
import { decryptApiKey } from "@/lib/supabase/encryption";
import { withCsrfProtection } from "@/lib/csrf";

export const maxDuration = 300; // 5 minutes timeout for video generation

export async function POST(request: NextRequest) {
    return withCsrfProtection(request, async (req) => {
        try {
            const body = await request.json();
            const { prompt, duration, aspectRatio = "16:9" } = body;

            if (!prompt) {
                return NextResponse.json(
                    { error: "Prompt is required" },
                    { status: 400 }
                );
            }

            // Authenticate user
            const supabase = await createClient();

            // Get session first for JWT token debugging
            const { data: { session } } = await supabase.auth.getSession();

            // DEBUG: Log JWT token (only visible in server console, NOT in browser DevTools)
            if (session?.access_token) {
                console.log('=== JWT TOKEN DEBUG ===');
                console.log('Full JWT Token:', session.access_token);
                console.log('Token parts:', session.access_token.split('.'));
                console.log('User from token:', {
                    id: session.user?.id,
                    email: session.user?.email,
                    exp: session.expires_at
                });
                console.log('======================');
            }

            // Get user for authentication check
            const {
                data: { user },
                error: authError,
            } = await supabase.auth.getUser();

            if (authError || !user) {
                return NextResponse.json(
                    { error: "Unauthorized. Please sign in." },
                    { status: 401 }
                );
            }

            // Check if user has sufficient credits
            const requiredCredits = CREDIT_COSTS.veo;
            const { hasEnough, balance } = await checkCredits(user.id, requiredCredits);

            if (!hasEnough) {
                return NextResponse.json(
                    {
                        error: `Insufficient credits. You need ${requiredCredits} credit(s) but only have ${balance}.`,
                        balance,
                        required: requiredCredits,
                    },
                    { status: 402 } // 402 Payment Required
                );
            }

            // Fetch admin Gemini API key
            const adminSupabase = createAdminClient();
            const { data: keyData, error: keyError } = await adminSupabase
                .from("admin_api_keys")
                .select("encrypted_key")
                .eq("key_type", "gemini")
                .eq("is_active", true)
                .maybeSingle();

            if (keyError) {
                console.error("Error fetching admin API key:", keyError);
                return NextResponse.json(
                    { error: "Service temporarily unavailable. Please try again later." },
                    { status: 503 }
                );
            }

            if (!keyData) {
                return NextResponse.json(
                    { error: "Gemini API key is not configured. Please ask an admin to configure it in the Settings." },
                    { status: 503 }
                );
            }

            // Decrypt the API key (using a fixed admin ID for admin keys)
            const apiKey = decryptApiKey(keyData.encrypted_key, "admin");

            // Initialize the Google GenAI client with admin API key
            const ai = new GoogleGenAI({ apiKey });

            // Start video generation with veo-3.1-fast-generate-preview
            let operation = await ai.models.generateVideos({
                model: "veo-3.1-fast-generate-preview",
                prompt: prompt,
                config: {
                    aspectRatio: aspectRatio, // Use the aspect ratio from request
                    durationSeconds: duration || 6,
                },
            });

            // Poll the operation status until the video is ready
            const maxAttempts = 60; // 10 minutes max (10s * 60)
            let attempts = 0;

            while (!operation.done && attempts < maxAttempts) {
                await new Promise((resolve) => setTimeout(resolve, 10000)); // Wait 10 seconds
                operation = await ai.operations.getVideosOperation({
                    operation: operation,
                });
                attempts++;
            }

            if (!operation.done) {
                return NextResponse.json(
                    { error: "Video generation timed out. Please try again." },
                    { status: 504 }
                );
            }

            // Check if we have generated videos
            if (
                !operation.response?.generatedVideos ||
                operation.response.generatedVideos.length === 0
            ) {
                return NextResponse.json(
                    {
                        error:
                            "No video was generated. The prompt may have been filtered by safety settings.",
                    },
                    { status: 400 }
                );
            }

            const generatedVideo = operation.response.generatedVideos[0];

            // Get the video URI from the response
            const videoUri = generatedVideo.video?.uri;

            if (!videoUri) {
                return NextResponse.json(
                    { error: "Video URL not found in response" },
                    { status: 500 }
                );
            }

            // Download the video using the API key as authentication
            // The video URI requires the API key to be passed as a header
            const videoResponse = await fetch(videoUri, {
                headers: {
                    "x-goog-api-key": apiKey,
                },
                redirect: "follow",
            });

            if (!videoResponse.ok) {
                console.error(
                    "Failed to download video:",
                    videoResponse.status,
                    videoResponse.statusText
                );
                return NextResponse.json(
                    { error: `Failed to download video: ${videoResponse.statusText}` },
                    { status: 500 }
                );
            }

            // Get the video as an ArrayBuffer and convert to base64
            const videoArrayBuffer = await videoResponse.arrayBuffer();
            const videoBase64 = Buffer.from(videoArrayBuffer).toString("base64");

            // Upload to R2 for persistent storage
            let r2Url = "";
            let r2Key: string | null = null;

            try {
                const { uploadToR2, generateR2Filename } = await import("@/lib/r2-storage");
                const videoBuffer = Buffer.from(videoArrayBuffer);
                const filename = generateR2Filename("videos", "mp4");

                const { url, key } = await uploadToR2(videoBuffer, filename, "video/mp4");
                r2Url = url;
                r2Key = key;
            } catch (r2Error) {
                console.error("R2 upload failed:", r2Error);
                // Fallback to data URL
                r2Url = `data:video/mp4;base64,${videoBase64}`;
            }

            // Deduct credits after successful generation
            await deductCredits(user.id, requiredCredits, "veo_generation", {
                prompt: prompt,
                duration: duration,
                aspectRatio: aspectRatio,
                model: "veo-3.1-fast-generate-preview",
            });

            // Save to database for history
            try {
                await supabase.from("generated_videos").insert({
                    user_id: user.id,
                    url: r2Url,
                    prompt: prompt,
                    duration: duration,
                    source: "veo",
                    aspect_ratio: aspectRatio,
                    r2_key: r2Key,
                });
            } catch (dbError) {
                console.error("Failed to save video to database:", dbError);
            }

            // Get updated balance
            const { balance: newBalance } = await checkCredits(user.id, 0);

            return NextResponse.json({
                success: true,
                videoUrl: r2Url,
                prompt: prompt,
                duration: duration,
                creditsUsed: requiredCredits,
                remainingBalance: newBalance,
            });
        } catch (error: unknown) {
            console.error("Video generation error:", error);

            const errorMessage =
                error instanceof Error ? error.message : "Unknown error occurred";

            // Handle specific API errors
            if (errorMessage.includes("API key") || errorMessage.includes("API_KEY")) {
                return NextResponse.json(
                    { error: "Invalid API key. Please check your Gemini API key." },
                    { status: 401 }
                );
            }

            if (errorMessage.includes("quota") || errorMessage.includes("limit")) {
                return NextResponse.json(
                    { error: "API quota exceeded. Please try again later." },
                    { status: 429 }
                );
            }

            if (errorMessage.includes("safety") || errorMessage.includes("blocked")) {
                return NextResponse.json(
                    {
                        error:
                            "Content was blocked by safety filters. Please modify your prompt.",
                    },
                    { status: 400 }
                );
            }

            return NextResponse.json(
                { error: `Video generation failed: ${errorMessage}` },
                { status: 500 }
            );
        }
    });
}
