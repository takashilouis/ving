"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ImageModel, ImageQuality, GeneratedImage, FusionImage, FusionQuality } from "@/lib/types";
import { getImageCreditCost } from "@/lib/credits";
import ImageFusionTab from "./ImageFusionTab";

type ImageSubTab = "generate" | "fusion";

interface ImageGenerationPanelProps {
    onImageGenerated: (image: GeneratedImage) => void;
    csrfToken: string | null;
    // Fusion state (lifted to dashboard for persistence)
    fusionImages: FusionImage[];
    onFusionImagesChange: (images: FusionImage[]) => void;
    fusionPrompt: string;
    onFusionPromptChange: (prompt: string) => void;
    fusionAspectRatio: string;
    onFusionAspectRatioChange: (ratio: string) => void;
    fusionQuality: FusionQuality;
    onFusionQualityChange: (quality: FusionQuality) => void;
}

const ASPECT_RATIOS = [
    { value: "1:1", label: "1:1 (Square)" },
    { value: "16:9", label: "16:9 (Landscape)" },
    { value: "9:16", label: "9:16 (Portrait)" },
    { value: "4:3", label: "4:3" },
    { value: "3:4", label: "3:4" },
];

export default function ImageGenerationPanel({
    onImageGenerated,
    csrfToken,
    fusionImages,
    onFusionImagesChange,
    fusionPrompt,
    onFusionPromptChange,
    fusionAspectRatio,
    onFusionAspectRatioChange,
    fusionQuality,
    onFusionQualityChange,
}: ImageGenerationPanelProps) {
    const [activeTab, setActiveTab] = useState<ImageSubTab>("generate");

    // Generate tab state
    const [prompt, setPrompt] = useState("");
    const [model, setModel] = useState<ImageModel>("pro");
    const [quality, setQuality] = useState<ImageQuality>("1K");
    const [aspectRatio, setAspectRatio] = useState("16:9");
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Calculate credit cost based on model and quality
    const creditCost = useMemo(() => {
        return getImageCreditCost(model, quality);
    }, [model, quality]);

    // Reset quality to 1K when switching to Flash model
    const handleModelChange = (newModel: ImageModel) => {
        setModel(newModel);
        if (newModel === "flash" && quality !== "1K") {
            setQuality("1K");
        }
    };

    const handleGenerate = async () => {
        if (!prompt.trim()) return;

        setIsGenerating(true);
        setError(null);

        try {
            const response = await fetch("/api/generate-image", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
                },
                body: JSON.stringify({
                    prompt,
                    model,
                    quality,
                    aspectRatio,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to generate image");
            }

            const generatedImage: GeneratedImage = {
                id: `image-${Date.now()}`,
                url: data.imageUrl,
                prompt: data.prompt,
                model: data.model,
                quality: data.quality,
                aspectRatio: data.aspectRatio,
                timestamp: Date.now(),
            };

            onImageGenerated(generatedImage);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Failed to generate image";
            setError(errorMessage);
            console.error("Image generation error:", err);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="w-[370px] h-full bg-[#0A0A0A] border-r border-[#1A1A1A] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-[#1A1A1A]">
                <div className="flex items-center gap-2">
                    <h1 className="text-sm font-bold text-white">AI Image Generator</h1>
                    {activeTab === "generate" && (
                        <span
                            className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                                model === "flash"
                                    ? "bg-yellow-500/20 text-yellow-400"
                                    : "bg-blue-500/20 text-blue-400"
                            }`}
                        >
                            {model === "flash" ? "FLASH 2.5" : "PRO 3.0"}
                        </span>
                    )}
                    {activeTab === "fusion" && (
                        <span className="text-[10px] px-2 py-0.5 rounded font-medium bg-purple-500/20 text-purple-400">
                            FUSION
                        </span>
                    )}
                </div>
            </div>

            {/* Sub-Tabs */}
            <div className="border-b border-[#1A1A1A]">
                <div className="flex">
                    {[
                        { id: "generate", label: "Generate" },
                        { id: "fusion", label: "Fusion Studio" },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as ImageSubTab)}
                            className={`flex-1 py-2.5 text-xs font-medium transition-colors ${
                                activeTab === tab.id
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
                    {/* Fusion Studio Tab */}
                    {activeTab === "fusion" && (
                        <motion.div
                            key="fusion"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            <ImageFusionTab
                                onImageGenerated={onImageGenerated}
                                csrfToken={csrfToken}
                                images={fusionImages}
                                onImagesChange={onFusionImagesChange}
                                prompt={fusionPrompt}
                                onPromptChange={onFusionPromptChange}
                                aspectRatio={fusionAspectRatio}
                                onAspectRatioChange={onFusionAspectRatioChange}
                                quality={fusionQuality}
                                onQualityChange={onFusionQualityChange}
                            />
                        </motion.div>
                    )}

                    {/* Generate Tab */}
                    {activeTab === "generate" && (
                        <motion.div
                            key="generate"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="p-4 space-y-4"
                        >
                {/* Prompt Input */}
                <div>
                    <label className="text-xs font-semibold text-gray-400 uppercase mb-2 block">
                        Prompt
                    </label>
                    <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Describe your image in detail..."
                        className="dark-input w-full px-3 py-3 text-xs min-h-[120px] resize-none"
                        disabled={isGenerating}
                    />
                </div>

                {/* Model Selection */}
                <div>
                    <label className="text-xs font-semibold text-gray-400 uppercase mb-2 block">
                        Model
                    </label>
                    <div className="flex gap-2">
                        <button
                            onClick={() => handleModelChange("flash")}
                            disabled={isGenerating}
                            className={`flex-1 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                                model === "flash"
                                    ? "bg-green-500 text-black"
                                    : "bg-[#1E1E1E] text-gray-400 hover:text-white hover:bg-[#2A2A2A]"
                            }`}
                        >
                            Gemini 2.5 Flash
                        </button>
                        <button
                            onClick={() => handleModelChange("pro")}
                            disabled={isGenerating}
                            className={`flex-1 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                                model === "pro"
                                    ? "bg-green-500 text-black"
                                    : "bg-[#1E1E1E] text-gray-400 hover:text-white hover:bg-[#2A2A2A]"
                            }`}
                        >
                            Gemini 3.0 Pro
                        </button>
                    </div>
                </div>

                {/* Quality Selection */}
                <div>
                    <label className="text-xs font-semibold text-gray-400 uppercase mb-2 block">
                        Quality
                    </label>
                    <div className="flex gap-2">
                        {(["1K", "2K", "4K"] as ImageQuality[]).map((q) => {
                            const isDisabled = model === "flash" && q !== "1K";
                            return (
                                <button
                                    key={q}
                                    onClick={() => setQuality(q)}
                                    disabled={isDisabled || isGenerating}
                                    className={`flex-1 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                                        quality === q && !isDisabled
                                            ? "bg-green-500 text-black"
                                            : isDisabled
                                            ? "bg-[#1E1E1E] text-gray-600 cursor-not-allowed"
                                            : "bg-[#1E1E1E] text-gray-400 hover:text-white hover:bg-[#2A2A2A]"
                                    }`}
                                    title={isDisabled ? "Only available for Pro model" : ""}
                                >
                                    {q}
                                    {q === "4K" && (
                                        <span className="ml-1 text-[9px] opacity-70">PRO</span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                    {model === "flash" && (
                        <p className="text-[10px] text-gray-500 mt-1.5">
                            Flash model generates at fixed 1024x1024 resolution
                        </p>
                    )}
                </div>

                {/* Aspect Ratio */}
                <div>
                    <label className="text-xs font-semibold text-gray-400 uppercase mb-2 block">
                        Aspect Ratio
                    </label>
                    <select
                        value={aspectRatio}
                        onChange={(e) => setAspectRatio(e.target.value)}
                        disabled={isGenerating}
                        className="w-full bg-[#1E1E1E] text-gray-300 px-3 py-2.5 rounded-lg border border-[#2A2A2A] outline-none text-xs"
                    >
                        {ASPECT_RATIOS.map((ratio) => (
                            <option key={ratio.value} value={ratio.value}>
                                {ratio.label}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Credit Cost Display */}
                <div className="p-3 bg-[#1E1E1E] rounded-lg">
                    <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-400">Generation Cost</span>
                        <span className="text-xs font-semibold text-green-400">
                            {creditCost} credit{creditCost !== 1 ? "s" : ""}
                        </span>
                    </div>
                </div>

                {/* Error Display */}
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg"
                    >
                        <p className="text-xs text-red-400">{error}</p>
                    </motion.div>
                )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Generate Button - Only show for generate tab */}
            {activeTab === "generate" && (
                <div className="p-4 border-t border-[#1A1A1A]">
                    <button
                        onClick={handleGenerate}
                        disabled={isGenerating || !prompt.trim()}
                        className={`w-full py-3 rounded-lg font-bold text-sm transition-all ${
                            isGenerating || !prompt.trim()
                                ? "bg-green-500/50 text-black/50 cursor-not-allowed"
                                : "bg-green-500 text-black hover:bg-green-400"
                        }`}
                    >
                        {isGenerating ? (
                            <span className="flex items-center justify-center gap-2">
                                <motion.span
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" />
                                    </svg>
                                </motion.span>
                                Generating...
                            </span>
                        ) : (
                            <span className="flex items-center justify-center gap-2">
                                <svg
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                >
                                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                    <circle cx="8.5" cy="8.5" r="1.5" />
                                    <path d="m21 15-5-5L5 21" />
                                </svg>
                                Generate Image
                            </span>
                        )}
                    </button>
                </div>
            )}
        </div>
    );
}
