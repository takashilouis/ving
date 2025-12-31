"use client";

import { motion } from "framer-motion";

interface PromptInputProps {
    prompt: string;
    onPromptChange: (prompt: string) => void;
    onGenerate: () => void;
    isGenerating: boolean;
    hasApiKey: boolean;
}

export default function PromptInput({
    prompt,
    onPromptChange,
    onGenerate,
    isGenerating,
    hasApiKey,
}: PromptInputProps) {
    return (
        <div className="space-y-3">
            <label className="text-xs font-semibold text-gray-400 uppercase">
                ✍️ Prompt
            </label>
            <textarea
                value={prompt}
                onChange={(e) => onPromptChange(e.target.value)}
                placeholder="Create a beautiful Vietnamese girl wearing a traditional aodai. She is dancing a trendy Tiktok dance."
                className="dark-input w-full px-3 py-3 text-sm min-h-[120px] resize-none"
                disabled={isGenerating}
            />
            <motion.button
                whileTap={{ scale: isGenerating || !hasApiKey ? 1 : 0.95 }}
                onClick={onGenerate}
                disabled={isGenerating || !hasApiKey || !prompt.trim()}
                className={`btn-primary w-full py-3 text-sm font-bold ${isGenerating ? "loading-glow" : ""
                    }`}
            >
                {isGenerating ? (
                    <span className="flex items-center justify-center gap-2">
                        <span className="animate-spin">⚙️</span>
                        Generating...
                    </span>
                ) : !hasApiKey ? (
                    "🔑 Enter API Key"
                ) : (
                    `🎬 ${prompt.trim() ? "50" : "0"} Generate`
                )}
            </motion.button>
        </div>
    );
}
