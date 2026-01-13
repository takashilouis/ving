import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export const maxDuration = 300; // 5 minutes timeout

/**
 * TEMPORARY TESTING ROUTE
 * Uses GEMINI_API_KEY from .env for quick testing
 * No authentication, no credit checking
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { prompt, duration = 6, aspectRatio = "16:9" } = body;

        if (!prompt) {
            return NextResponse.json(
                { error: "Prompt is required" },
                { status: 400 }
            );
        }

        // Get API key from environment variable
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return NextResponse.json(
                { error: "GEMINI_API_KEY not set in .env file" },
                { status: 500 }
            );
        }

        console.log("🧪 Testing Gemini API...");

        // Initialize the Google GenAI client
        const ai = new GoogleGenAI({ apiKey });

        // Start video generation
        let operation = await ai.models.generateVideos({
            model: "veo-3.1-fast-generate-preview",
            prompt: prompt,
            config: {
                aspectRatio: aspectRatio,
                durationSeconds: duration,
            },
        });

        // Poll the operation status
        const maxAttempts = 60;
        let attempts = 0;

        while (!operation.done && attempts < maxAttempts) {
            await new Promise((resolve) => setTimeout(resolve, 10000));
            operation = await ai.operations.getVideosOperation({
                operation: operation,
            });
            attempts++;
            console.log(`⏳ Polling attempt ${attempts}/${maxAttempts}...`);
        }

        if (!operation.done) {
            return NextResponse.json(
                { error: "Video generation timed out" },
                { status: 504 }
            );
        }

        if (
            !operation.response?.generatedVideos ||
            operation.response.generatedVideos.length === 0
        ) {
            return NextResponse.json(
                { error: "No video was generated" },
                { status: 400 }
            );
        }

        const generatedVideo = operation.response.generatedVideos[0];
        const videoUri = generatedVideo.video?.uri;

        if (!videoUri) {
            return NextResponse.json(
                { error: "Video URL not found in response" },
                { status: 500 }
            );
        }

        // Download the video
        const videoResponse = await fetch(videoUri, {
            headers: {
                "x-goog-api-key": apiKey,
            },
            redirect: "follow",
        });

        if (!videoResponse.ok) {
            return NextResponse.json(
                { error: `Failed to download video: ${videoResponse.statusText}` },
                { status: 500 }
            );
        }

        // Convert to base64
        const videoArrayBuffer = await videoResponse.arrayBuffer();
        const videoBase64 = Buffer.from(videoArrayBuffer).toString("base64");
        const videoDataUrl = `data:video/mp4;base64,${videoBase64}`;

        console.log("✅ Video generated successfully!");

        return NextResponse.json({
            success: true,
            videoUrl: videoDataUrl,
            prompt: prompt,
            duration: duration,
        });
    } catch (error: unknown) {
        console.error("Video generation error:", error);

        const errorMessage =
            error instanceof Error ? error.message : "Unknown error occurred";

        return NextResponse.json(
            { error: `Video generation failed: ${errorMessage}` },
            { status: 500 }
        );
    }
}
