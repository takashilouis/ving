"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import UserMenu from "./UserMenu";

interface GeneratedVideo {
    id: string;
    url: string;
    prompt: string;
    duration: number;
    timestamp: number;
    source?: string;
    aspectRatio?: string;
    resolution?: string;
    googleVideoUri?: string;
}

interface VideoPreviewProps {
    video: GeneratedVideo | null;
    isGenerating: boolean;
    progress: string;
    videoHistory?: GeneratedVideo[];
    onSelectVideo?: (video: GeneratedVideo) => void;
    onDeleteVideo?: (videoId: string) => void;
    onExtend?: (googleVideoUri: string, extensionPrompt: string, video: GeneratedVideo) => void;
}

export default function VideoPreview({
    video,
    isGenerating,
    progress,
    videoHistory = [],
    onSelectVideo,
    onDeleteVideo,
    onExtend,
}: VideoPreviewProps) {
    const [isDownloading, setIsDownloading] = useState(false);
    const [hoveredId, setHoveredId] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [showExtend, setShowExtend] = useState(false);
    const [extensionPrompt, setExtensionPrompt] = useState("");

    const copyPrompt = useCallback(async () => {
        if (!video?.prompt) return;
        await navigator.clipboard.writeText(video.prompt);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }, [video?.prompt]);

    const downloadVideo = async () => {
        if (!video) return;

        setIsDownloading(true);
        try {
            const filename = `ving-video-${Date.now()}.mp4`;
            const downloadUrl = `/api/download?url=${encodeURIComponent(video.url)}&filename=${filename}`;
            const a = document.createElement("a");
            a.href = downloadUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            // Artificial delay to show downloading state for a moment
            await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
            console.error("Download failed:", error);
            window.open(video.url, "_blank");
        } finally {
            setIsDownloading(false);
        }
    };

    const formatTime = (timestamp: number) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    };

    return (
        <div className="flex-1 min-w-0 h-full bg-[#0A0A0A] flex flex-col min-h-0">
            {/* Top Bar */}
            <div className="flex-shrink-0 border-b border-[#1A1A1A] px-6 py-3 flex items-center justify-end gap-3">
                {video && (
                    <>
                        <span className="text-xs bg-[#1E1E1E] px-3 py-1.5 rounded text-gray-400 font-medium">
                            {video.source === "kling" ? "Kling 2.6" : "Veo 3.1 Fast"}
                        </span>
                        <span className="text-xs bg-[#1E1E1E] px-3 py-1.5 rounded text-gray-400 font-medium">
                            {video.resolution === "4k" ? "4K" : (video.resolution ?? "720p")}
                        </span>
                        <span className="text-xs bg-[#1E1E1E] px-3 py-1.5 rounded text-gray-400 font-medium">
                            {video.aspectRatio ?? "16:9"}
                        </span>
                        <span className="text-xs bg-[#1E1E1E] px-3 py-1.5 rounded text-gray-400 font-medium">
                            {video.duration}s
                        </span>
                        {video.googleVideoUri && onExtend && (() => {
                            const FORTY_EIGHT_HOURS = 48 * 60 * 60 * 1000;
                            const expired = video.timestamp && (Date.now() - video.timestamp) > FORTY_EIGHT_HOURS;
                            const notWidescreen = video.aspectRatio && video.aspectRatio !== "16:9";
                            const disabledTitle = expired
                                ? "Extension expired — Google's Files API has a 48-hour limit. Generate a new video to extend."
                                : notWidescreen
                                ? `Veo can only extend 16:9 videos (this video is ${video.aspectRatio}).`
                                : null;
                            return disabledTitle ? (
                                <span
                                    title={disabledTitle}
                                    className="text-xs px-3 py-1.5 rounded font-medium bg-[#1E1E1E] text-gray-600 cursor-not-allowed flex items-center gap-1.5"
                                >
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                        <polyline points="5 12 19 12" /><polyline points="13 6 19 12 13 18" />
                                    </svg>
                                    Extend
                                </span>
                            ) : (
                                <button
                                    onClick={() => setShowExtend(!showExtend)}
                                    className={`text-xs px-3 py-1.5 rounded font-medium transition-colors flex items-center gap-1.5 ${showExtend ? "bg-green-500 text-black" : "bg-[#1E1E1E] text-gray-400 hover:text-white"}`}
                                >
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                        <polyline points="5 12 19 12" /><polyline points="13 6 19 12 13 18" />
                                    </svg>
                                    Extend
                                </button>
                            );
                        })()}
                    </>
                )}
                <UserMenu />
            </div>

            {/* Extend form — slides open below top bar */}
            {showExtend && video?.googleVideoUri && onExtend && (
                <div className="flex-shrink-0 border-b border-[#1A1A1A] px-6 py-3 bg-[#0E0E0E] flex items-center gap-3">
                    <input
                        value={extensionPrompt}
                        onChange={(e) => setExtensionPrompt(e.target.value)}
                        placeholder="Continue the scene... (optional)"
                        className="flex-1 bg-[#1A1A1A] text-xs text-gray-300 px-3 py-2 rounded border border-[#2A2A2A] outline-none placeholder-gray-600"
                    />
                    <button
                        onClick={() => {
                            onExtend(video.googleVideoUri!, extensionPrompt, video);
                            setShowExtend(false);
                            setExtensionPrompt("");
                        }}
                        className="px-4 py-2 bg-green-500 hover:bg-green-400 text-black text-xs font-bold rounded-lg transition-colors whitespace-nowrap"
                    >
                        Extend +7s →
                    </button>
                    <button onClick={() => { setShowExtend(false); setExtensionPrompt(""); }} className="text-gray-600 hover:text-gray-400 transition-colors text-xs">
                        Cancel
                    </button>
                </div>
            )}

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                {/* Video Area - scrollable, shrinks to make room for gallery */}
                <div className="flex-1 flex items-start justify-center p-6 min-h-0 overflow-y-auto">
                    {isGenerating ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-center relative m-auto"
                        >
                            <div className="relative w-32 h-32 mx-auto mb-8">
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                                    className="absolute inset-0 border-4 border-green-500/20 rounded-full"
                                />
                                <motion.div
                                    animate={{ rotate: -360 }}
                                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                    className="absolute inset-2 border-4 border-green-400/30 rounded-full"
                                />
                                <motion.div
                                    animate={{
                                        scale: [1, 1.2, 1],
                                        opacity: [0.5, 1, 0.5],
                                    }}
                                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                                    className="absolute inset-4 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center"
                                >
                                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                                        <polygon points="23 7 16 12 23 17 23 7" />
                                        <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                                    </svg>
                                </motion.div>
                                {[0, 120, 240].map((angle, i) => (
                                    <motion.div
                                        key={i}
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 4, repeat: Infinity, ease: "linear", delay: i * 0.3 }}
                                        className="absolute inset-0"
                                    >
                                        <div
                                            className="absolute w-2 h-2 bg-green-400 rounded-full"
                                            style={{ top: "50%", left: "100%", transform: "translate(-50%, -50%)" }}
                                        />
                                    </motion.div>
                                ))}
                            </div>
                            <motion.p
                                animate={{ opacity: [0.5, 1, 0.5] }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className="text-lg font-semibold text-gray-200 mb-2"
                            >
                                {progress}
                            </motion.p>
                            <p className="text-sm text-gray-500">Creating your masterpiece...</p>
                        </motion.div>
                    ) : video ? (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex flex-col items-center w-full max-w-4xl"
                        >
                            <div className="relative bg-black rounded-xl overflow-hidden shadow-2xl w-fit max-w-full">
                                <button
                                    onClick={downloadVideo}
                                    disabled={isDownloading}
                                    className="absolute top-4 right-4 z-10 p-3 bg-black/70 hover:bg-black/90 rounded-lg transition-all hover:scale-110 disabled:opacity-50 disabled:cursor-wait"
                                    title="Download Video"
                                >
                                    {isDownloading ? (
                                        <motion.div
                                            animate={{ rotate: 360 }}
                                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                            className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                                        />
                                    ) : (
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                            <polyline points="7 10 12 15 17 10" />
                                            <line x1="12" y1="15" x2="12" y2="3" />
                                        </svg>
                                    )}
                                </button>
                                <video
                                    src={video.url}
                                    controls
                                    autoPlay
                                    muted
                                    loop
                                    className="max-w-full max-h-[65vh] w-auto"
                                    playsInline
                                />
                            </div>
                            <div className="mt-3 p-3 bg-[#1E1E1E] rounded-lg flex items-start gap-2">
                                <p className="text-xs text-gray-400 line-clamp-2 flex-1">{video.prompt}</p>
                                <button
                                    onClick={copyPrompt}
                                    title="Copy prompt"
                                    className="flex-shrink-0 p-1 rounded hover:bg-[#2A2A2A] transition-colors text-gray-500 hover:text-gray-300"
                                >
                                    {copied ? (
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-green-400">
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
                        <div className="text-center max-w-md m-auto">
                            <div className="w-24 h-24 bg-[#1E1E1E] rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-600">
                                    <polygon points="23 7 16 12 23 17 23 7" />
                                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-semibold text-gray-200 mb-2">No video generated yet</h3>
                            <p className="text-sm text-gray-500">
                                Enter a prompt and click Generate to create your video
                            </p>
                        </div>
                    )}
                </div>

                {/* Video History Gallery - flex-shrink-0 so it's never clipped */}
                {videoHistory.length > 0 && (
                    <div className="flex-shrink-0 border-t border-[#1A1A1A] p-4">
                        <h4 className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wider">
                            Recent Videos ({videoHistory.length})
                        </h4>
                        <div className="flex gap-3 overflow-x-auto pb-2">
                            {videoHistory.map((historyVideo) => (
                                <div
                                    key={historyVideo.id}
                                    className="relative flex-shrink-0 w-32"
                                    onMouseEnter={() => setHoveredId(historyVideo.id)}
                                    onMouseLeave={() => setHoveredId(null)}
                                >
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => onSelectVideo?.(historyVideo)}
                                        className={`w-full rounded-lg overflow-hidden border-2 transition-all ${video?.id === historyVideo.id
                                                ? "border-green-500"
                                                : "border-transparent hover:border-gray-600"
                                            }`}
                                    >
                                        <div className="relative">
                                            <video
                                                src={historyVideo.url}
                                                className="w-full aspect-video object-cover"
                                                muted
                                                playsInline
                                            />
                                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                                                <span className="text-[10px] text-gray-300">
                                                    {historyVideo.duration}s • {formatTime(historyVideo.timestamp)}
                                                </span>
                                            </div>
                                        </div>
                                    </motion.button>

                                    {/* Delete button - shown on hover */}
                                    {hoveredId === historyVideo.id && onDeleteVideo && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onDeleteVideo(historyVideo.id);
                                            }}
                                            className="absolute top-1 right-1 z-10 p-1 bg-black/80 hover:bg-red-600 rounded transition-colors"
                                            title="Delete video"
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
