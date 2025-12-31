"use client";

import { useState } from "react";
import { motion } from "framer-motion";

interface ScriptClip {
    id: string;
    prompt: string;
    duration: number;
}

interface ScriptGeneratorProps {
    apiKey: string;
}

// Format duration properly
const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}min ${secs}s` : `${mins}min`;
};

export default function ScriptGenerator({ apiKey }: ScriptGeneratorProps) {
    const [idea, setIdea] = useState("");
    const [videoLength, setVideoLength] = useState(30);
    const [clips, setClips] = useState<ScriptClip[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const videoLengths = [30, 40, 50, 60, 90];

    const generateScript = async () => {
        if (!idea.trim() || !apiKey) return;

        setIsGenerating(true);
        setError(null);

        try {
            const response = await fetch("/api/generate-script", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    apiKey,
                    idea: idea.trim(),
                    videoLength,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to generate script");
            }

            setClips(data.clips);
        } catch (err) {
            const errorMessage =
                err instanceof Error ? err.message : "An error occurred";
            setError(errorMessage);
        } finally {
            setIsGenerating(false);
        }
    };

    const removeClip = (id: string) => {
        setClips(clips.filter((clip) => clip.id !== id));
    };

    const updateClipPrompt = (id: string, newPrompt: string) => {
        setClips(
            clips.map((clip) =>
                clip.id === id ? { ...clip, prompt: newPrompt } : clip
            )
        );
    };

    return (
        <div className="space-y-3">
            <div>
                <label className="text-xs font-semibold text-gray-400 uppercase mb-2 block">
                    💡 Your Idea
                </label>
                <textarea
                    value={idea}
                    onChange={(e) => setIdea(e.target.value)}
                    placeholder="Describe your video idea... e.g., 'A day in the life of a coffee shop owner'"
                    className="dark-input w-full px-3 py-2 text-xs min-h-[80px] resize-none"
                    disabled={isGenerating}
                />
            </div>

            <div>
                <label className="text-xs font-semibold text-gray-400 uppercase mb-2 block">
                    ⏱️ Video Length
                </label>
                <div className="flex gap-2 flex-wrap">
                    {videoLengths.map((length) => (
                        <button
                            key={length}
                            onClick={() => setVideoLength(length)}
                            className={`toggle-btn px-3 py-1.5 text-xs font-bold ${videoLength === length ? "active" : ""
                                }`}
                        >
                            {formatDuration(length)}
                        </button>
                    ))}
                </div>
            </div>

            <button
                onClick={generateScript}
                disabled={isGenerating || !idea.trim() || !apiKey}
                className="btn-primary w-full py-2 text-xs font-bold"
            >
                {isGenerating ? (
                    <span className="flex items-center justify-center gap-2">
                        <span className="animate-spin">⚙️</span>
                        Generating Script...
                    </span>
                ) : (
                    "✨ Generate Script"
                )}
            </button>

            {error && (
                <div className="p-2 bg-red-950/30 border border-red-800/30 rounded text-xs text-red-400">
                    ⚠️ {error}
                </div>
            )}

            {clips.length > 0 && (
                <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between">
                        <h4 className="text-xs font-semibold text-gray-300">
                            📝 Generated Clips ({clips.length})
                        </h4>
                        <span className="text-[10px] text-gray-500">
                            Total: {formatDuration(
                                clips.reduce((acc, clip) => acc + clip.duration, 0)
                            )}
                        </span>
                    </div>

                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                        {clips.map((clip, index) => (
                            <motion.div
                                key={clip.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className="dark-card p-2"
                            >
                                <div className="flex items-start justify-between mb-1">
                                    <span className="text-[10px] font-bold text-green-400">
                                        Clip {index + 1}
                                    </span>
                                    <button
                                        onClick={() => removeClip(clip.id)}
                                        className="text-gray-500 hover:text-red-400 transition-colors"
                                    >
                                        <svg
                                            width="12"
                                            height="12"
                                            viewBox="0 0 12 12"
                                            fill="none"
                                            stroke="currentColor"
                                        >
                                            <path
                                                d="M2 2l8 8M10 2L2 10"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                            />
                                        </svg>
                                    </button>
                                </div>
                                <textarea
                                    value={clip.prompt}
                                    onChange={(e) => updateClipPrompt(clip.id, e.target.value)}
                                    className="dark-input w-full px-2 py-1.5 text-[10px] min-h-[50px] resize-none"
                                />
                                <div className="mt-1 flex items-center justify-between">
                                    <span className="text-[10px] text-gray-500">
                                        {formatDuration(clip.duration)}
                                    </span>
                                    <button className="text-[10px] font-medium text-green-400 hover:text-green-300">
                                        Generate →
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    <button className="btn-primary w-full py-2 text-xs font-bold">
                        🎬 Generate All Clips
                    </button>
                </div>
            )}

            {!apiKey && (
                <p className="text-[10px] text-red-400 mt-2">
                    ⚠️ Please enter your API key to use the script generator
                </p>
            )}
        </div>
    );
}
