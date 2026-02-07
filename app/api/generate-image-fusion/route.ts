import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Part } from "@google/genai";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkCredits, deductCredits, getFusionCreditCost } from "@/lib/credits";
import { decryptApiKey } from "@/lib/supabase/encryption";
import { withCsrfProtection } from "@/lib/csrf";
import { FusionQuality } from "@/lib/types";

export const maxDuration = 300; // 5 minutes timeout for fusion generation

// Model IDs for different quality levels - use image generation capable models
const MODEL_IDS = {
    standard: "gemini-2.5-flash-image",  // Flash for standard quality
    pro: "gemini-3-pro-image-preview",        // Pro for 4K quality
};

interface FusionImageInput {
    data: string;  // base64 data URL
}

export async function POST(request: NextRequest) {
    return withCsrfProtection(request, async (req) => {
        try {
            const body = await req.json();
            const {
                images,
                prompt = "",
                aspectRatio = "16:9",
                quality = "standard",
            } = body as {
                images: FusionImageInput[];
                prompt?: string;
                aspectRatio: string;
                quality: FusionQuality;
            };

            // Validate images
            if (!images || !Array.isArray(images) || images.length < 2) {
                return NextResponse.json(
                    { error: "At least 2 images are required for fusion" },
                    { status: 400 }
                );
            }

            if (images.length > 5) {
                return NextResponse.json(
                    { error: "Maximum 5 images allowed for fusion" },
                    { status: 400 }
                );
            }

            // Validate quality
            if (!["standard", "pro"].includes(quality)) {
                return NextResponse.json(
                    { error: "Invalid quality. Use 'standard' or 'pro'." },
                    { status: 400 }
                );
            }

            // Validate aspect ratio
            const validRatios = ["16:9", "9:16", "1:1", "3:4", "4:3"];
            if (!validRatios.includes(aspectRatio)) {
                return NextResponse.json(
                    { error: "Invalid aspect ratio" },
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

            // Calculate credit cost
            const requiredCredits = getFusionCreditCost(quality);
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
                .single();

            if (keyError || !keyData) {
                console.error("Failed to fetch admin API key:", keyError);
                return NextResponse.json(
                    { error: "Service temporarily unavailable. Please try again later." },
                    { status: 503 }
                );
            }

            // Decrypt the API key
            const apiKey = decryptApiKey(keyData.encrypted_key, "admin");

            // Initialize the Google GenAI client
            const ai = new GoogleGenAI({ apiKey });

            // Select model ID based on quality
            const modelId = MODEL_IDS[quality];

            // Build the multimodal content parts
            const contentParts: Part[] = [];

            // Add each image as inline data first
            for (const img of images) {
                // Extract base64 data from data URL
                const base64Match = img.data.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/);
                if (!base64Match) {
                    return NextResponse.json(
                        { error: "Invalid image format. Please use valid image files." },
                        { status: 400 }
                    );
                }

                const mimeType = `image/${base64Match[1]}`;
                const base64Data = base64Match[2];

                contentParts.push({
                    inlineData: {
                        mimeType,
                        data: base64Data,
                    },
                });
            }

            // Build the instruction text after images
            const systemPrompt = `Combine the above ${images.length} images into a single cohesive, professional image.

${prompt ? `Instructions: ${prompt}` : ""}

Create a natural, professional composition at ${aspectRatio} aspect ratio. Seamlessly blend all elements, maintaining quality and consistent lighting.`;

            contentParts.push({ text: systemPrompt });

            // Build imageConfig
            const imageConfig: { aspectRatio: string; imageSize?: string } = {
                aspectRatio: aspectRatio,
            };

            // Set 4K resolution for pro quality
            if (quality === "pro") {
                imageConfig.imageSize = "4K";
            }

            // Generate the fusion image
            const response = await ai.models.generateContent({
                model: modelId,
                contents: [{
                    role: "user",
                    parts: contentParts,
                }],
                config: {
                    responseModalities: ["IMAGE", "TEXT"],
                    imageConfig: imageConfig,
                },
            });

            // Extract image from response
            const parts = response.candidates?.[0]?.content?.parts;
            if (!parts || parts.length === 0) {
                return NextResponse.json(
                    {
                        error: "No image was generated. The content may have been filtered by safety settings.",
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
                const textPart = parts.find((p: { text?: string }) => p.text);
                if (textPart?.text) {
                    console.error("Fusion returned text instead of image:", textPart.text);
                }
                return NextResponse.json(
                    { error: "No image found in response. Please try different images or prompt." },
                    { status: 400 }
                );
            }

            // Create data URL
            const imageDataUrl = `data:${mimeType};base64,${imageBase64}`;

            // Deduct credits after successful generation
            await deductCredits(user.id, requiredCredits, "image_fusion", {
                sourceImageCount: images.length,
                quality: quality,
                aspectRatio: aspectRatio,
                prompt: prompt || null,
            });

            // Get updated balance
            const { balance: newBalance } = await checkCredits(user.id, 0);

            return NextResponse.json({
                success: true,
                imageUrl: imageDataUrl,
                prompt: prompt || `Fusion of ${images.length} images`,
                quality: quality,
                aspectRatio: aspectRatio,
                sourceImages: images.length,
                creditsUsed: requiredCredits,
                remainingBalance: newBalance,
            });
        } catch (error: unknown) {
            console.error("Fusion generation error:", error);

            const errorMessage =
                error instanceof Error ? error.message : "Unknown error occurred";

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
                        error: "Content was blocked by safety filters. Please modify your images or prompt.",
                    },
                    { status: 400 }
                );
            }

            return NextResponse.json(
                { error: `Fusion generation failed: ${errorMessage}` },
                { status: 500 }
            );
        }
    });
}
