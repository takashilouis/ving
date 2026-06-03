import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkCredits, deductCredits, CREDIT_COSTS } from "@/lib/credits";
import { decryptApiKey } from "@/lib/supabase/encryption";
import { withCsrfProtection } from "@/lib/csrf";
import { uploadToR2, generateR2Filename } from "@/lib/r2-storage";

export const maxDuration = 60;

async function extendWithGemini(
    googleUri: string,
    prompt?: string
): Promise<{ buffer: Buffer; googleUri: string }> {
    const adminSupabase = createAdminClient();
    const { data: keyData, error: keyError } = await adminSupabase
        .from("admin_api_keys")
        .select("encrypted_key")
        .eq("key_type", "gemini")
        .eq("is_active", true)
        .maybeSingle();

    if (keyError) throw new Error("Service temporarily unavailable. Please try again later.");
    if (!keyData) throw new Error("Gemini API key is not configured. Please ask an admin to add it in Settings.");

    const apiKey = decryptApiKey(keyData.encrypted_key, "admin");
    const ai = new GoogleGenAI({ apiKey });

    let operation;
    try {
        operation = await ai.models.generateVideos({
            model: "veo-3.1-fast-generate-preview",
            prompt: prompt || undefined,
            video: { uri: googleUri },
            config: {
                numberOfVideos: 1,
                resolution: "720p",
            },
        });
    } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        if (msg.includes("PERMISSION_DENIED") || msg.includes("403")) {
            throw new Error(
                "This video's Google URI has expired (Google Files API has a 48-hour limit). Extension is no longer available for this video."
            );
        }
        throw error;
    }

    const maxAttempts = 60;
    let attempts = 0;
    while (!operation.done && attempts < maxAttempts) {
        await new Promise((r) => setTimeout(r, 10000));
        operation = await ai.operations.getVideosOperation({ operation });
        attempts++;
    }

    if (!operation.done) throw new Error("Video extension timed out. Please try again.");

    const newVideoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!newVideoUri) throw new Error("Extension failed. The video may have been filtered by safety settings.");

    const videoResponse = await fetch(newVideoUri, {
        headers: { "x-goog-api-key": apiKey },
    });
    if (!videoResponse.ok) throw new Error(`Failed to download extended video: ${videoResponse.statusText}`);

    return { buffer: Buffer.from(await videoResponse.arrayBuffer()), googleUri: newVideoUri };
}

export async function POST(request: NextRequest) {
    return withCsrfProtection(request, async (req) => {
        try {
            const body = await req.json();
            const { googleVideoUri, prompt, originalPrompt, aspectRatio = "16:9" } = body;

            if (!googleVideoUri) {
                return NextResponse.json({ error: "Google video URI is required." }, { status: 400 });
            }

            const supabase = await createClient();
            const { data: { user }, error: authError } = await supabase.auth.getUser();

            if (authError || !user) {
                return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });
            }

            // Extension costs 1 credit (same as generation)
            const requiredCredits = CREDIT_COSTS.veo;
            const { hasEnough, balance } = await checkCredits(user.id, requiredCredits);

            if (!hasEnough) {
                return NextResponse.json(
                    {
                        error: `Insufficient credits. You need ${requiredCredits} credit(s) but only have ${balance}.`,
                        balance,
                        required: requiredCredits,
                    },
                    { status: 402 }
                );
            }

            const { buffer: videoBuffer, googleUri: newGoogleUri } = await extendWithGemini(googleVideoUri, prompt);

            let r2Url = "";
            let r2Key: string | null = null;

            try {
                const filename = generateR2Filename("videos", "mp4");
                const { url, key } = await uploadToR2(videoBuffer, filename, "video/mp4");
                r2Url = url;
                r2Key = key;
            } catch (r2Error) {
                console.error("R2 upload failed:", r2Error);
                r2Url = `data:video/mp4;base64,${videoBuffer.toString("base64")}`;
            }

            await deductCredits(user.id, requiredCredits, "veo_generation", {
                prompt: prompt || originalPrompt,
                type: "extension",
                provider: "gemini",
            });

            try {
                await supabase.from("generated_videos").insert({
                    user_id: user.id,
                    url: r2Url,
                    prompt: prompt || originalPrompt || "Video extension",
                    duration: 8,
                    source: "veo",
                    aspect_ratio: aspectRatio,
                    resolution: "720p",
                    google_uri: newGoogleUri,
                    r2_key: r2Key,
                });
            } catch (dbError) {
                console.error("Failed to save extended video to database:", dbError);
            }

            const { balance: newBalance } = await checkCredits(user.id, 0);

            return NextResponse.json({
                success: true,
                videoUrl: r2Url,
                googleVideoUri: newGoogleUri,
                creditsUsed: requiredCredits,
                remainingBalance: newBalance,
            });
        } catch (error: unknown) {
            console.error("Video extension error:", error);
            const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";

            if (errorMessage.includes("quota") || errorMessage.includes("limit")) {
                return NextResponse.json({ error: "API quota exceeded. Please try again later." }, { status: 429 });
            }
            if (errorMessage.includes("safety") || errorMessage.includes("blocked")) {
                return NextResponse.json(
                    { error: "Content was blocked by safety filters. Please modify your prompt." },
                    { status: 400 }
                );
            }
            if (errorMessage.includes("Aspect ratio") || errorMessage.includes("16:9")) {
                return NextResponse.json(
                    { error: "Veo can only extend 16:9 (widescreen) videos. Portrait and square videos cannot be extended." },
                    { status: 400 }
                );
            }

            return NextResponse.json({ error: `Video extension failed: ${errorMessage}` }, { status: 500 });
        }
    });
}
