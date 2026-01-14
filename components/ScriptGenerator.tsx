"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { withCsrfToken } from "@/lib/useCsrfToken";

interface ScriptClip {
    id: string;
    prompt: string;
    duration: number;
}

interface ScriptGeneratorProps {
    idea: string;
    onIdeaChange: (idea: string) => void;
    clips: ScriptClip[];
    onClipsChange: (clips: ScriptClip[]) => void;
    onGenerateClip: (prompt: string, duration: number) => void;
    csrfToken: string | null;
}

// Format duration properly
const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}min ${secs}s` : `${mins}min`;
};

export default function ScriptGenerator({
    idea,
    onIdeaChange,
    clips,
    onClipsChange,
    onGenerateClip,
    csrfToken
}: ScriptGeneratorProps) {
    const [videoLength, setVideoLength] = useState(30);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [generatingClipId, setGeneratingClipId] = useState<string | null>(null);

    const videoLengths = [30, 40, 50, 60, 90];

    const generateScript = async () => {
        if (!idea.trim()) return;

        setIsGenerating(true);
        setError(null);

        try {
            const response = await fetch("/api/generate-script", withCsrfToken(csrfToken, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    idea: idea.trim(),
                    videoLength,
                }),
            }));

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to generate script");
            }

            onClipsChange(data.clips);
        } catch (err) {
            const errorMessage =
                err instanceof Error ? err.message : "An error occurred";
            setError(errorMessage);
        } finally {
            setIsGenerating(false);
        }
    };

    const removeClip = (id: string) => {
        onClipsChange(clips.filter((clip) => clip.id !== id));
    };

    const updateClipPrompt = (id: string, newPrompt: string) => {
        onClipsChange(
            clips.map((clip) =>
                clip.id === id ? { ...clip, prompt: newPrompt } : clip
            )
        );
    };

    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
        } catch (err) {
            console.error("Failed to copy:", err);
        }
    };

    const handleGenerateClip = (clip: ScriptClip) => {
        setGeneratingClipId(clip.id);
        onGenerateClip(clip.prompt, clip.duration);
        // Reset after a delay (video generation will handle actual state)
        setTimeout(() => setGeneratingClipId(null), 2000);
    };

    const handleGenerateAll = () => {
        if (clips.length > 0) {
            handleGenerateClip(clips[0]);
        }
    };

    return (
        <div className="space-y-3">
            <div>
                <label className="text-xs font-semibold text-gray-400 uppercase mb-2 block">
                    💡 Your Idea
                </label>
                <textarea
                    value={idea}
                    onChange={(e) => onIdeaChange(e.target.value)}
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
                disabled={isGenerating || !idea.trim()}
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
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => copyToClipboard(clip.prompt)}
                                            className="p-1 text-gray-500 hover:text-green-400 transition-colors"
                                            title="Copy to clipboard"
                                        >
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={() => removeClip(clip.id)}
                                            className="p-1 text-gray-500 hover:text-red-400 transition-colors"
                                            title="Remove clip"
                                        >
                                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M2 2l8 8M10 2L2 10" strokeLinecap="round" />
                                            </svg>
                                        </button>
                                    </div>
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
                                    <button
                                        onClick={() => handleGenerateClip(clip)}
                                        disabled={generatingClipId === clip.id}
                                        className={`text-[10px] font-bold px-3 py-1 rounded transition-all ${generatingClipId === clip.id
                                                ? "bg-green-500/50 text-black/50"
                                                : "bg-green-500 text-black hover:bg-green-400"
                                            }`}
                                    >
                                        {generatingClipId === clip.id ? "Generating..." : "Generate →"}
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    <button
                        onClick={handleGenerateAll}
                        className="btn-primary w-full py-2 text-xs font-bold"
                    >
                        🎬 Generate First Clip
                    </button>
                </div>
            )}
        </div>
    );
}
