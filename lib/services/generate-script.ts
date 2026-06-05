import { createAdminClient } from "@/lib/supabase/admin";
import { decryptApiKey } from "@/lib/supabase/encryption";

export interface GenerateScriptInput {
    idea: string;
    videoLength: number;
}

export interface ScriptClipOutput {
    id: string;
    prompt: string;
    duration: number;
}

export interface GenerateScriptResult {
    clips: ScriptClipOutput[];
}

export async function generateScriptService(input: GenerateScriptInput): Promise<GenerateScriptResult> {
    const { idea, videoLength } = input;

    const adminSupabase = createAdminClient();
    const { data: keyData, error: keyError } = await adminSupabase
        .from("admin_api_keys")
        .select("encrypted_key")
        .eq("key_type", "gemini")
        .eq("is_active", true)
        .single();

    if (keyError || !keyData) throw new Error("Service temporarily unavailable. Please try again later.");

    const apiKey = decryptApiKey(keyData.encrypted_key, "admin");

    const clipDuration = videoLength <= 50 ? 4 : 6;
    const numClips = Math.floor(videoLength / clipDuration);

    const response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
        {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
            body: JSON.stringify({
                contents: [{
                    parts: [{
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
                    }],
                }],
                generationConfig: { temperature: 0.7, maxOutputTokens: 8192 },
            }),
        }
    );

    if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error?.message || "Failed to generate script");
    }

    const data = await response.json();
    const generatedText: string = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (!generatedText) throw new Error("No content generated from AI.");

    // Parse JSON — handle markdown code blocks
    let jsonText = generatedText;
    if (jsonText.includes("```json")) {
        jsonText = jsonText.replace(/```json\s*/g, "").replace(/```\s*/g, "");
    } else if (jsonText.includes("```")) {
        jsonText = jsonText.replace(/```\s*/g, "");
    }
    const arrayMatch = jsonText.match(/\[[\s\S]*\]/);
    if (arrayMatch) jsonText = arrayMatch[0];

    let rawClips: { clipNumber?: number; prompt: string; duration?: number }[];
    try {
        rawClips = JSON.parse(jsonText);
        if (!Array.isArray(rawClips)) throw new Error("Response is not an array");
    } catch {
        throw new Error("Failed to parse AI-generated script. Please try again.");
    }

    const clips: ScriptClipOutput[] = rawClips.map((clip, index) => {
        if (!clip.prompt || typeof clip.prompt !== "string") {
            throw new Error(`Clip ${index + 1} missing valid prompt`);
        }
        return {
            id: `clip-${index + 1}`,
            prompt: clip.prompt.trim(),
            duration: clip.duration || clipDuration,
        };
    });

    return { clips };
}
