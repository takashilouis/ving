import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkCredits, deductCredits, CREDIT_COSTS } from "@/lib/credits";
import { decryptApiKey } from "@/lib/supabase/encryption";
import { withCsrfProtection } from "@/lib/csrf";
import { uploadToR2, generateR2Filename } from "@/lib/r2-storage";

export const maxDuration = 60; // Only needs to start the operation, not wait for it

// Switch provider via env var: "gemini" (default) or "vertex"
const VEO_PROVIDER = process.env.VEO_PROVIDER || "gemini";

// --- Gemini AI Studio path ---
/**
 * Generate a video using Gemini VEO and return the resulting MP4 bytes.
 *
 * @param prompt - The text prompt guiding the video generation. Pass an empty string to omit a prompt.
 * @param duration - Desired duration of the generated video in seconds.
 * @param aspectRatio - Target aspect ratio (for example, "16:9").
 * @param resolution - Target resolution (for example, "720p", "1080p", "4k").
 * @param imageBase64 - Optional base64-encoded image to use as an input frame for generation.
 * @param imageMimeType - MIME type of `imageBase64` (for example, "image/png" or "image/jpeg").
 * @returns The generated video MP4 as a Buffer.
 * @throws If the service API key lookup fails.
 * @throws If no active Gemini API key is configured.
 * @throws If video generation does not complete within the polling timeout.
 * @throws If the operation completes but no generated video URI is available (may indicate safety filtering).
 * @throws If downloading the generated video fails.
 */
async function generateWithGemini(
    prompt: string,
    duration: number,
    aspectRatio: string,
    resolution: string,
    imageBase64?: string,
    imageMimeType?: string
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

    let operation = await ai.models.generateVideos({
        model: "veo-3.1-fast-generate-preview",
        prompt: prompt || undefined,
        ...(imageBase64 ? { image: { imageBytes: imageBase64, mimeType: imageMimeType } } : {}),
        config: { aspectRatio, durationSeconds: duration, resolution },
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

    return { buffer: Buffer.from(await videoResponse.arrayBuffer()), googleUri: videoUri };
}

// --- Vertex AI path (start only — no polling) ---
// Vertex AI Express API keys (AQ. prefix) require the global endpoint with v1beta1.
// Polling is done client-side via /api/generate-veo-video/poll.
async function startVertexGeneration(
    prompt: string,
    duration: number,
    aspectRatio: string
): Promise<string> {
    const apiKey = process.env.VERTEX_API_KEY;
    if (!apiKey) throw new Error("VERTEX_API_KEY environment variable is not set.");

    const project = process.env.VERTEX_PROJECT;
    const location = process.env.VERTEX_LOCATION || "us-central1";
    if (!project) throw new Error("VERTEX_PROJECT environment variable is not set.");

    const model = "veo-3.1-fast-generate-001";
    const baseUrl = `https://${location}-aiplatform.googleapis.com/v1beta1`;
    const endpoint = `${baseUrl}/projects/${project}/locations/${location}/publishers/google/models/${model}`;

    const generateResponse = await fetch(`${endpoint}:predictLongRunning?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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

    const generateData = await generateResponse.json();
    const operationName: string | undefined = generateData.name;
    if (!operationName) throw new Error("No operation name returned from Vertex AI.");

    return operationName;
}

/**
 * Handle POST requests to generate VEO videos, routing to Vertex (async start) or Gemini (server-side generation) and returning operation metadata or the generated video URL.
 *
 * Performs authentication, checks and deducts user credits, enforces duration/resolution constraints, optionally accepts an input image (`imageBase64` with `imageMimeType`), uploads generated videos to R2 (with a base64 fallback), and records generation metadata in the database.
 *
 * Responses:
 * - 200 (Vertex flow): JSON with `{ async: true, operationName, prompt, duration, aspectRatio }`
 * - 200 (Gemini flow): JSON with `{ success: true, videoUrl, prompt, duration, creditsUsed, remainingBalance }`
 * - 400: missing prompt or content blocked by safety filters
 * - 401: unauthorized
 * - 402: insufficient credits (includes `balance` and `required`)
 * - 429: API quota exceeded
 * - 500: other failures with an error message
 *
 * @param request - Incoming NextRequest containing JSON body with `prompt`, optional `duration`, `aspectRatio`, `resolution`, and optional `imageBase64`/`imageMimeType`.
 * @returns A NextResponse containing a JSON payload described above.
 */
export async function POST(request: NextRequest) {
    return withCsrfProtection(request, async (req) => {
        try {
            const body = await req.json();
            const { prompt, aspectRatio = "16:9", resolution = "720p", imageBase64, imageMimeType } = body;
            // 1080p and 4K require exactly 8s per Gemini API constraints
            const duration = (resolution === "1080p" || resolution === "4k") ? 8 : (body.duration || 6);

            // Prompt is required for text-to-video, optional when an image is provided
            if (!prompt && !imageBase64) {
                return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
            }

            // Authenticate user
            const supabase = await createClient();
            const { data: { user }, error: authError } = await supabase.auth.getUser();

            if (authError || !user) {
                return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });
            }

            // Check credits upfront
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

            // --- Vertex: async (start job, client polls) ---
            if (VEO_PROVIDER === "vertex") {
                const operationName = await startVertexGeneration(
                    prompt,
                    duration || 6,
                    aspectRatio
                );
                return NextResponse.json({
                    async: true,
                    operationName,
                    prompt,
                    duration: duration || 6,
                    aspectRatio,
                });
            }

            // --- Gemini: sync (poll server-side, return video directly) ---
            const { buffer: videoBuffer, googleUri } = await generateWithGemini(prompt, duration || 6, aspectRatio, resolution, imageBase64, imageMimeType);

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

            await deductCredits(user.id, requiredCredits, "veo_generation", {
                prompt,
                duration,
                aspectRatio,
                provider: "gemini",
            });

            try {
                await supabase.from("generated_videos").insert({
                    user_id: user.id,
                    url: r2Url,
                    prompt,
                    duration,
                    source: "veo",
                    aspect_ratio: aspectRatio,
                    resolution,
                    google_uri: googleUri,
                    r2_key: r2Key,
                });
            } catch (dbError) {
                console.error("Failed to save video to database:", dbError);
            }

            const { balance: newBalance } = await checkCredits(user.id, 0);

            return NextResponse.json({
                success: true,
                videoUrl: r2Url,
                googleVideoUri: googleUri,
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

            return NextResponse.json({ error: `Video generation failed: ${errorMessage}` }, { status: 500 });
        }
    });
}
