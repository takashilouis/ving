import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export const maxDuration = 300; // 5 minutes timeout for video generation

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { apiKey, prompt, duration, aspectRatio = "16:9" } = body;

        if (!apiKey) {
            return NextResponse.json(
                { error: "API key is required" },
                { status: 400 }
            );
        }

        if (!prompt) {
            return NextResponse.json(
                { error: "Prompt is required" },
                { status: 400 }
            );
        }

        // Initialize the Google GenAI client with user's API key
        const ai = new GoogleGenAI({ apiKey });

        // Start video generation with veo-3.1-fast-generate-preview
        let operation = await ai.models.generateVideos({
            model: "veo-3.1-fast-generate-preview",
            prompt: prompt,
            config: {
                aspectRatio: aspectRatio, // Use the aspect ratio from request
                durationSeconds: duration || 6,
            },
        });

        // Poll the operation status until the video is ready
        const maxAttempts = 60; // 10 minutes max (10s * 60)
        let attempts = 0;

        while (!operation.done && attempts < maxAttempts) {
            await new Promise((resolve) => setTimeout(resolve, 10000)); // Wait 10 seconds
            operation = await ai.operations.getVideosOperation({
                operation: operation,
            });
            attempts++;
        }

        if (!operation.done) {
            return NextResponse.json(
                { error: "Video generation timed out. Please try again." },
                { status: 504 }
            );
        }

        // Check if we have generated videos
        if (
            !operation.response?.generatedVideos ||
            operation.response.generatedVideos.length === 0
        ) {
            return NextResponse.json(
                {
                    error:
                        "No video was generated. The prompt may have been filtered by safety settings.",
                },
                { status: 400 }
            );
        }

        const generatedVideo = operation.response.generatedVideos[0];

        // Get the video URI from the response
        const videoUri = generatedVideo.video?.uri;

        if (!videoUri) {
            return NextResponse.json(
                { error: "Video URL not found in response" },
                { status: 500 }
            );
        }

        // Download the video using the API key as authentication
        // The video URI requires the API key to be passed as a header
        const videoResponse = await fetch(videoUri, {
            headers: {
                "x-goog-api-key": apiKey,
            },
            redirect: "follow",
        });

        if (!videoResponse.ok) {
            console.error(
                "Failed to download video:",
                videoResponse.status,
                videoResponse.statusText
            );
            return NextResponse.json(
                { error: `Failed to download video: ${videoResponse.statusText}` },
                { status: 500 }
            );
        }

        // Get the video as an ArrayBuffer and convert to base64
        const videoArrayBuffer = await videoResponse.arrayBuffer();
        const videoBase64 = Buffer.from(videoArrayBuffer).toString("base64");

        // Return the video as a base64 data URL
        const videoDataUrl = `data:video/mp4;base64,${videoBase64}`;

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
            { error: `Video generation failed: ${errorMessage}` },
            { status: 500 }
        );
    }
}
