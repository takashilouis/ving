"use client";

import { useState, useRef } from "react";

interface ImageToVideoTabProps {
    onGenerate: (
        imageBase64: string,
        imageMimeType: string,
        prompt: string,
        aspectRatio: string,
        duration: number,
        resolution: "720p" | "1080p" | "4k"
    ) => void;
    isGenerating: boolean;
}

export default function ImageToVideoTab({ onGenerate, isGenerating }: ImageToVideoTabProps) {
    const [image, setImage] = useState<{ base64: string; mimeType: string; preview: string } | null>(null);
    const [prompt, setPrompt] = useState("");
    const [aspectRatio, setAspectRatio] = useState("16:9");
    const [duration, setDuration] = useState(6);
    const [resolution, setResolution] = useState<"720p" | "1080p" | "4k">("720p");
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFile = (file: File) => {
        if (!file.type.startsWith("image/")) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target?.result as string;
            const base64 = dataUrl.split(",")[1];
            setImage({ base64, mimeType: file.type, preview: dataUrl });
        };
        reader.readAsDataURL(file);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
    };

    const handleResolutionChange = (r: "720p" | "1080p" | "4k") => {
        setResolution(r);
        if (r === "1080p" || r === "4k") setDuration(8);
    };

    const canGenerate = !!image && !isGenerating;

    return (
        <div className="p-4 space-y-4">
            {/* Image Upload */}
            {!image ? (
                <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
                        isDragging
                            ? "border-green-500 bg-green-500/5"
                            : "border-[#2A2A2A] hover:border-[#3A3A3A] hover:bg-[#111111]"
                    }`}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                    />
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-600 mx-auto mb-3">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <path d="m21 15-5-5L5 21" />
                    </svg>
                    <p className="text-xs text-gray-400 font-medium">Drop an image or click to upload</p>
                    <p className="text-[10px] text-gray-600 mt-1">PNG, JPG, WEBP — used as the first frame</p>
                </div>
            ) : (
                <div className="relative rounded-xl overflow-hidden bg-black">
                    <img
                        src={image.preview}
                        alt="Upload preview"
                        className="w-full max-h-52 object-contain"
                    />
                    <button
                        onClick={() => setImage(null)}
                        className="absolute top-2 right-2 p-1.5 bg-black/70 hover:bg-red-600 rounded-lg transition-colors"
                        title="Remove image"
                    >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>
            )}

            {/* Prompt */}
            <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the motion... (optional)"
                className="dark-input w-full px-3 py-3 text-xs min-h-[80px] resize-none"
                disabled={isGenerating}
            />

            {/* Controls */}
            <div className="flex items-center gap-2 text-xs">
                <select
                    value={resolution}
                    onChange={(e) => handleResolutionChange(e.target.value as "720p" | "1080p" | "4k")}
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
                <select
                    value={aspectRatio}
                    onChange={(e) => setAspectRatio(e.target.value)}
                    className="w-20 bg-[#1E1E1E] text-gray-300 px-2 py-1.5 rounded border border-[#2A2A2A] outline-none"
                >
                    <option value="16:9">16:9</option>
                    <option value="9:16">9:16</option>
                </select>
            </div>

            {(resolution === "1080p" || resolution === "4k") && (
                <p className="text-[10px] text-yellow-500/80">
                    ⚠️ {resolution === "4k" ? "4K" : "1080p"} requires 8s — locked automatically.
                </p>
            )}

            <button
                onClick={() => image && onGenerate(image.base64, image.mimeType, prompt, aspectRatio, duration, resolution)}
                disabled={!canGenerate}
                className={`w-full py-3 rounded-lg font-bold text-sm transition-all ${
                    !canGenerate
                        ? "bg-green-500/50 text-black/50 cursor-not-allowed"
                        : "bg-green-500 text-black hover:bg-green-400"
                }`}
            >
                {isGenerating ? (
                    <span className="flex items-center justify-center gap-2">
                        <span className="animate-spin">⚙️</span>
                        Generating...
                    </span>
                ) : (
                    <span className="flex items-center justify-center gap-2">🎬 Generate Video</span>
                )}
            </button>
        </div>
    );
}
