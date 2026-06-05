import { GoogleGenAI } from "@google/genai";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptApiKey } from "@/lib/supabase/encryption";
import { uploadToR2, generateR2Filename } from "@/lib/r2-storage";

export interface ExtendVideoInput {
    googleVideoUri: string;
    prompt?: string;
}

export interface ExtendVideoResult {
    videoUrl: string;
    googleVideoUri: string;
}

export async function extendVideoService(input: ExtendVideoInput): Promise<ExtendVideoResult> {
    const { googleVideoUri, prompt } = input;

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
            video: { uri: googleVideoUri },
            config: { numberOfVideos: 1, resolution: "720p" },
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

    const videoResponse = await fetch(newVideoUri, { headers: { "x-goog-api-key": apiKey } });
    if (!videoResponse.ok) throw new Error(`Failed to download extended video: ${videoResponse.statusText}`);

    const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());

    try {
        const filename = generateR2Filename("videos", "mp4");
        const { url } = await uploadToR2(videoBuffer, filename, "video/mp4");
        return { videoUrl: url, googleVideoUri: newVideoUri };
    } catch {
        return {
            videoUrl: `data:video/mp4;base64,${videoBuffer.toString("base64")}`,
            googleVideoUri: newVideoUri,
        };
    }
}
