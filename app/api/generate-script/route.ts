import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptApiKey } from "@/lib/supabase/encryption";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { idea, videoLength } = body;

        if (!idea) {
            return NextResponse.json({ error: "Idea is required" }, { status: 400 });
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

        // Calculate clip duration based on video length

        let clipDuration: number;

        if (videoLength <= 50) {
            clipDuration = 4;
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

Break the script into ${numClips} clips.

For each clip, provide:
1. A detailed, cinematic prompt suitable for AI video generation
2. Include specific camera movements, lighting, and visual details
3. Make each clip flow naturally into the next

Format your response as a JSON array with this structure:
[
  {
    "clipNumber": 1,
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
                        maxOutputTokens: 8192,
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
            let jsonText = generatedText;

            // Remove markdown code blocks
            if (jsonText.includes("```json")) {
                jsonText = jsonText.replace(/```json\s*/g, "").replace(/```\s*/g, "");
            } else if (jsonText.includes("```")) {
                jsonText = jsonText.replace(/```\s*/g, "");
            }

            // Try to find JSON array
            const arrayMatch = jsonText.match(/\[[\s\S]*\]/);
            if (arrayMatch) {
                jsonText = arrayMatch[0];
            }

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
