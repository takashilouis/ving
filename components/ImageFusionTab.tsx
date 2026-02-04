"use client";

import { useState, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FusionImage, FusionQuality, GeneratedImage } from "@/lib/types";
import { getFusionCreditCost } from "@/lib/credits";

interface ImageFusionTabProps {
    onImageGenerated: (image: GeneratedImage) => void;
    csrfToken: string | null;
    // Lifted state props
    images: FusionImage[];
    onImagesChange: (images: FusionImage[]) => void;
    prompt: string;
    onPromptChange: (prompt: string) => void;
    aspectRatio: string;
    onAspectRatioChange: (ratio: string) => void;
    quality: FusionQuality;
    onQualityChange: (quality: FusionQuality) => void;
}

const ASPECT_RATIOS = [
    { value: "16:9", label: "16:9" },
    { value: "9:16", label: "9:16" },
    { value: "1:1", label: "1:1" },
    { value: "3:4", label: "3:4" },
    { value: "4:3", label: "4:3" },
];

export default function ImageFusionTab({
    onImageGenerated,
    csrfToken,
    images,
    onImagesChange,
    prompt,
    onPromptChange,
    aspectRatio,
    onAspectRatioChange,
    quality,
    onQualityChange,
}: ImageFusionTabProps) {
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const creditCost = useMemo(() => getFusionCreditCost(quality), [quality]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const filesToProcess = Array.from(files).slice(0, 5 - images.length);
        const newImages: FusionImage[] = [];
        let processedCount = 0;

        filesToProcess.forEach((file) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                newImages.push({
                    id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    data: reader.result as string,
                    label: "",
                });
                processedCount++;

                // Once all files are processed, update state
                if (processedCount === filesToProcess.length) {
                    onImagesChange([...images, ...newImages].slice(0, 5));
                }
            };
            reader.readAsDataURL(file);
        });

        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleRemoveImage = (id: string) => {
        onImagesChange(images.filter((img) => img.id !== id));
    };

    const handleGenerate = async () => {
        if (images.length < 2) {
            setError("Please upload at least 2 images to create a fusion");
            return;
        }

        setIsGenerating(true);
        setError(null);

        try {
            const response = await fetch("/api/generate-image-fusion", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
                },
                body: JSON.stringify({
                    images: images.map((img) => ({
                        data: img.data,
                    })),
                    prompt,
                    aspectRatio,
                    quality,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to generate fusion image");
            }

            const generatedImage: GeneratedImage = {
                id: `fusion-${Date.now()}`,
                url: data.imageUrl,
                prompt: data.prompt || `Fusion of ${images.length} images`,
                model: quality === "pro" ? "pro" : "flash",
                quality: quality === "pro" ? "4K" : "1K",
                aspectRatio: data.aspectRatio,
                timestamp: Date.now(),
            };

            onImageGenerated(generatedImage);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Failed to generate fusion image";
            setError(errorMessage);
            console.error("Fusion generation error:", err);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="p-4 space-y-4">
            {/* Input Images */}
            <div>
                <label className="text-xs font-semibold text-gray-400 uppercase mb-2 block">
                    Input Images ({images.length}/5)
                </label>
                <div className="flex flex-wrap gap-2">
                    {/* Add Image Button */}
                    {images.length < 5 && (
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isGenerating}
                            className="w-20 h-20 rounded-lg border-2 border-dashed border-[#2A2A2A] hover:border-green-500/50 transition-colors flex flex-col items-center justify-center text-gray-500 hover:text-green-400"
                        >
                            <svg
                                width="20"
                                height="20"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                            >
                                <line x1="12" y1="5" x2="12" y2="19" />
                                <line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                            <span className="text-[10px] mt-1">Add</span>
                        </button>
                    )}

                    {/* Image Previews */}
                    <AnimatePresence>
                        {images.map((img, index) => (
                            <motion.div
                                key={img.id}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                className="relative group"
                            >
                                <div className="w-20 h-20 rounded-lg overflow-hidden bg-[#1E1E1E]">
                                    <img
                                        src={img.data}
                                        alt={`Image ${index + 1}`}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                {/* Remove Button */}
                                <button
                                    onClick={() => handleRemoveImage(img.id)}
                                    disabled={isGenerating}
                                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    x
                                </button>
                                {/* Image Number */}
                                <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-[9px] text-center py-0.5 text-white">
                                    {index + 1}
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                />
                <p className="text-[10px] text-gray-500 mt-2">
                    Upload 2-5 images to combine into one cohesive image
                </p>
            </div>

            {/* Optional Prompt */}
            <div>
                <label className="text-xs font-semibold text-gray-400 uppercase mb-2 block">
                    Prompt (Optional)
                </label>
                <textarea
                    value={prompt}
                    onChange={(e) => onPromptChange(e.target.value)}
                    placeholder="Describe how you want the images combined..."
                    className="dark-input w-full px-3 py-3 text-xs min-h-[80px] resize-none"
                    disabled={isGenerating}
                />
            </div>

            {/* Aspect Ratio */}
            <div>
                <label className="text-xs font-semibold text-gray-400 uppercase mb-2 block">
                    Aspect Ratio
                </label>
                <div className="flex gap-2">
                    {ASPECT_RATIOS.map((ratio) => (
                        <button
                            key={ratio.value}
                            onClick={() => onAspectRatioChange(ratio.value)}
                            disabled={isGenerating}
                            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${aspectRatio === ratio.value
                                ? "bg-green-500 text-black"
                                : "bg-[#1E1E1E] text-gray-400 hover:text-white hover:bg-[#2A2A2A]"
                                }`}
                        >
                            {ratio.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Quality Selection */}
            <div>
                <label className="text-xs font-semibold text-gray-400 uppercase mb-2 block">
                    Quality
                </label>
                <div className="flex gap-2">
                    <button
                        onClick={() => onQualityChange("standard")}
                        disabled={isGenerating}
                        className={`flex-1 py-2.5 rounded-lg text-xs font-semibold transition-all ${quality === "standard"
                            ? "bg-green-500 text-black"
                            : "bg-[#1E1E1E] text-gray-400 hover:text-white hover:bg-[#2A2A2A]"
                            }`}
                    >
                        Standard
                        <span className="block text-[9px] opacity-70 mt-0.5">Nano Banana</span>
                    </button>
                    <button
                        onClick={() => onQualityChange("pro")}
                        disabled={isGenerating}
                        className={`flex-1 py-2.5 rounded-lg text-xs font-semibold transition-all ${quality === "pro"
                            ? "bg-green-500 text-black"
                            : "bg-[#1E1E1E] text-gray-400 hover:text-white hover:bg-[#2A2A2A]"
                            }`}
                    >
                        4K
                        <span className="block text-[9px] opacity-70 mt-0.5">Nano Banana Pro</span>
                    </button>
                </div>
            </div>

            {/* Credit Cost Display */}
            <div className="p-3 bg-[#1E1E1E] rounded-lg">
                <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-400">Fusion Cost</span>
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

            {/* Generate Button */}
            <button
                onClick={handleGenerate}
                disabled={isGenerating || images.length < 2}
                className={`w-full py-3 rounded-lg font-bold text-sm transition-all ${isGenerating || images.length < 2
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
                        Creating Fusion...
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
                            <rect x="3" y="3" width="7" height="7" rx="1" />
                            <rect x="14" y="3" width="7" height="7" rx="1" />
                            <rect x="3" y="14" width="7" height="7" rx="1" />
                            <path d="M14 14h7v7h-7z" />
                            <path d="M12 12L17.5 17.5" />
                        </svg>
                        Create Fusion Image
                    </span>
                )}
            </button>
        </div>
    );
}
