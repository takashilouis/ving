import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkCredits, deductCredits, getImageCreditCost } from "@/lib/credits";
import { decryptApiKey } from "@/lib/supabase/encryption";
import { withCsrfProtection } from "@/lib/csrf";
import { ImageModel, ImageQuality } from "@/lib/types";

export const maxDuration = 300; // 5 minutes timeout for image generation

// Model IDs per tier
const IMAGE_MODELS: Record<string, string> = {
    flash: "gemini-3.1-flash-image",
    pro:   "gemini-3-pro-image",
};

// Aspect ratio → [w, h] ratio units (used for Sharp crop + resize)
const RATIO_UNITS: Record<string, [number, number]> = {
    "1:1":  [1, 1],
    "16:9": [16, 9],
    "9:16": [9, 16],
    "4:3":  [4, 3],
    "3:4":  [3, 4],
};

// Longest-side pixel target per quality tier
const QUALITY_PX: Record<string, number> = {
    "1K": 1024,
    "2K": 2048,
    "4K": 4096,
};

// Prompt hints so the model composes for the right shape
const ASPECT_HINTS: Record<string, string> = {
    "1:1":  "square 1:1 composition",
    "16:9": "widescreen 16:9 landscape composition",
    "9:16": "vertical 9:16 portrait composition",
    "4:3":  "standard 4:3 landscape composition",
    "3:4":  "portrait 3:4 composition",
};

export async function POST(request: NextRequest) {
    return withCsrfProtection(request, async (req) => {
        try {
            const body = await req.json();
            const {
                prompt,
                model = "pro",
                quality = "1K",
                aspectRatio = "16:9",
            } = body as {
                prompt: string;
                model: ImageModel;
                quality: ImageQuality;
                aspectRatio: string;
            };

            if (!prompt) {
                return NextResponse.json(
                    { error: "Prompt is required" },
                    { status: 400 }
                );
            }

            // Validate model
            if (!["flash", "pro"].includes(model)) {
                return NextResponse.json(
                    { error: "Invalid model. Use 'flash' or 'pro'." },
                    { status: 400 }
                );
            }

            // Validate quality
            if (!["1K", "2K", "4K"].includes(quality)) {
                return NextResponse.json(
                    { error: "Invalid quality. Use '1K', '2K', or '4K'." },
                    { status: 400 }
                );
            }

            // 4K only for Pro
            if (quality === "4K" && model !== "pro") {
                return NextResponse.json(
                    { error: "4K quality is only available for Nano Banana Pro." },
                    { status: 400 }
                );
            }

            // Authenticate user
            const supabase = await createClient();
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

            // Calculate credit cost based on model and quality
            const requiredCredits = getImageCreditCost(model, quality);
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

            // Decrypt the API key
            const apiKey = decryptApiKey(keyData.encrypted_key, "admin");

            // Direct REST call — avoids SDK routing issues with image generation
            const imageModel = IMAGE_MODELS[model] ?? IMAGE_MODELS.flash;
            const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${imageModel}:generateContent`;
            const apiRes = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-goog-api-key": apiKey,
                },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: `${prompt}. ${ASPECT_HINTS[aspectRatio] ?? ""}`.trim() }] }],
                    generationConfig: {
                        responseModalities: ["IMAGE"],
                    },
                }),
            });

            if (!apiRes.ok) {
                const errText = await apiRes.text();
                throw new Error(`Gemini API error (${apiRes.status}): ${errText}`);
            }

            const responseData = await apiRes.json();

            // Extract image from response
            const parts = responseData.candidates?.[0]?.content?.parts;
            if (!parts || parts.length === 0) {
                return NextResponse.json(
                    {
                        error: "No image was generated. The prompt may have been filtered by safety settings.",
                    },
                    { status: 400 }
                );
            }

            // Find the image part in the response
            let imageBase64: string | null = null;
            let mimeType = "image/png";

            for (const part of parts) {
                if (part.inlineData?.data) {
                    imageBase64 = part.inlineData.data;
                    mimeType = part.inlineData.mimeType || "image/png";
                    break;
                }
            }

            if (!imageBase64) {
                // Check if there's text response indicating an error
                const textPart = parts.find((p: { text?: string }) => p.text);
                if (textPart?.text) {
                    console.error("Image generation returned text instead of image:", textPart.text);
                }
                return NextResponse.json(
                    { error: "No image found in response. Please try a different prompt." },
                    { status: 400 }
                );
            }

            // Create data URL
            const imageDataUrl = `data:${mimeType};base64,${imageBase64}`;

            // Upload to R2 for persistent storage
            let r2Url = imageDataUrl; // Fallback to data URL
            let r2Key: string | null = null;

            try {
                const { uploadToR2, generateR2Filename } = await import("@/lib/r2-storage");
                let imageBuffer = Buffer.from(imageBase64, "base64");

                // Crop to the requested aspect ratio + scale to quality resolution in one Sharp pass.
                // fit:"cover" + position:"centre" → center-crops any model output to the exact ratio.
                const [rw, rh] = RATIO_UNITS[aspectRatio] ?? [1, 1];
                const maxPx = QUALITY_PX[quality] ?? 1024;
                const scale = maxPx / Math.max(rw, rh);
                const outW = Math.round(rw * scale);
                const outH = Math.round(rh * scale);

                const sharp = (await import("sharp")).default;
                const processed = await sharp(imageBuffer)
                    .resize(outW, outH, { fit: "cover", position: "centre" })
                    .png({ quality: 100 })
                    .toBuffer();
                imageBuffer = Buffer.from(processed);
                mimeType = "image/png";

                const filename = generateR2Filename("images", "png");
                const { url, key } = await uploadToR2(imageBuffer, filename, mimeType);
                r2Url = url;
                r2Key = key;
            } catch (r2Error) {
                console.error("R2 upload/processing failed, using data URL:", r2Error);
            }

            // Deduct credits after successful generation
            await deductCredits(user.id, requiredCredits, "image_generation", {
                prompt: prompt,
                model: model,
                quality: quality,
                aspectRatio: aspectRatio,
            });

            // Save to database for history
            try {
                await supabase.from("generated_images").insert({
                    user_id: user.id,
                    url: r2Url,
                    prompt: prompt,
                    model: model,
                    quality: quality,
                    aspect_ratio: aspectRatio,
                    r2_key: r2Key,
                });
            } catch (dbError) {
                console.error("Failed to save image to database:", dbError);
                // Continue anyway - don't fail the request
            }

            // Get updated balance
            const { balance: newBalance } = await checkCredits(user.id, 0);

            return NextResponse.json({
                success: true,
                imageUrl: r2Url,
                prompt: prompt,
                model: model,
                quality: quality,
                aspectRatio: aspectRatio,
                creditsUsed: requiredCredits,
                remainingBalance: newBalance,
            });
        } catch (error: unknown) {
            console.error("Image generation error:", error);

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
                { error: `Image generation failed: ${errorMessage}` },
                { status: 500 }
            );
        }
    });
}
