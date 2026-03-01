import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkCredits, deductCredits, getImageCreditCost } from "@/lib/credits";
import { decryptApiKey } from "@/lib/supabase/encryption";
import { withCsrfProtection } from "@/lib/csrf";
import { ImageModel, ImageQuality } from "@/lib/types";

export const maxDuration = 300; // 5 minutes timeout for image generation

// Model IDs for different Gemini models
const MODEL_IDS = {
    flash: "gemini-2.5-flash-image",
    pro: "gemini-3-pro-image-preview",
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

            // Flash only supports 1K
            if (model === "flash" && quality !== "1K") {
                return NextResponse.json(
                    { error: "Gemini 2.5 Flash only supports 1K quality." },
                    { status: 400 }
                );
            }

            // 4K only for Pro
            if (quality === "4K" && model !== "pro") {
                return NextResponse.json(
                    { error: "4K quality is only available for Gemini 3.0 Pro." },
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

            // Initialize the Google GenAI client
            const ai = new GoogleGenAI({ apiKey });

            // Select model ID based on model type
            const modelId = MODEL_IDS[model];

            // Build imageConfig with actual API parameters
            const imageConfig: { aspectRatio: string; imageSize?: string } = {
                aspectRatio: aspectRatio,
            };

            // Only Pro model supports imageSize for 2K/4K
            if (model === "pro" && (quality === "2K" || quality === "4K")) {
                imageConfig.imageSize = quality;
            }

            // Generate image using the appropriate model with proper config
            const response = await ai.models.generateContent({
                model: modelId,
                contents: prompt,
                config: {
                    responseModalities: ["TEXT", "IMAGE"],
                    imageConfig: imageConfig,
                },
            });

            // Extract image from response
            const parts = response.candidates?.[0]?.content?.parts;
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
                const imageBuffer = Buffer.from(imageBase64, "base64");
                const extension = mimeType === "image/jpeg" ? "jpg" : "png";
                const filename = generateR2Filename("images", extension);

                const { url, key } = await uploadToR2(imageBuffer, filename, mimeType);
                r2Url = url;
                r2Key = key;
            } catch (r2Error) {
                console.error("R2 upload failed, using data URL:", r2Error);
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
