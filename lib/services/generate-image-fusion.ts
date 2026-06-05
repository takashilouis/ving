import { GoogleGenAI, Part } from "@google/genai";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptApiKey } from "@/lib/supabase/encryption";
import { uploadToR2, generateR2Filename } from "@/lib/r2-storage";
import { FusionQuality } from "@/lib/types";

const MODEL_IDS = {
    standard: "gemini-2.5-flash-image",
    pro: "gemini-3-pro-image-preview",
};

export interface GenerateImageFusionInput {
    images: { data: string }[];  // base64 data URLs
    prompt?: string;
    aspectRatio?: string;
    quality?: FusionQuality;
}

export interface GenerateImageFusionResult {
    imageUrl: string;
    mimeType: string;
}

export async function generateImageFusionService(input: GenerateImageFusionInput): Promise<GenerateImageFusionResult> {
    const { images, prompt = "", aspectRatio = "16:9", quality = "standard" } = input;

    const adminSupabase = createAdminClient();
    const { data: keyData, error: keyError } = await adminSupabase
        .from("admin_api_keys")
        .select("encrypted_key")
        .eq("key_type", "gemini")
        .eq("is_active", true)
        .maybeSingle();

    if (keyError) throw new Error("Service temporarily unavailable. Please try again later.");
    if (!keyData) throw new Error("Gemini API key is not configured. Please ask an admin to configure it in Settings.");

    const apiKey = decryptApiKey(keyData.encrypted_key, "admin");
    const ai = new GoogleGenAI({ apiKey });
    const modelId = MODEL_IDS[quality];

    const contentParts: Part[] = [];

    for (const img of images) {
        const base64Match = img.data.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/);
        if (!base64Match) throw new Error("Invalid image format. Please use valid image files.");
        contentParts.push({
            inlineData: { mimeType: `image/${base64Match[1]}`, data: base64Match[2] },
        });
    }

    contentParts.push({
        text: `Combine the above ${images.length} images into a single cohesive, professional image.\n\n${prompt ? `Instructions: ${prompt}\n\n` : ""}Create a natural, professional composition at ${aspectRatio} aspect ratio. Seamlessly blend all elements, maintaining quality and consistent lighting.`,
    });

    const imageConfig: { aspectRatio: string; imageSize?: string } = { aspectRatio };
    if (quality === "pro") imageConfig.imageSize = "4K";

    const response = await ai.models.generateContent({
        model: modelId,
        contents: [{ role: "user", parts: contentParts }],
        config: { responseModalities: ["IMAGE", "TEXT"], imageConfig },
    });

    const parts = response.candidates?.[0]?.content?.parts;
    if (!parts?.length) {
        throw new Error("No image was generated. The content may have been filtered by safety settings.");
    }

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
        throw new Error("No image found in fusion response. Please try different images or prompt.");
    }

    try {
        const imageBuffer = Buffer.from(imageBase64, "base64");
        const extension = mimeType === "image/jpeg" ? "jpg" : "png";
        const filename = generateR2Filename("fusion", extension);
        const { url } = await uploadToR2(imageBuffer, filename, mimeType);
        return { imageUrl: url, mimeType };
    } catch {
        return { imageUrl: `data:${mimeType};base64,${imageBase64}`, mimeType };
    }
}
