import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { apiKey, idea, videoLength } = body;

        if (!apiKey) {
            return NextResponse.json(
                { error: "API key is required" },
                { status: 400 }
            );
        }

        if (!idea) {
            return NextResponse.json({ error: "Idea is required" }, { status: 400 });
        }

        // Calculate clip duration based on video length
        // 30s = 5s clips, 40s = 5s clips, 50s = 5s clips, 60s = 6s clips, 90s = 6s clips
        let clipDuration: number;
        if (videoLength <= 50) {
            clipDuration = 5;
        } else {
            clipDuration = 6;
        }

        const numClips = Math.floor(videoLength / clipDuration);

        // Call Gemini API to generate script - FIXED MODEL NAME
        const response = await fetch(
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-goog-api-key": apiKey,
                },
                body: JSON.stringify({
                    contents: [
                        {
                            parts: [
                                {
                                    text: `You are a professional video script writer. Generate a detailed ${videoLength}-second video script for the following idea: "${idea}"

Break the script into ${numClips} clips, each exactly ${clipDuration} seconds long.

For each clip, provide:
1. A detailed, cinematic prompt suitable for AI video generation
2. Include specific camera movements, lighting, and visual details
3. Make each clip flow naturally into the next

Format your response as a JSON array with this structure:
[
  {
    "clipNumber": 1,
    "duration": ${clipDuration},
    "prompt": "Detailed cinematic prompt for clip 1..."
  },
  ...
]

Return ONLY the JSON array, no other text.`,
                                },
                            ],
                        },
                    ],
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 2048,
                    },
                }),
            }
        );

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(
                errorData.error?.message || "Failed to generate script"
            );
        }

        const data = await response.json();
        const generatedText =
            data.candidates?.[0]?.content?.parts?.[0]?.text || "";

        if (!generatedText) {
            throw new Error("No content generated from AI");
        }

        // Parse the JSON response
        let clips;
        try {
            // Extract JSON from markdown code blocks if present
            const jsonMatch = generatedText.match(/```json\n([\s\S]*?)\n```/) ||
                generatedText.match(/\[[\s\S]*\]/);
            const jsonText = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : generatedText;
            clips = JSON.parse(jsonText);

            // Validate that we got an array
            if (!Array.isArray(clips)) {
                throw new Error("Response is not an array");
            }

            // Validate each clip has required fields
            clips = clips.map((clip: any, index: number) => {
                if (!clip.prompt || typeof clip.prompt !== 'string') {
                    throw new Error(`Clip ${index + 1} missing valid prompt`);
                }
                return {
                    clipNumber: clip.clipNumber || index + 1,
                    duration: clip.duration || clipDuration,
                    prompt: clip.prompt.trim()
                };
            });

        } catch (parseError) {
            console.error("Failed to parse AI response:", parseError);
            console.error("Raw response:", generatedText);
            throw new Error("Failed to parse AI-generated script. Please try again.");
        }

        return NextResponse.json({
            success: true,
            clips: clips.map((clip: any, index: number) => ({
                id: `clip-${index + 1}`,
                prompt: clip.prompt,
                duration: clip.duration,
            })),
        });
    } catch (error: unknown) {
        console.error("Script generation error:", error);

        const errorMessage =
            error instanceof Error ? error.message : "Unknown error occurred";

        if (errorMessage.includes("API key") || errorMessage.includes("API_KEY")) {
            return NextResponse.json(
                { error: "Invalid API key. Please check your Gemini API key." },
                { status: 401 }
            );
        }

        return NextResponse.json(
            { error: `Script generation failed: ${errorMessage}` },
            { status: 500 }
        );
    }
}
