import { GoogleGenAI } from "@google/genai";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptApiKey } from "@/lib/supabase/encryption";
import { uploadToR2, generateR2Filename } from "@/lib/r2-storage";

export interface GenerateVideoInput {
    prompt?: string;
    duration?: number;
    aspectRatio?: string;
    resolution?: string;
    imageBase64?: string;
    imageMimeType?: string;
}

export interface GenerateVideoResult {
    videoUrl: string;
    googleVideoUri: string;
}

export async function generateVideoService(input: GenerateVideoInput): Promise<GenerateVideoResult> {
    const {
        prompt,
        aspectRatio = "16:9",
        resolution = "720p",
        imageBase64,
        imageMimeType,
    } = input;

    // 1080p/4K require exactly 8s per Gemini API constraints
    const duration = (resolution === "1080p" || resolution === "4k") ? 8 : (input.duration ?? 6);

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

    const videoResponse = await fetch(videoUri, { headers: { "x-goog-api-key": apiKey } });
    if (!videoResponse.ok) throw new Error(`Failed to download video: ${videoResponse.statusText}`);

    const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());

    try {
        const filename = generateR2Filename("videos", "mp4");
        const { url } = await uploadToR2(videoBuffer, filename, "video/mp4");
        return { videoUrl: url, googleVideoUri: videoUri };
    } catch {
        return {
            videoUrl: `data:video/mp4;base64,${videoBuffer.toString("base64")}`,
            googleVideoUri: videoUri,
        };
    }
}
