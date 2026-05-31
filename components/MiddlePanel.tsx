"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { categoryPresets } from "@/lib/categoryPresets";
import { Preset } from "@/lib/types";
import ScriptGenerator from "./ScriptGenerator";
import MotionControlTab from "./MotionControlTab";

type SubTab = "text-to-video" | "image-to-video" | "motion-control" | "script";

interface ScriptClip {
    id: string;
    prompt: string;
    duration: number;
}

interface MiddlePanelProps {
    //onPresetSelect: (preset: Preset) => void;
    onPromptChange: (prompt: string) => void;
    onGenerate: (aspectRatio: string, duration: number, resolution: "720p" | "1080p" | "4k") => void;
    onGenerateClip: (prompt: string, duration: number, aspectRatio: string, resolution: "720p" | "1080p" | "4k") => void;
    onMotionVideoGenerated: (videoUrl: string, prompt: string) => void;
    prompt: string;
    isGenerating: boolean;
    selectedModel: "veo" | "kling";
    onModelChange: (model: "veo" | "kling") => void;
    scriptClips: ScriptClip[];
    onScriptClipsChange: (clips: ScriptClip[]) => void;
    scriptIdea: string;
    onScriptIdeaChange: (idea: string) => void;
    csrfToken: string | null;
}

export default function MiddlePanel({
    //onPresetSelect,
    onPromptChange,
    onGenerate,
    onGenerateClip,
    onMotionVideoGenerated,
    prompt,
    isGenerating,
    selectedModel,
    onModelChange,
    scriptClips,
    onScriptClipsChange,
    scriptIdea,
    onScriptIdeaChange,
    csrfToken,
}: MiddlePanelProps) {
    const [activeTab, setActiveTab] = useState<SubTab>("text-to-video");
    const [showPresets, setShowPresets] = useState(false);
    const [aspectRatio, setAspectRatio] = useState("16:9");
    const [duration, setDuration] = useState(6);
    const [activePresetCategory, setActivePresetCategory] = useState(categoryPresets[0].category);
    const [resolution, setResolution] = useState<"720p" | "1080p" | "4k">("720p");

    const currentPresets = categoryPresets.find(c => c.category === activePresetCategory)?.presets || [];

    const handlePresetClick = (preset: Preset) => {
        if (activeTab === "text-to-video") {
            onPromptChange(preset.prompt);
            setShowPresets(false);
        } else if (activeTab === "script") {
            onScriptIdeaChange(preset.prompt);
        }
    };

    return (
        <div className="w-[370px] shrink-0 h-full bg-[#0A0A0A] border-r border-[#1A1A1A] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-[#1A1A1A]">
                <h1 className="text-sm font-bold text-white">AI Video Generator</h1>
            </div>

            {/* Sub-Tabs */}
            <div className="border-b border-[#1A1A1A]">
                <div className="flex divide-x divide-[#1A1A1A]">
                    {[
                        { id: "text-to-video", label: "Text" },
                        { id: "image-to-video", label: "Image" },
                        { id: "motion-control", label: "Motion" },
                        { id: "script", label: "Script" },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as SubTab)}
                            className={`flex-1 py-2.5 text-xs font-medium text-center whitespace-nowrap transition-colors ${activeTab === tab.id
                                ? "text-white border-b-2 border-green-500"
                                : "text-gray-500 hover:text-gray-300"
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto">
                <AnimatePresence mode="wait">
                    {/* Text to Video Tab */}
                    {activeTab === "text-to-video" && (
                        <motion.div
                            key="text-to-video"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="p-4 space-y-4"
                        >
                            <div>
                                <textarea
                                    value={prompt}
                                    onChange={(e) => onPromptChange(e.target.value)}
                                    placeholder="Describe your video..."
                                    className="dark-input w-full px-3 py-3 text-xs min-h-[100px] resize-none"
                                    disabled={isGenerating}
                                />
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-semibold text-gray-400 uppercase">Presets</span>
                                    <button onClick={() => setShowPresets(!showPresets)} className="text-[10px] text-green-400 hover:text-green-300">
                                        {showPresets ? "Hide" : "Show All"}
                                    </button>
                                </div>

                                <div className="flex flex-wrap gap-1.5 mb-2">
                                    {categoryPresets.map((cat) => (
                                        <button
                                            key={cat.category}
                                            onClick={() => setActivePresetCategory(cat.category)}
                                            className={`px-2 py-1 text-[10px] font-semibold rounded transition-all ${activePresetCategory === cat.category
                                                ? "bg-green-500 text-black"
                                                : "bg-[#1E1E1E] text-gray-400 hover:text-white"
                                                }`}
                                        >
                                            {cat.category}
                                        </button>
                                    ))}
                                </div>

                                <div className={`grid grid-cols-2 gap-1.5 ${showPresets ? "" : "max-h-[120px] overflow-hidden"}`}>
                                    {currentPresets.map((preset) => (
                                        <button
                                            key={preset.id}
                                            onClick={() => handlePresetClick(preset)}
                                            className="p-2 bg-[#1E1E1E] rounded text-left hover:bg-[#2A2A2A] transition-colors border border-transparent hover:border-green-500/30"
                                        >
                                            <span className="text-[10px] font-medium text-white block truncate">{preset.title}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* Image to Video Tab */}
                    {activeTab === "image-to-video" && (
                        <motion.div key="image-to-video" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-4 flex items-center justify-center h-full">
                            <div className="text-center">
                                <div className="w-16 h-16 bg-[#1E1E1E] rounded-full flex items-center justify-center mx-auto mb-3">
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-500">
                                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                        <circle cx="8.5" cy="8.5" r="1.5" />
                                        <polyline points="21 15 16 10 5 21" />
                                    </svg>
                                </div>
                                <p className="text-xs text-gray-500">Coming soon</p>
                            </div>
                        </motion.div>
                    )}

                    {/* Motion Control Tab */}
                    {activeTab === "motion-control" && (
                        <motion.div key="motion-control" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            <MotionControlTab
                                onVideoGenerated={onMotionVideoGenerated}
                                csrfToken={csrfToken}
                            />
                        </motion.div>
                    )}

                    {/* Script Tab */}
                    {activeTab === "script" && (
                        <motion.div key="script" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-4 space-y-4">
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-semibold text-gray-400 uppercase">Presets</span>
                                </div>

                                <div className="flex flex-wrap gap-1.5 mb-2">
                                    {categoryPresets.map((cat) => (
                                        <button
                                            key={cat.category}
                                            onClick={() => setActivePresetCategory(cat.category)}
                                            className={`px-2 py-1 text-[10px] font-semibold rounded transition-all ${activePresetCategory === cat.category
                                                ? "bg-green-500 text-black"
                                                : "bg-[#1E1E1E] text-gray-400 hover:text-white"
                                                }`}
                                        >
                                            {cat.category}
                                        </button>
                                    ))}
                                </div>

                                <div className="grid grid-cols-2 gap-1.5 max-h-[100px] overflow-y-auto">
                                    {currentPresets.map((preset) => (
                                        <button
                                            key={preset.id}
                                            onClick={() => handlePresetClick(preset)}
                                            className="p-2 bg-[#1E1E1E] rounded text-left hover:bg-[#2A2A2A] transition-colors border border-transparent hover:border-green-500/30"
                                        >
                                            <span className="text-[10px] font-medium text-white block truncate">{preset.title}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <ScriptGenerator
                                idea={scriptIdea}
                                onIdeaChange={onScriptIdeaChange}
                                clips={scriptClips}
                                onClipsChange={onScriptClipsChange}
                                onGenerateClip={(clipPrompt, clipDuration, clipResolution) => {
                                    onGenerateClip(clipPrompt, clipDuration, aspectRatio, clipResolution);
                                }}
                                csrfToken={csrfToken}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Bottom Controls - Only show for text-to-video */}
            {activeTab === "text-to-video" && (
                <div className="p-4 border-t border-[#1A1A1A] space-y-3">
                    <div className="flex items-center gap-2 text-xs">
                        <select
                            value={resolution}
                            onChange={(e) => {
                                const r = e.target.value as "720p" | "1080p" | "4k";
                                setResolution(r);
                                if (r === "1080p" || r === "4k") setDuration(8);
                            }}
                            className="flex-1 bg-[#1E1E1E] text-gray-300 px-2 py-1.5 rounded border border-[#2A2A2A] outline-none"
                        >
                            <option value="720p">720p</option>
                            <option value="1080p">1080p</option>
                            <option value="4k">4K</option>
                        </select>
                        <select
                            value={duration}
                            onChange={(e) => setDuration(Number(e.target.value))}
                            disabled={resolution === "1080p" || resolution === "4k"}
                            className="w-16 bg-[#1E1E1E] text-gray-300 px-2 py-1.5 rounded border border-[#2A2A2A] outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <option value={4}>4s</option>
                            <option value={6}>6s</option>
                            <option value={8}>8s</option>
                        </select>
                        <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)} className="w-20 bg-[#1E1E1E] text-gray-300 px-2 py-1.5 rounded border border-[#2A2A2A] outline-none">
                            <option value="16:9">16:9</option>
                            <option value="9:16">9:16</option>
                        </select>
                    </div>
                    {(resolution === "1080p" || resolution === "4k") && (
                        <p className="text-[10px] text-yellow-500/80">
                            ⚠️ {resolution === "4k" ? "4K" : "1080p"} requires 8s duration — locked automatically.
                        </p>
                    )}

                    <button
                        onClick={() => onGenerate(aspectRatio, duration, resolution)}
                        disabled={isGenerating || !prompt.trim()}
                        className={`w-full py-3 rounded-lg font-bold text-sm transition-all ${isGenerating
                            ? "bg-green-500/50 text-black/50"
                            : "bg-green-500 text-black hover:bg-green-400"
                            }`}
                    >
                        {isGenerating ? (
                            <span className="flex items-center justify-center gap-2">
                                <span className="animate-spin">⚙️</span>
                                Generating...
                            </span>
                        ) : (
                            <span className="flex items-center justify-center gap-2">🎬 Generate</span>
                        )}
                    </button>
                </div>
            )}
        </div>
    );
}
