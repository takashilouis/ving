import { GoogleGenAI } from "@google/genai";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptApiKey } from "@/lib/supabase/encryption";
import { uploadToR2, generateR2Filename } from "@/lib/r2-storage";
import { ImageModel, ImageQuality } from "@/lib/types";

const MODEL_IDS = {
    flash: "gemini-2.5-flash-image",
    pro: "gemini-3-pro-image-preview",
};

export interface GenerateImageInput {
    prompt: string;
    model?: ImageModel;
    quality?: ImageQuality;
    aspectRatio?: string;
    referenceImageBase64?: string;
    referenceImageMimeType?: string;
}

export interface GenerateImageResult {
    imageUrl: string;
    mimeType: string;
}

export async function generateImageService(input: GenerateImageInput): Promise<GenerateImageResult> {
    const {
        prompt,
        model = "pro",
        quality = "1K",
        aspectRatio = "16:9",
        referenceImageBase64,
        referenceImageMimeType = "image/png",
    } = input;

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
    const modelId = MODEL_IDS[model];

    const imageConfig: { aspectRatio: string; imageSize?: string } = { aspectRatio };
    if (model === "pro" && (quality === "2K" || quality === "4K")) {
        imageConfig.imageSize = quality;
    }

    // Build contents — optionally include a reference image
    type ContentPart = { text: string } | { inlineData: { mimeType: string; data: string } };
    const parts: ContentPart[] = [];
    if (referenceImageBase64) {
        const rawBase64 = referenceImageBase64.replace(/^data:image\/\w+;base64,/, "");
        parts.push({ inlineData: { mimeType: referenceImageMimeType, data: rawBase64 } });
    }
    parts.push({ text: prompt });

    const contents = referenceImageBase64
        ? [{ role: "user" as const, parts }]
        : prompt;

    const response = await ai.models.generateContent({
        model: modelId,
        contents,
        config: {
            responseModalities: ["TEXT", "IMAGE"],
            imageConfig,
        },
    });

    const responseParts = response.candidates?.[0]?.content?.parts;
    if (!responseParts?.length) {
        throw new Error("No image was generated. The prompt may have been filtered by safety settings.");
    }

    let imageBase64: string | null = null;
    let mimeType = "image/png";
    for (const part of responseParts) {
        if (part.inlineData?.data) {
            imageBase64 = part.inlineData.data;
            mimeType = part.inlineData.mimeType || "image/png";
            break;
        }
    }

    if (!imageBase64) {
        throw new Error("No image found in response. Please try a different prompt.");
    }

    // Upload to R2; fall back to data URL on failure
    try {
        const imageBuffer = Buffer.from(imageBase64, "base64");
        const extension = mimeType === "image/jpeg" ? "jpg" : "png";
        const filename = generateR2Filename("images", extension);
        const { url } = await uploadToR2(imageBuffer, filename, mimeType);
        return { imageUrl: url, mimeType };
    } catch {
        return { imageUrl: `data:${mimeType};base64,${imageBase64}`, mimeType };
    }
}
