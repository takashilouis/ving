"use client";

import { motion } from "framer-motion";

interface GeneratedVideo {
    id: string;
    url: string;
    prompt: string;
    duration: number;
    timestamp: number;
}

interface VideoPreviewProps {
    video: GeneratedVideo | null;
    isGenerating: boolean;
    progress: string;
    videoHistory?: GeneratedVideo[];
    onSelectVideo?: (video: GeneratedVideo) => void;
}

export default function VideoPreview({
    video,
    isGenerating,
    progress,
    videoHistory = [],
    onSelectVideo,
}: VideoPreviewProps) {
    const downloadVideo = () => {
        if (!video) return;

        // Check if it's an external URL (Kling, etc.) - open in new tab
        const isExternalUrl = video.url.startsWith('http') && !video.url.includes(window.location.hostname);

        if (isExternalUrl) {
            // Open external video URLs in new tab
            window.open(video.url, "_blank", "noopener,noreferrer");
        } else {
            // Download local/blob URLs directly
            try {
                const a = document.createElement("a");
                a.href = video.url;
                a.download = `vling-video-${Date.now()}.mp4`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            } catch (error) {
                console.error("Download failed:", error);
                window.open(video.url, "_blank");
            }
        }
    };

    const formatTime = (timestamp: number) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="flex-1 h-full bg-[#0A0A0A] flex flex-col overflow-y-auto">
            {/* Top Bar */}
            <div className="border-b border-[#1A1A1A] px-6 py-3 flex items-center justify-end gap-3">
                <span className="text-xs bg-[#1E1E1E] px-3 py-1.5 rounded text-gray-400 font-medium">
                    Motion Video
                </span>
                <span className="text-xs bg-[#1E1E1E] px-3 py-1.5 rounded text-gray-400 font-medium">
                    Video 2.6
                </span>
                <span className="text-xs bg-[#1E1E1E] px-3 py-1.5 rounded text-gray-400 font-medium">
                    Standard Mode
                </span>
                <div className="flex items-center gap-2 ml-4">
                    <button className="p-1.5 hover:bg-[#1E1E1E] rounded transition-colors text-gray-400 hover:text-white">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="1" />
                            <circle cx="19" cy="12" r="1" />
                            <circle cx="5" cy="12" r="1" />
                        </svg>
                    </button>
                    <button className="p-1.5 hover:bg-[#1E1E1E] rounded transition-colors text-gray-400 hover:text-white">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Video Area */}
                <div className="flex-1 flex items-center justify-center p-6">
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
                                        opacity: [0.5, 1, 0.5]
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
                                            style={{ top: '50%', left: '100%', transform: 'translate(-50%, -50%)' }}
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
                            <p className="text-sm text-gray-500">
                                Creating your masterpiece...
                            </p>
                        </motion.div>
                    ) : video ? (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="w-full max-w-4xl"
                        >
                            <div className="relative bg-black rounded-xl overflow-hidden shadow-2xl">
                                <button
                                    onClick={downloadVideo}
                                    className="absolute top-4 right-4 z-10 p-3 bg-black/70 hover:bg-black/90 rounded-lg transition-all hover:scale-110"
                                    title="Download Video"
                                >
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                        <polyline points="7 10 12 15 17 10" />
                                        <line x1="12" y1="15" x2="12" y2="3" />
                                    </svg>
                                </button>
                                <video
                                    src={video.url}
                                    controls
                                    autoPlay
                                    muted
                                    loop
                                    className="w-full aspect-video"
                                    playsInline
                                />
                            </div>
                            <div className="mt-3 p-3 bg-[#1E1E1E] rounded-lg">
                                <p className="text-xs text-gray-400 line-clamp-2">
                                    {video.prompt}
                                </p>
                            </div>
                        </motion.div>
                    ) : (
                        <div className="text-center max-w-md">
                            <div className="w-24 h-24 bg-[#1E1E1E] rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-600">
                                    <polygon points="23 7 16 12 23 17 23 7" />
                                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-semibold text-gray-200 mb-2">
                                No video generated yet
                            </h3>
                            <p className="text-sm text-gray-500">
                                Enter a prompt and click Generate to create your video
                            </p>
                        </div>
                    )}
                </div>

                {/* Video History Gallery */}
                {videoHistory.length > 0 && (
                    <div className="border-t border-[#1A1A1A] p-4">
                        <h4 className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wider">
                            Recent Videos ({videoHistory.length})
                        </h4>
                        <div className="flex gap-3 overflow-x-auto pb-2">
                            {videoHistory.map((historyVideo) => (
                                <motion.button
                                    key={historyVideo.id}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => onSelectVideo?.(historyVideo)}
                                    className={`flex-shrink-0 w-32 rounded-lg overflow-hidden border-2 transition-all ${video?.id === historyVideo.id
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
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Controls */}
            {video && !isGenerating && (
                <div className="border-t border-[#1A1A1A] px-6 py-3 flex items-center justify-between bg-[#0A0A0A]">
                    <div className="flex items-center gap-4">
                        <button className="text-xs font-medium text-gray-400 hover:text-white transition-colors flex items-center gap-2">
                            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                            Go to OT to create
                        </button>
                        <button className="text-xs font-medium text-gray-400 hover:text-white transition-colors flex items-center gap-2">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                            </svg>
                            Lip Sync
                        </button>
                        <button className="text-xs font-medium text-gray-400 hover:text-white transition-colors flex items-center gap-2">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                                <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                            </svg>
                            AI Sound
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
