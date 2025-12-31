"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import PresetCard from "@/components/PresetCard";
import ScriptGenerator from "@/components/ScriptGenerator";
import { presets, Preset } from "@/lib/presets";

type Tab = "text-to-video" | "image-to-video" | "motion-control" | "elements";

interface MiddlePanelProps {
    apiKey: string;
    onPresetSelect: (preset: Preset) => void;
    onPromptChange: (prompt: string) => void;
    onGenerate: (aspectRatio: string) => void;
    prompt: string;
    isGenerating: boolean;
}

export default function MiddlePanel({
    apiKey,
    onPresetSelect,
    onPromptChange,
    onGenerate,
    prompt,
    isGenerating,
}: MiddlePanelProps) {
    const [activeTab, setActiveTab] = useState<Tab>("text-to-video");
    const [showPresets, setShowPresets] = useState(false);
    const [showScript, setShowScript] = useState(false);
    const [aspectRatio, setAspectRatio] = useState("16:9");

    return (
        <div className="w-[370px] bg-[#0A0A0A] border-r border-[#1A1A1A] flex flex-col">
            {/* Header */}
            <div className="px-4 py-3 border-b border-[#1A1A1A] flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <h1 className="text-base font-semibold text-white">AI Video Generator</h1>
                    <span className="text-[10px] bg-[#1E1E1E] text-gray-400 px-2 py-0.5 rounded">
                        VIDEO 2.6
                    </span>
                </div>
                <select className="text-xs bg-[#1E1E1E] text-gray-300 px-2 py-1 rounded border border-[#2A2A2A] outline-none">
                    <option>Audio</option>
                </select>
            </div>

            {/* Tabs */}
            <div className="px-4 pt-3 border-b border-[#1A1A1A]">
                <div className="flex gap-1">
                    {[
                        { id: "text-to-video", label: "Text to Video" },
                        { id: "image-to-video", label: "Image to Video" },
                        { id: "motion-control", label: "Motion Control" },
                        { id: "elements", label: "Elements" },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as Tab)}
                            className={`px-3 py-2 text-xs font-medium transition-colors ${activeTab === tab.id
                                ? "text-white border-b-2 border-white"
                                : "text-gray-500 hover:text-gray-300"
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto">
                <AnimatePresence mode="wait">
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
                                    placeholder="Use quotation marks for speaking/singing content. For example, the character sings 'look at the stars' (best with English or Chinese Mandarin). Click to view VIDEO 2.6 User Guide to learn more about best practices for prompt writing."
                                    className="dark-input w-full px-3 py-3 text-xs min-h-[120px] resize-none"
                                    disabled={isGenerating}
                                />
                            </div>

                            {/* Quick Actions */}
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setShowPresets(!showPresets)}
                                    className="text-xs text-gray-400 hover:text-white transition-colors"
                                >
                                    📚 Presets
                                </button>
                                <button
                                    onClick={() => setShowScript(!showScript)}
                                    className="text-xs text-gray-400 hover:text-white transition-colors"
                                >
                                    ✨ Script Generator
                                </button>
                            </div>

                            {/* Presets Grid */}
                            {showPresets && (
                                <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto">
                                    {presets.slice(0, 10).map((preset) => (
                                        <PresetCard
                                            key={preset.id}
                                            preset={preset}
                                            onSelect={(p) => {
                                                onPresetSelect(p);
                                                setShowPresets(false);
                                            }}
                                        />
                                    ))}
                                </div>
                            )}

                            {/* Script Generator */}
                            {showScript && (
                                <div className="border-t border-[#1A1A1A] pt-4">
                                    <ScriptGenerator apiKey={apiKey} />
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Bottom Controls */}
            <div className="p-4 border-t border-[#1A1A1A] space-y-3">
                {/* Native Audio Toggle */}
                <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">Native Audio</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" defaultChecked />
                        <div className="w-9 h-5 bg-[#1E1E1E] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
                    </label>
                </div>

                {/* Settings Row */}
                <div className="flex items-center gap-2 text-xs">
                    <select className="flex-1 bg-[#1E1E1E] text-gray-300 px-2 py-1.5 rounded border border-[#2A2A2A] outline-none">
                        <option>Professional</option>
                        <option>Standard</option>
                    </select>
                    <select className="w-16 bg-[#1E1E1E] text-gray-300 px-2 py-1.5 rounded border border-[#2A2A2A] outline-none">
                        <option>5s</option>
                        <option>6s</option>
                        <option>8s</option>
                    </select>
                    <select
                        value={aspectRatio}
                        onChange={(e) => setAspectRatio(e.target.value)}
                        className="w-20 bg-[#1E1E1E] text-gray-300 px-2 py-1.5 rounded border border-[#2A2A2A] outline-none"
                    >
                        <option value="16:9">16:9</option>
                        <option value="9:16">9:16</option>
                    </select>
                    <select className="w-24 bg-[#1E1E1E] text-gray-300 px-2 py-1.5 rounded border border-[#2A2A2A] outline-none">
                        <option>1 Output</option>
                    </select>
                </div>

                {/* Generate Button */}
                <button
                    onClick={() => onGenerate(aspectRatio)}
                    disabled={isGenerating || !apiKey || !prompt.trim()}
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
                        `🎬 ${prompt.trim() ? "50" : "0"} Generate`
                    )}
                </button>
            </div>
        </div>
    );
}
