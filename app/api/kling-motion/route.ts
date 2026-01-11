import { NextRequest, NextResponse } from "next/server";
import * as jose from 'jose';

export const maxDuration = 900; // 15 minutes

// Generate JWT token for Kling API authentication
async function generateKlingJWT(accessKey: string, secretKey: string): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const exp = now + 1800; // 30 minutes
    const nbf = now - 5; // 5 seconds buffer

    const secret = new TextEncoder().encode(secretKey);
    const jwt = await new jose.SignJWT({})
        .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
        .setIssuer(accessKey)
        .setExpirationTime(exp)
        .setNotBefore(nbf)
        .setIssuedAt(now)
        .sign(secret);

    return jwt;
}

export async function POST(request: NextRequest) {
    try {
        const { accessKey, secretKey, imageBase64, videoUrl, orientation, prompt } = await request.json();

        if (!accessKey || !secretKey) {
            return NextResponse.json({
                error: "Kling API requires both Access Key and Secret Key"
            }, { status: 400 });
        }

        if (!imageBase64) {
            return NextResponse.json({ error: "Reference image is required" }, { status: 400 });
        }

        if (!videoUrl) {
            return NextResponse.json({ error: "Reference video URL is required" }, { status: 400 });
        }

        if (!orientation) {
            return NextResponse.json({ error: "Character orientation is required" }, { status: 400 });
        }

        // Extract base64 data without the prefix (as per Kling docs)
        const imageData = imageBase64.replace(/^data:image\/\w+;base64,/, '');

        // Generate JWT token for Kling API
        const jwtToken = await generateKlingJWT(accessKey, secretKey);

        // Kling API - Motion Control
        const createResponse = await fetch("https://api.klingai.com/v1/videos/motion-control", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${jwtToken}`,
            },
            body: JSON.stringify({
                image_url: imageData, // Base64 without prefix
                video_url: videoUrl,  // Must be a URL
                character_orientation: orientation, // "image" or "video"
                prompt: prompt || undefined,
                mode: "pro",
                keep_original_sound: "yes",
            }),
        });

        const createData = await createResponse.json();

        // Debug logging
        console.log("=== Kling Motion Control Create Response ===");
        console.log("Response code:", createData.code);
        console.log("Task ID:", createData.data?.task_id);
        console.log("Full response:", JSON.stringify(createData, null, 2));

        if (createData.code !== 0) {
            console.error("Kling API error:", createData);
            return NextResponse.json(
                { error: createData.message || `Kling API error code: ${createData.code}` },
                { status: 400 }
            );
        }

        const taskId = createData.data?.task_id;
        if (!taskId) {
            return NextResponse.json({ error: "No task ID returned" }, { status: 500 });
        }

        // Poll for completion
        const maxAttempts = 360; // 30 minutes max
        let attempts = 0;

        while (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds

            try {
                // Generate fresh JWT for each request
                const pollJwtToken = await generateKlingJWT(accessKey, secretKey);

                const statusResponse = await fetch(`https://api.klingai.com/v1/videos/motion-control/${taskId}`, {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${pollJwtToken}`,
                    },
                });

                if (!statusResponse.ok) {
                    console.error(`Kling polling failed: ${statusResponse.status} ${statusResponse.statusText}`);
                    attempts++;
                    continue;
                }

                const statusData = await statusResponse.json();

                // Debug logging for polling
                console.log(`=== Kling Poll Attempt ${attempts + 1} ===`);
                console.log("Task details:", JSON.stringify(statusData.data, null, 2));

                if (statusData.code !== 0) {
                    console.error("Kling status error:", statusData);
                    // If 404/task not found, maybe we should break? But let's verify logs first.
                    // break; 
                }

                const task = statusData.data;

                if (task?.task_status === "succeed") {
                    const videoResult = task.task_result?.videos?.[0];

                    console.log("=== Kling Motion Control SUCCESS ===");
                    console.log("Video URL:", videoResult?.url);

                    if (videoResult?.url) {
                        return NextResponse.json({
                            videoUrl: videoResult.url,
                            prompt: prompt || "Motion Control Video",
                            duration: parseFloat(videoResult.duration) || 5,
                            taskId,
                            videoId: videoResult.id,
                        });
                    }
                    // If success but no URL, log it but maybe continue or fail?
                    console.error("Success status but no video URL found in result.");
                }

                if (task?.task_status === "failed") {
                    console.error("=== Kling Motion Control FAILED ===");
                    console.error("Failure reason:", task.task_status_msg);
                    return NextResponse.json(
                        { error: task.task_status_msg || "Motion control generation failed" },
                        { status: 500 }
                    );
                }
            } catch (pollError) {
                console.error("Error during polling (retrying):", pollError);
            }

            attempts++;
        }

        return NextResponse.json({ error: "Video generation timed out" }, { status: 408 });
    } catch (error) {
        console.error("Kling motion control error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Internal server error" },
            { status: 500 }
        );
    }
}
