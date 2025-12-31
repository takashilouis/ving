"use client";

import { motion } from "framer-motion";

export interface GeneratedVideo {
    id: string;
    url: string;
    prompt: string;
    duration: number;
    createdAt: Date;
}

interface VideoGalleryProps {
    videos: GeneratedVideo[];
}

export default function VideoGallery({ videos }: VideoGalleryProps) {
    const downloadVideo = (video: GeneratedVideo) => {
        try {
            const a = document.createElement("a");
            a.href = video.url;
            a.download = `vling-video-${video.id}.mp4`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } catch (error) {
            console.error("Download failed:", error);
            window.open(video.url, "_blank");
        }
    };

    if (videos.length === 0) {
        return (
            <div className="dark-card p-12 text-center">
                <p className="text-6xl mb-4">🎥</p>
                <p className="font-bold text-xl text-gray-200">No videos yet</p>
                <p className="text-sm text-gray-500 mt-2">
                    Generate your first video using the prompt above!
                </p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {videos.map((video, index) => (
                <motion.div
                    key={video.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="video-card"
                >
                    <video
                        src={video.url}
                        controls
                        autoPlay
                        muted
                        loop
                        className="w-full aspect-video bg-black"
                        playsInline
                    />
                    <div className="p-4 flex flex-col gap-3">
                        <p className="text-xs font-mono text-gray-400 line-clamp-2">
                            {video.prompt}
                        </p>
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold bg-green-500 text-black px-3 py-1 rounded-full">
                                {video.duration}s
                            </span>
                            <motion.button
                                whileTap={{ scale: 0.95 }}
                                onClick={() => downloadVideo(video)}
                                className="btn-secondary px-4 py-2 text-xs font-semibold"
                            >
                                ⬇️ Download
                            </motion.button>
                        </div>
                    </div>
                </motion.div>
            ))}
        </div>
    );
}
