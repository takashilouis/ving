"use client";

import { useState, useRef } from "react";

interface MotionControlTabProps {
    klingAccessKey: string;
    klingSecretKey: string;
    onVideoGenerated: (videoUrl: string, prompt: string) => void;
}

export default function MotionControlTab({ klingAccessKey, klingSecretKey, onVideoGenerated }: MotionControlTabProps) {
    // Reference Image (character to animate)
    const [refImage, setRefImage] = useState<File | null>(null);
    const [refImagePreview, setRefImagePreview] = useState<string | null>(null);

    // Reference Video - URL or File
    const [videoInputMode, setVideoInputMode] = useState<"url" | "upload">("url");
    const [videoUrl, setVideoUrl] = useState("");
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [videoFilePreview, setVideoFilePreview] = useState<string | null>(null);

    // Character orientation
    const [orientation, setOrientation] = useState<"video" | "image">("video");

    // Motion prompt (optional)
    const [motionPrompt, setMotionPrompt] = useState("");

    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [progress, setProgress] = useState("");
    const [elapsedTime, setElapsedTime] = useState(0);

    const imageInputRef = useRef<HTMLInputElement>(null);
    const videoInputRef = useRef<HTMLInputElement>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setRefImage(file);
            const reader = new FileReader();
            reader.onloadend = () => setRefImagePreview(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setVideoFile(file);
            setVideoFilePreview(URL.createObjectURL(file));
        }
    };

    const removeImage = () => {
        setRefImage(null);
        setRefImagePreview(null);
        if (imageInputRef.current) imageInputRef.current.value = "";
    };

    const removeVideo = () => {
        setVideoFile(null);
        if (videoFilePreview) URL.revokeObjectURL(videoFilePreview);
        setVideoFilePreview(null);
        if (videoInputRef.current) videoInputRef.current.value = "";
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
    };

    const startTimer = () => {
        setElapsedTime(0);
        timerRef.current = setInterval(() => {
            setElapsedTime((prev) => prev + 1);
        }, 1000);
    };

    const stopTimer = () => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    };

    const handleGenerate = async () => {
        const hasVideo = videoInputMode === "url" ? videoUrl.trim() : videoFile;
        if (!klingAccessKey || !klingSecretKey || !refImage || !hasVideo) return;

        setIsGenerating(true);
        setError(null);
        setProgress("Preparing files...");
        startTimer();

        try {
            // Convert image to base64
            const imageBase64 = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(refImage);
            });

            // For video: if file uploaded, we need to show a message about storage
            let finalVideoUrl = videoUrl.trim();

            if (videoInputMode === "upload" && videoFile) {
                // TODO: Upload to cloud storage and get URL
                // For now, show error that video upload requires cloud storage setup
                setError("Video upload requires cloud storage setup. Please use a video URL instead, or set up Cloudflare R2/Firebase Storage.");
                stopTimer();
                setIsGenerating(false);
                return;
            }

            setProgress("Sending to Kling AI...");

            const response = await fetch("/api/kling-motion", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    accessKey: klingAccessKey,
                    secretKey: klingSecretKey,
                    imageBase64,
                    videoUrl: finalVideoUrl,
                    orientation,
                    prompt: motionPrompt.trim() || undefined,
                }),
            });

            // Update progress while waiting
            setProgress("Generating video (this may take 2-5 minutes)...");

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to generate video");
            }

            stopTimer();
            onVideoGenerated(data.videoUrl, motionPrompt || "Motion Control Video");
            setProgress("");
        } catch (err) {
            stopTimer();
            const errorMessage = err instanceof Error ? err.message : "An error occurred";
            setError(errorMessage);
            setProgress("");
        } finally {
            setIsGenerating(false);
        }
    };

    const hasKlingKeys = !!klingAccessKey && !!klingSecretKey;
    const hasVideo = videoInputMode === "url" ? videoUrl.trim() : videoFile;

    return (
        <div className="p-4 space-y-4">
            <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">🎬</span>
                <h3 className="text-xs font-bold text-white">Motion Control</h3>
                <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">Kling 2.6</span>
            </div>

            {!hasKlingKeys && (
                <div className="p-3 bg-yellow-950/30 border border-yellow-800/30 rounded text-xs text-yellow-400">
                    ⚠️ Please add your Kling Access Key and Secret Key in Settings first
                </div>
            )}

            {/* Reference Image */}
            <div>
                <label className="text-[10px] font-semibold text-gray-400 uppercase mb-1.5 block">📷 Character Image</label>

                {refImagePreview ? (
                    <div className="relative">
                        <img src={refImagePreview} alt="Character" className="w-full h-28 object-cover rounded-lg" />
                        <button onClick={removeImage} className="absolute top-1 right-1 p-1 bg-red-500 rounded-full hover:bg-red-600 transition-colors">
                            <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2">
                                <path d="M2 2l8 8M10 2L2 10" strokeLinecap="round" />
                            </svg>
                        </button>
                    </div>
                ) : (
                    <div onClick={() => imageInputRef.current?.click()} className="w-full h-28 border-2 border-dashed border-[#2A2A2A] rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-blue-500/50 transition-colors">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-500 mb-1">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
                        </svg>
                        <p className="text-[10px] text-gray-500">Upload character image</p>
                    </div>
                )}
                <input ref={imageInputRef} type="file" accept="image/jpeg,image/png,image/jpg" onChange={handleImageUpload} className="hidden" />
            </div>

            {/* Reference Video - Tab Toggle */}
            <div>
                <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[10px] font-semibold text-gray-400 uppercase">🎥 Motion Video</label>
                    <div className="flex bg-[#1E1E1E] rounded p-0.5">
                        <button
                            onClick={() => setVideoInputMode("url")}
                            className={`px-2 py-0.5 text-[9px] rounded transition-colors ${videoInputMode === "url" ? "bg-blue-500 text-white" : "text-gray-400"}`}
                        >
                            URL
                        </button>
                        <button
                            onClick={() => setVideoInputMode("upload")}
                            className={`px-2 py-0.5 text-[9px] rounded transition-colors ${videoInputMode === "upload" ? "bg-blue-500 text-white" : "text-gray-400"}`}
                        >
                            Upload
                        </button>
                    </div>
                </div>

                {videoInputMode === "url" ? (
                    <div>
                        <input
                            type="url"
                            value={videoUrl}
                            onChange={(e) => setVideoUrl(e.target.value)}
                            placeholder="https://example.com/dance-video.mp4"
                            className="dark-input w-full px-3 py-2 text-xs"
                            disabled={isGenerating}
                        />
                        <p className="text-[9px] text-gray-600 mt-1">Video must be publicly accessible. MP4/MOV, 3-30 seconds.</p>
                    </div>
                ) : (
                    <div>
                        {videoFilePreview ? (
                            <div className="relative">
                                <video src={videoFilePreview} className="w-full h-24 object-cover rounded-lg" muted loop autoPlay playsInline />
                                <button onClick={removeVideo} className="absolute top-1 right-1 p-1 bg-red-500 rounded-full hover:bg-red-600 transition-colors">
                                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2">
                                        <path d="M2 2l8 8M10 2L2 10" strokeLinecap="round" />
                                    </svg>
                                </button>
                            </div>
                        ) : (
                            <div onClick={() => videoInputRef.current?.click()} className="w-full h-24 border-2 border-dashed border-[#2A2A2A] rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-blue-500/50 transition-colors">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-500 mb-1">
                                    <polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                                </svg>
                                <p className="text-[10px] text-gray-500">Upload motion video</p>
                            </div>
                        )}
                        <input ref={videoInputRef} type="file" accept="video/mp4,video/quicktime,video/mov" onChange={handleVideoUpload} className="hidden" />
                        <p className="text-[9px] text-yellow-500 mt-1">⚠️ Requires cloud storage setup (Cloudflare R2 recommended)</p>
                    </div>
                )}
            </div>

            {/* Character Orientation */}
            <div>
                <label className="text-[10px] font-semibold text-gray-400 uppercase mb-2 block">🎭 Character Orientation</label>
                <div className="grid grid-cols-2 gap-2">
                    {(["video", "image"] as const).map((opt) => (
                        <button
                            key={opt}
                            onClick={() => setOrientation(opt)}
                            className={`p-2 rounded-lg border-2 transition-all text-left ${orientation === opt ? "border-blue-500 bg-blue-500/10" : "border-[#2A2A2A] hover:border-gray-600"}`}
                        >
                            <div className="flex items-center gap-2">
                                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${orientation === opt ? "border-blue-500" : "border-gray-500"}`}>
                                    {orientation === opt && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                                </div>
                                <span className="text-[10px] font-medium text-white capitalize">{opt}</span>
                            </div>
                            <p className="text-[9px] text-gray-500 mt-1 ml-6">{opt === "video" ? "Complex motions, ≤30s" : "Camera moves, ≤10s"}</p>
                        </button>
                    ))}
                </div>
            </div>

            {/* Motion Prompt (Optional) */}
            <div>
                <label className="text-[10px] font-semibold text-gray-400 uppercase mb-1.5 block">✏️ Prompt (Optional)</label>
                <textarea
                    value={motionPrompt}
                    onChange={(e) => setMotionPrompt(e.target.value)}
                    placeholder="Refine scene details, visual style, lighting..."
                    className="dark-input w-full px-3 py-2 text-xs min-h-[50px] resize-none"
                    disabled={isGenerating}
                />
            </div>

            {/* Error */}
            {error && (
                <div className="p-2 bg-red-950/30 border border-red-800/30 rounded text-xs text-red-400">⚠️ {error}</div>
            )}

            {/* Progress with Timer */}
            {isGenerating && (
                <div className="p-3 bg-blue-950/30 border border-blue-800/30 rounded">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-blue-400">⏳ {progress}</span>
                        <span className="text-xs text-blue-300 font-mono">{formatTime(elapsedTime)}</span>
                    </div>
                    <div className="w-full h-1.5 bg-blue-900/50 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full animate-pulse" style={{ width: "100%" }} />
                    </div>
                    <p className="text-[9px] text-blue-400/70 mt-2">Estimated: 2-5 minutes depending on video length</p>
                </div>
            )}

            {/* Generate Button */}
            <button
                onClick={handleGenerate}
                disabled={isGenerating || !hasKlingKeys || !refImage || !hasVideo}
                className={`w-full py-3 rounded-lg font-bold text-sm transition-all ${isGenerating || !refImage || !hasVideo ? "bg-blue-500/50 text-white/50" : "bg-blue-500 text-white hover:bg-blue-400"
                    }`}
            >
                {isGenerating ? (
                    <span className="flex items-center justify-center gap-2">
                        <span className="animate-spin">⚙️</span>
                        Generating...
                    </span>
                ) : (
                    <span className="flex items-center justify-center gap-2">🎬 Generate Motion Video</span>
                )}
            </button>
        </div>
    );
}
