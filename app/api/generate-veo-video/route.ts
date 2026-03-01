import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkCredits, deductCredits, CREDIT_COSTS } from "@/lib/credits";
import { decryptApiKey } from "@/lib/supabase/encryption";
import { withCsrfProtection } from "@/lib/csrf";
import { uploadToR2, generateR2Filename } from "@/lib/r2-storage";

export const maxDuration = 300;

// Switch provider via env var: "gemini" (default) or "vertex"
const VEO_PROVIDER = process.env.VEO_PROVIDER || "gemini";

// --- Gemini AI Studio path ---
// Uses admin-managed API key stored encrypted in the DB.
// Model: veo-3.1-fast-generate-preview (Google AI Studio preview)
async function generateWithGemini(
    prompt: string,
    duration: number,
    aspectRatio: string
): Promise<Buffer> {
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

    let operation = await ai.models.generateVideos({
        model: "veo-3.1-fast-generate-preview",
        prompt,
        config: { aspectRatio, durationSeconds: duration },
    });

    const maxAttempts = 60; // 10 min (10s × 60)
    let attempts = 0;
    while (!operation.done && attempts < maxAttempts) {
        await new Promise((r) => setTimeout(r, 10000));
        operation = await ai.operations.getVideosOperation({ operation });
        attempts++;
    }

    if (!operation.done) throw new Error("Video generation timed out. Please try again.");

    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!videoUri) throw new Error("No video was generated. The prompt may have been filtered by safety settings.");

    const videoResponse = await fetch(videoUri, {
        headers: { "x-goog-api-key": apiKey },
    });
    if (!videoResponse.ok) throw new Error(`Failed to download video: ${videoResponse.statusText}`);

    return Buffer.from(await videoResponse.arrayBuffer());
}

// --- Vertex AI path ---
// Uses a plain API key (created in Google Cloud Console → APIs & Services → Credentials).
// Set env vars: VERTEX_PROJECT, VERTEX_API_KEY, and optionally VERTEX_LOCATION.
// Model: veo-3.1-fast-generate-001 (Vertex AI stable release)
async function generateWithVertex(
    prompt: string,
    duration: number,
    aspectRatio: string
): Promise<Buffer> {
    const project = process.env.VERTEX_PROJECT;
    const location = process.env.VERTEX_LOCATION || "us-central1";
    const apiKey = process.env.VERTEX_API_KEY;

    if (!project) throw new Error("VERTEX_PROJECT environment variable is not set.");
    if (!apiKey) throw new Error("VERTEX_API_KEY environment variable is not set.");

    const model = "veo-3.1-fast-generate-001";
    const baseUrl = `https://${location}-aiplatform.googleapis.com/v1`;
    const endpoint = `${baseUrl}/projects/${project}/locations/${location}/publishers/google/models/${model}`;

    // Start long-running generation
    const generateResponse = await fetch(`${endpoint}:predictLongRunning`, {
        method: "POST",
        headers: {
            "x-goog-api-key": apiKey,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            instances: [{ prompt }],
            parameters: {
                aspectRatio,
                durationSeconds: duration,
                sampleCount: 1,
                generateAudio: false,
            },
        }),
    });

    if (!generateResponse.ok) {
        const errBody = await generateResponse.text();
        throw new Error(`Vertex AI request failed (${generateResponse.status}): ${errBody}`);
    }

    const { name: operationName } = await generateResponse.json();
    if (!operationName) throw new Error("No operation name returned from Vertex AI.");

    // Poll every 15s (max 40 attempts ≈ 10 min)
    const maxAttempts = 40;
    let attempts = 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let operationResult: any = null;

    while (attempts < maxAttempts) {
        await new Promise((r) => setTimeout(r, 15000));
        const pollResponse = await fetch(`${baseUrl}/${operationName}`, {
            headers: { "x-goog-api-key": apiKey },
        });
        if (pollResponse.ok) {
            operationResult = await pollResponse.json();
            if (operationResult.done) break;
        }
        attempts++;
    }

    if (!operationResult?.done) throw new Error("Video generation timed out. Please try again.");
    if (operationResult.error) throw new Error(operationResult.error.message || "Vertex AI generation failed.");

    const videoBase64: string | undefined =
        operationResult.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.bytesBase64Encoded;

    if (!videoBase64) throw new Error("No video was generated. The prompt may have been filtered by safety settings.");

    return Buffer.from(videoBase64, "base64");
}

// --- Main handler ---
export async function POST(request: NextRequest) {
    return withCsrfProtection(request, async (req) => {
        try {
            const body = await req.json();
            const { prompt, duration, aspectRatio = "16:9" } = body;

            if (!prompt) {
                return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
            }

            // Authenticate user
            const supabase = await createClient();
            const { data: { user }, error: authError } = await supabase.auth.getUser();

            if (authError || !user) {
                return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });
            }

            // Check credits
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

            // Generate video — delegate to the configured provider
            const videoBuffer = VEO_PROVIDER === "vertex"
                ? await generateWithVertex(prompt, duration || 6, aspectRatio)
                : await generateWithGemini(prompt, duration || 6, aspectRatio);

            // Upload to R2
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

            // Deduct credits after successful generation
            await deductCredits(user.id, requiredCredits, "veo_generation", {
                prompt,
                duration,
                aspectRatio,
                provider: VEO_PROVIDER,
            });

            // Save to DB for history
            try {
                await supabase.from("generated_videos").insert({
                    user_id: user.id,
                    url: r2Url,
                    prompt,
                    duration,
                    source: "veo",
                    aspect_ratio: aspectRatio,
                    r2_key: r2Key,
                });
            } catch (dbError) {
                console.error("Failed to save video to database:", dbError);
            }

            const { balance: newBalance } = await checkCredits(user.id, 0);

            return NextResponse.json({
                success: true,
                videoUrl: r2Url,
                prompt,
                duration,
                creditsUsed: requiredCredits,
                remainingBalance: newBalance,
            });
        } catch (error: unknown) {
            console.error("Video generation error:", error);
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
            if (errorMessage.includes("timed out")) {
                return NextResponse.json({ error: errorMessage }, { status: 504 });
            }

            return NextResponse.json({ error: `Video generation failed: ${errorMessage}` }, { status: 500 });
        }
    });
}
