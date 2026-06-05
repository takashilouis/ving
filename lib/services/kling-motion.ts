import * as jose from "jose";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptApiKey } from "@/lib/supabase/encryption";
import { downloadFile, uploadToR2, generateR2Filename } from "@/lib/r2-storage";

export interface KlingMotionInput {
    imageBase64: string;
    videoUrl: string;
    orientation: "image" | "video";
    prompt?: string;
}

export interface KlingMotionResult {
    videoUrl: string;
    duration: number;
    taskId: string;
}

async function generateKlingJWT(accessKey: string, secretKey: string): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const secret = new TextEncoder().encode(secretKey);
    return new jose.SignJWT({})
        .setProtectedHeader({ alg: "HS256", typ: "JWT" })
        .setIssuer(accessKey)
        .setExpirationTime(now + 1800)
        .setNotBefore(now - 5)
        .setIssuedAt(now)
        .sign(secret);
}

export async function klingMotionService(input: KlingMotionInput): Promise<KlingMotionResult> {
    const { imageBase64, videoUrl, orientation, prompt } = input;

    const adminSupabase = createAdminClient();
    const [{ data: accessKeyData, error: accessKeyError }, { data: secretKeyData, error: secretKeyError }] =
        await Promise.all([
            adminSupabase.from("admin_api_keys").select("encrypted_key").eq("key_type", "kling_access").eq("is_active", true).maybeSingle(),
            adminSupabase.from("admin_api_keys").select("encrypted_key").eq("key_type", "kling_secret").eq("is_active", true).maybeSingle(),
        ]);

    if (accessKeyError || secretKeyError) throw new Error("Service temporarily unavailable. Please try again later.");
    if (!accessKeyData || !secretKeyData) throw new Error("Kling API keys are not configured. Please ask an admin to configure them in Settings.");

    const accessKey = decryptApiKey(accessKeyData.encrypted_key, "admin");
    const secretKey = decryptApiKey(secretKeyData.encrypted_key, "admin");

    // Strip data URL prefix before sending to Kling
    const imageData = imageBase64.replace(/^data:image\/\w+;base64,/, "");

    const jwtToken = await generateKlingJWT(accessKey, secretKey);
    const createResponse = await fetch("https://api.klingai.com/v1/videos/motion-control", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwtToken}` },
        body: JSON.stringify({
            image_url: imageData,
            video_url: videoUrl,
            character_orientation: orientation,
            prompt: prompt || undefined,
            mode: "pro",
            keep_original_sound: "yes",
        }),
    });

    const createData = await createResponse.json();
    if (createData.code !== 0) {
        throw new Error(createData.message || `Kling API error code: ${createData.code}`);
    }

    const taskId: string = createData.data?.task_id;
    if (!taskId) throw new Error("No task ID returned from Kling API.");

    // Poll for completion — max 30 min
    const maxAttempts = 360;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        await new Promise((r) => setTimeout(r, 5000));

        const pollJwt = await generateKlingJWT(accessKey, secretKey);
        const statusResponse = await fetch(`https://api.klingai.com/v1/videos/motion-control/${taskId}`, {
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${pollJwt}` },
        });

        if (!statusResponse.ok) continue;

        const statusData = await statusResponse.json();
        const task = statusData.data;

        if (task?.task_status === "succeed") {
            const videoResult = task.task_result?.videos?.[0];
            if (!videoResult?.url) throw new Error("Kling succeeded but returned no video URL.");

            const duration = parseFloat(videoResult.duration) || 5;

            // Download from Kling R2 and re-upload to our R2 for persistence
            try {
                const { buffer, contentType } = await downloadFile(videoResult.url);
                const filename = generateR2Filename("kling", "mp4");
                const { url } = await uploadToR2(buffer, filename, contentType);
                return { videoUrl: url, duration, taskId };
            } catch {
                return { videoUrl: videoResult.url, duration, taskId };
            }
        }

        if (task?.task_status === "failed") {
            throw new Error(task.task_status_msg || "Motion control generation failed.");
        }
    }

    throw new Error("Video generation timed out after 30 minutes.");
}
