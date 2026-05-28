import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkCredits, deductCredits, CREDIT_COSTS } from "@/lib/credits";
import { withCsrfProtection } from "@/lib/csrf";
import { uploadToR2, generateR2Filename } from "@/lib/r2-storage";

// Short timeout — each poll is a single HTTP check, not a loop.
export const maxDuration = 30;

export async function POST(request: NextRequest) {
    return withCsrfProtection(request, async (req) => {
        try {
            const body = await req.json();
            const { operationName, prompt, duration, aspectRatio = "16:9" } = body;

            if (!operationName) {
                return NextResponse.json({ error: "operationName is required" }, { status: 400 });
            }

            // Auth check
            const supabase = await createClient();
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            if (authError || !user) {
                return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });
            }

            // Single status check against Vertex AI — no loop
            const apiKey = process.env.VERTEX_API_KEY;
            if (!apiKey) throw new Error("VERTEX_API_KEY environment variable is not set.");

            const location = process.env.VERTEX_LOCATION || "us-central1";
            const baseUrl = `https://${location}-aiplatform.googleapis.com/v1beta1`;

            // Vertex AI Express operations for models like Veo use UUIDs and MUST
            // be requested using the exact operation name that includes the publisher/model path.
            const pollResponse = await fetch(`${baseUrl}/${operationName}?key=${apiKey}`);

            if (!pollResponse.ok) {
                const errBody = await pollResponse.text();
                throw new Error(`Failed to check operation status (${pollResponse.status}): ${errBody}`);
            }

            const operationResult = await pollResponse.json();

            // Still processing
            if (!operationResult.done) {
                return NextResponse.json({ done: false });
            }

            // Vertex returned an error
            if (operationResult.error) {
                const msg = operationResult.error.message || "Vertex AI generation failed.";
                if (msg.includes("safety") || msg.includes("blocked")) {
                    return NextResponse.json(
                        { error: "Content was blocked by safety filters. Please modify your prompt." },
                        { status: 400 }
                    );
                }
                throw new Error(msg);
            }

            // Extract video bytes
            const videoBase64: string | undefined =
                operationResult.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.bytesBase64Encoded;

            if (!videoBase64) {
                throw new Error("No video was generated. The prompt may have been filtered by safety settings.");
            }

            const videoBuffer = Buffer.from(videoBase64, "base64");

            // Check credits before deducting (guard against race conditions)
            const requiredCredits = CREDIT_COSTS.veo;
            const { hasEnough, balance } = await checkCredits(user.id, requiredCredits);
            if (!hasEnough) {
                return NextResponse.json(
                    {
                        error: `Insufficient credits. You need ${requiredCredits} but only have ${balance}.`,
                        balance,
                        required: requiredCredits,
                    },
                    { status: 402 }
                );
            }

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

            // Deduct credits
            await deductCredits(user.id, requiredCredits, "veo_generation", {
                prompt,
                duration,
                aspectRatio,
                provider: "vertex",
            });

            // Persist to DB
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
                done: true,
                videoUrl: r2Url,
                prompt,
                duration,
                creditsUsed: requiredCredits,
                remainingBalance: newBalance,
            });
        } catch (error: unknown) {
            console.error("Video poll error:", error);
            const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
            return NextResponse.json({ error: `Poll failed: ${errorMessage}` }, { status: 500 });
        }
    });
}
