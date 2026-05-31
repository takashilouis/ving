"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { GeneratedImage } from "@/lib/types";
import UserMenu from "./UserMenu";

interface ImagePreviewProps {
    image: GeneratedImage | null;
    isGenerating: boolean;
    progress: string;
    imageHistory?: GeneratedImage[];
    onSelectImage?: (image: GeneratedImage) => void;
    onDeleteImage?: (imageId: string) => void;
}

export default function ImagePreview({
    image,
    isGenerating,
    progress,
    imageHistory = [],
    onSelectImage,
    onDeleteImage,
}: ImagePreviewProps) {
    const [copied, setCopied] = useState(false);
    const [hoveredId, setHoveredId] = useState<string | null>(null);

    const copyPrompt = async () => {
        if (!image?.prompt) return;
        try {
            await navigator.clipboard.writeText(image.prompt);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            console.error("Copy failed:", error);
        }
    };

    const downloadImage = () => {
        if (!image) return;

        try {
            const filename = `ving-image-${Date.now()}.png`;
            const downloadUrl = `/api/download?url=${encodeURIComponent(image.url)}&filename=${filename}`;
            const a = document.createElement("a");
            a.href = downloadUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } catch (error) {
            console.error("Download failed:", error);
            // Fallback: open in new tab
            window.open(image.url, "_blank");
        }
    };

    const formatTime = (timestamp: number) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    };

    const getModelLabel = (model: string) => {
        return model === "flash" ? "Flash 2.5" : "Pro 3.0";
    };

    return (
        <div className="flex-1 bg-[#0A0A0A] flex flex-col h-full overflow-hidden">
            {/* Top Bar */}
            <div className="border-b border-[#1A1A1A] px-6 py-3 flex items-center justify-end gap-3">
                <span className="text-xs bg-[#1E1E1E] px-3 py-1.5 rounded text-gray-400 font-medium">
                    AI Image
                </span>
                {image && (
                    <>
                        <span className="text-xs bg-[#1E1E1E] px-3 py-1.5 rounded text-gray-400 font-medium">
                            {getModelLabel(image.model)}
                        </span>
                        <span className="text-xs bg-[#1E1E1E] px-3 py-1.5 rounded text-gray-400 font-medium">
                            {image.quality}
                        </span>
                    </>
                )}
                <UserMenu />
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                {/* Image Area */}
                <div className="flex-1 flex items-center justify-center p-6 min-h-0 overflow-hidden">
                    {isGenerating ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-center relative"
                        >
                            {/* Beautiful particle animation */}
                            <div className="relative w-32 h-32 mx-auto mb-8">
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                                    className="absolute inset-0 border-4 border-blue-500/20 rounded-full"
                                />
                                <motion.div
                                    animate={{ rotate: -360 }}
                                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                    className="absolute inset-2 border-4 border-blue-400/30 rounded-full"
                                />
                                <motion.div
                                    animate={{
                                        scale: [1, 1.2, 1],
                                        opacity: [0.5, 1, 0.5],
                                    }}
                                    transition={{
                                        duration: 1.5,
                                        repeat: Infinity,
                                        ease: "easeInOut",
                                    }}
                                    className="absolute inset-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center"
                                >
                                    <svg
                                        width="40"
                                        height="40"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="white"
                                        strokeWidth="2"
                                    >
                                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                        <circle cx="8.5" cy="8.5" r="1.5" />
                                        <path d="m21 15-5-5L5 21" />
                                    </svg>
                                </motion.div>
                                {[0, 120, 240].map((angle, i) => (
                                    <motion.div
                                        key={i}
                                        animate={{ rotate: 360 }}
                                        transition={{
                                            duration: 4,
                                            repeat: Infinity,
                                            ease: "linear",
                                            delay: i * 0.3,
                                        }}
                                        className="absolute inset-0"
                                    >
                                        <div
                                            className="absolute w-2 h-2 bg-blue-400 rounded-full"
                                            style={{
                                                top: "50%",
                                                left: "100%",
                                                transform: "translate(-50%, -50%)",
                                            }}
                                        />
                                    </motion.div>
                                ))}
                            </div>
                            <motion.p
                                animate={{ opacity: [0.5, 1, 0.5] }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className="text-lg font-semibold text-gray-200 mb-2"
                            >
                                {progress || "Generating image..."}
                            </motion.p>
                            <p className="text-sm text-gray-500">
                                Creating your masterpiece...
                            </p>
                        </motion.div>
                    ) : image ? (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="w-full max-w-4xl"
                        >
                            <div className="relative bg-black rounded-xl overflow-hidden shadow-2xl">
                                <button
                                    onClick={downloadImage}
                                    className="absolute top-4 right-4 z-10 p-3 bg-black/70 hover:bg-black/90 rounded-lg transition-all hover:scale-110"
                                    title="Download Image"
                                >
                                    <svg
                                        width="20"
                                        height="20"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="white"
                                        strokeWidth="2"
                                    >
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                        <polyline points="7 10 12 15 17 10" />
                                        <line x1="12" y1="15" x2="12" y2="3" />
                                    </svg>
                                </button>
                                <img
                                    src={image.url}
                                    alt={image.prompt}
                                    className="w-auto max-w-full max-h-full object-contain"
                                />
                            </div>
                            <div className="mt-3 p-3 bg-[#1E1E1E] rounded-lg flex items-start gap-2">
                                <p className="text-xs text-gray-400 line-clamp-2 flex-1">
                                    {image.prompt}
                                </p>
                                <button
                                    onClick={copyPrompt}
                                    className="flex-shrink-0 p-1.5 hover:bg-[#2A2A2A] rounded transition-colors text-gray-400 hover:text-white"
                                    title="Copy prompt"
                                >
                                    {copied ? (
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green-400">
                                            <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                    ) : (
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    ) : (
                        <div className="text-center max-w-md">
                            <div className="w-24 h-24 bg-[#1E1E1E] rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg
                                    width="48"
                                    height="48"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                    className="text-gray-600"
                                >
                                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                    <circle cx="8.5" cy="8.5" r="1.5" />
                                    <path d="m21 15-5-5L5 21" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-semibold text-gray-200 mb-2">
                                No image generated yet
                            </h3>
                            <p className="text-sm text-gray-500">
                                Enter a prompt and click Generate to create your image
                            </p>
                        </div>
                    )}
                </div>

                {/* Image History Gallery */}
                {imageHistory.length > 0 && (
                    <div className="flex-shrink-0 border-t border-[#1A1A1A] p-4">
                        <h4 className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wider">
                            Recent Images ({imageHistory.length})
                        </h4>
                        <div className="flex gap-3 overflow-x-auto pb-2">
                            {imageHistory.map((historyImage) => (
                                <div
                                    key={historyImage.id}
                                    className="relative flex-shrink-0 w-24 h-24"
                                    onMouseEnter={() => setHoveredId(historyImage.id)}
                                    onMouseLeave={() => setHoveredId(null)}
                                >
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => onSelectImage?.(historyImage)}
                                        className={`w-full h-full rounded-lg overflow-hidden border-2 transition-all ${image?.id === historyImage.id
                                            ? "border-green-500"
                                            : "border-transparent hover:border-gray-600"
                                            }`}
                                    >
                                        <div className="relative w-full h-full">
                                            <img
                                                src={historyImage.url}
                                                alt={historyImage.prompt}
                                                className="w-full h-full object-cover"
                                            />
                                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-1">
                                                <span className="text-[9px] text-gray-300">
                                                    {historyImage.quality} • {formatTime(historyImage.timestamp)}
                                                </span>
                                            </div>
                                        </div>
                                    </motion.button>

                                    {/* Delete button - shown on hover */}
                                    {hoveredId === historyImage.id && onDeleteImage && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onDeleteImage(historyImage.id);
                                            }}
                                            className="absolute top-1 right-1 z-10 p-1 bg-black/80 hover:bg-red-600 rounded transition-colors"
                                            title="Delete image"
                                        >
                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                                                <line x1="18" y1="6" x2="6" y2="18" />
                                                <line x1="6" y1="6" x2="18" y2="18" />
                                            </svg>
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

        </div>
    );
}
