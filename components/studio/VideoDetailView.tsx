"use client";

import { useState, useRef, useEffect, useCallback, KeyboardEvent } from "react";
import { StudioAsset } from "@/lib/types";

interface VideoDetailViewProps {
    asset: StudioAsset;
    relatedAssets?: StudioAsset[];
    onClose: () => void;
    onEditSubmit?: (prompt: string) => void;
    modelLabel?: string;
}

function fmt(s: number) {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = Math.floor(s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
}

export default function VideoDetailView({
    asset, relatedAssets = [], onClose, onEditSubmit, modelLabel = "Flash",
}: VideoDetailViewProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const timelineRef = useRef<HTMLDivElement>(null);
    const [isPlaying, setIsPlaying] = useState(true);
    const [isMuted, setIsMuted] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [editPrompt, setEditPrompt] = useState("");

    // Track native fullscreen state changes (e.g. user presses Esc)
    useEffect(() => {
        const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener("fullscreenchange", onFsChange);
        return () => document.removeEventListener("fullscreenchange", onFsChange);
    }, []);

    const handleFullscreen = useCallback(() => {
        const vid = videoRef.current;
        if (!vid) return;
        if (!document.fullscreenElement) {
            vid.requestFullscreen().catch(() => {});
        } else {
            document.exitFullscreen().catch(() => {});
        }
    }, []);

    // Seek to the video position corresponding to a mouse/touch X coordinate
    const seekFromClientX = useCallback((clientX: number) => {
        const vid = videoRef.current;
        const tl = timelineRef.current;
        if (!vid || !tl || !vid.duration) return;
        const rect = tl.getBoundingClientRect();
        const PLUS_BTN = 40; // px reserved for the + button on the right
        const trackWidth = rect.width - PLUS_BTN;
        const x = Math.max(0, Math.min(clientX - rect.left, trackWidth));
        const newTime = (x / trackWidth) * vid.duration;
        vid.currentTime = newTime;
        setCurrentTime(newTime);
    }, []);

    const handleTimelineMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        seekFromClientX(e.clientX);
        const onMove = (ev: MouseEvent) => seekFromClientX(ev.clientX);
        const onUp = () => {
            document.removeEventListener("mousemove", onMove);
            document.removeEventListener("mouseup", onUp);
        };
        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup", onUp);
    }, [seekFromClientX]);

    const handleTimelineTouchStart = useCallback((e: React.TouchEvent) => {
        seekFromClientX(e.touches[0].clientX);
        const onMove = (ev: TouchEvent) => seekFromClientX(ev.touches[0].clientX);
        const onEnd = () => {
            document.removeEventListener("touchmove", onMove);
            document.removeEventListener("touchend", onEnd);
        };
        document.addEventListener("touchmove", onMove, { passive: true });
        document.addEventListener("touchend", onEnd);
    }, [seekFromClientX]);

    // activeAsset drives the player; starts as the prop but can be switched via thumbnail strip
    const [activeAsset, setActiveAsset] = useState<StudioAsset>(asset);

    const shortTitle = asset.prompt.length > 52 ? asset.prompt.slice(0, 52) + "…" : asset.prompt;
    const cssRatio = activeAsset.aspectRatio?.replace(":", "/") ?? "9/16";

    // All thumbnails for the strip (original asset first, then related videos)
    const thumbStrip = [asset, ...relatedAssets.filter(a => a.type === "video" && a.id !== asset.id).slice(0, 5)];

    // Play on mount and whenever the active asset changes
    useEffect(() => {
        const vid = videoRef.current;
        if (!vid) return;
        setCurrentTime(0);
        setDuration(0);
        setIsPlaying(true);
        vid.play().catch(() => setIsPlaying(false));
    }, [activeAsset.id]);

    const switchAsset = useCallback((next: StudioAsset) => {
        if (next.id === activeAsset.id) return;
        setActiveAsset(next);
    }, [activeAsset.id]);

    const togglePlay = useCallback(() => {
        const vid = videoRef.current;
        if (!vid) return;
        if (vid.paused) { vid.play(); setIsPlaying(true); }
        else { vid.pause(); setIsPlaying(false); }
    }, []);

    const skip = useCallback((delta: number) => {
        const vid = videoRef.current;
        if (!vid) return;
        vid.currentTime = Math.max(0, Math.min(vid.duration, vid.currentTime + delta));
    }, []);

    const handleSubmit = useCallback(() => {
        if (!editPrompt.trim()) return;
        onEditSubmit?.(editPrompt.trim());
        onClose();
    }, [editPrompt, onEditSubmit, onClose]);

    function handleKey(e: KeyboardEvent<HTMLTextAreaElement>) {
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
    }

    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

    return (
        <div className="fixed inset-0 z-50 bg-black flex flex-col select-none">

            {/* ── Top bar ──────────────────────────────────────────── */}
            <div className="flex items-center gap-2 px-4 h-12 flex-shrink-0 border-b border-[#111]">
                <button
                    onClick={onClose}
                    className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-white transition-colors flex-shrink-0"
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15 18 9 12 15 6" />
                    </svg>
                </button>

                <span className="text-white text-sm font-medium truncate max-w-[200px] flex-shrink-0">{shortTitle}</span>

                {/* Thumbnail strip — centered */}
                <div className="flex-1 flex items-center justify-center gap-1.5 overflow-hidden px-2">
                    {thumbStrip.map(a => {
                        const isActive = a.id === activeAsset.id;
                        return (
                            <div
                                key={a.id}
                                onClick={() => switchAsset(a)}
                                className={`h-8 w-8 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all cursor-pointer ${isActive ? "border-white opacity-100" : "border-transparent opacity-50 hover:opacity-90"}`}
                            >
                                <video src={a.url} className="w-full h-full object-cover" muted playsInline />
                            </div>
                        );
                    })}
                </div>

                {/* Right actions */}
                <button className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-white transition-colors" title="Like">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                </button>
                <button className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-white transition-colors" title="Share">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
                        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                    </svg>
                </button>
                <button className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-white transition-colors" title="Download">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                </button>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#2A2A2A] hover:border-[#444] text-gray-500 hover:text-white transition-colors text-xs flex-shrink-0">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                    </svg>
                    Hide history
                </button>
                <button onClick={onClose} className="px-4 py-1.5 rounded-full bg-green-500/10 hover:bg-green-500/20 text-green-400 text-sm font-medium transition-colors flex-shrink-0">
                    Done
                </button>
            </div>

            {/* ── Body ─────────────────────────────────────────────── */}
            <div className="flex flex-1 min-h-0 overflow-hidden">

                {/* Left: aspect ratio indicator */}
                <div className="w-16 flex-shrink-0 flex flex-col items-center pt-10 gap-1.5 text-gray-600">
                    <div className="border border-gray-600 rounded-sm" style={{ width: 16, height: 22 }} />
                    <span className="text-[11px] tabular-nums">{asset.aspectRatio ?? "9:16"}</span>
                </div>

                {/* Center: player + controls + timeline */}
                <div className="flex-1 min-w-0 flex flex-col items-center py-4 gap-4 overflow-hidden">

                    {/* Video */}
                    <div className="flex-1 min-h-0 flex items-center justify-center w-full">
                        <div
                            className="relative rounded-2xl overflow-hidden bg-[#0A0A0A] h-full max-w-full"
                            style={{ aspectRatio: cssRatio }}
                        >
                            <video
                                key={activeAsset.id}
                                ref={videoRef}
                                src={activeAsset.url}
                                loop
                                muted={isMuted}
                                playsInline
                                className="w-full h-full object-contain"
                                onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime ?? 0)}
                                onLoadedMetadata={() => setDuration(videoRef.current?.duration ?? 0)}
                                onPlay={() => setIsPlaying(true)}
                                onPause={() => setIsPlaying(false)}
                            />
                        </div>
                    </div>

                    {/* Playback controls */}
                    <div className="flex items-center gap-5 text-white flex-shrink-0">
                        <button onClick={() => setIsMuted(v => !v)} className="text-gray-400 hover:text-white transition-colors cursor-pointer" title={isMuted ? "Unmute" : "Mute"}>
                            {isMuted ? (
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                                    <line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" />
                                </svg>
                            ) : (
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                                </svg>
                            )}
                        </button>

                        <span className="text-sm tabular-nums text-gray-300 w-12 text-right">{fmt(currentTime)}</span>

                        <button onClick={() => skip(-5)} className="text-gray-400 hover:text-white transition-colors cursor-pointer" title="−5s">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polygon points="19 20 9 12 19 4 19 20" /><line x1="5" y1="19" x2="5" y2="5" />
                            </svg>
                        </button>

                        <button
                            onClick={togglePlay}
                            className="w-11 h-11 bg-white rounded-full flex items-center justify-center text-black hover:bg-gray-200 transition-colors cursor-pointer flex-shrink-0"
                        >
                            {isPlaying ? (
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                    <rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" />
                                </svg>
                            ) : (
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                    <polygon points="5 3 19 12 5 21 5 3" />
                                </svg>
                            )}
                        </button>

                        <button onClick={() => skip(5)} className="text-gray-400 hover:text-white transition-colors cursor-pointer" title="+5s">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polygon points="5 4 15 12 5 20 5 4" /><line x1="19" y1="5" x2="19" y2="19" />
                            </svg>
                        </button>

                        <span className="text-sm tabular-nums text-gray-300 w-12">{fmt(duration)}</span>

                        <button onClick={handleFullscreen} className="text-gray-400 hover:text-white transition-colors cursor-pointer" title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}>
                            {isFullscreen ? (
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="4 14 10 14 10 20" /><polyline points="20 10 14 10 14 4" />
                                    <line x1="10" y1="14" x2="3" y2="21" /><line x1="21" y1="3" x2="14" y2="10" />
                                </svg>
                            ) : (
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" />
                                    <line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" />
                                </svg>
                            )}
                        </button>
                    </div>

                    {/* Timeline */}
                    <div className="w-full px-4 flex-shrink-0">
                        <div
                            ref={timelineRef}
                            className="relative h-20 bg-[#0E0E0E] rounded-xl overflow-hidden border border-[#1A1A1A] cursor-col-resize"
                            onMouseDown={handleTimelineMouseDown}
                            onTouchStart={handleTimelineTouchStart}
                        >
                            {/* Time ruler */}
                            <div className="absolute top-0 left-0 right-10 h-5 flex border-b border-[#1A1A1A] pointer-events-none">
                                {Array.from({ length: 12 }, (_, i) => (
                                    <div key={i} className="flex-1 flex items-center border-l border-[#1A1A1A] pl-1">
                                        <span className="text-[9px] text-gray-700 tabular-nums">{String(i).padStart(2, "0")}</span>
                                    </div>
                                ))}
                            </div>
                            {/* Frame strip */}
                            <div className="absolute top-5 bottom-1 left-1 right-10 rounded-lg overflow-hidden bg-[#1A1A1A] pointer-events-none">
                                <video src={activeAsset.url} className="w-full h-full object-cover opacity-70" muted playsInline />
                            </div>
                            {/* Playhead */}
                            <div
                                className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_4px_rgba(255,255,255,0.6)] pointer-events-none"
                                style={{ left: `calc(${progress / 100} * (100% - 40px))` }}
                            >
                                {/* Playhead handle */}
                                <div className="absolute -top-0 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-white rounded-full" />
                            </div>
                            {/* + button — stop propagation so clicks don't seek */}
                            <div
                                className="absolute right-1 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full border border-[#333] bg-[#111] flex items-center justify-center text-gray-400 cursor-pointer hover:text-white hover:border-[#555] transition-colors z-10"
                                onMouseDown={e => e.stopPropagation()}
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right: info panel */}
                <div className="w-52 flex-shrink-0 flex flex-col gap-3 pt-4 pr-4 overflow-y-auto">
                    {/* Main thumbnail with white border */}
                    <div className="rounded-2xl overflow-hidden border-2 border-white flex-shrink-0" style={{ aspectRatio: cssRatio }}>
                        <video src={activeAsset.url} className="w-full h-full object-cover" muted playsInline />
                    </div>
                    {/* Prompt + copy-to-bar button */}
                    <div className="flex flex-col gap-1.5">
                        <p className="text-gray-400 text-[13px] leading-relaxed line-clamp-5">{activeAsset.prompt}</p>
                        <button
                            onClick={() => setEditPrompt(activeAsset.prompt)}
                            className="self-start flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#1A1A1A] hover:bg-[#252525] text-gray-500 hover:text-gray-300 text-[11px] transition-colors cursor-pointer"
                            title="Copy prompt to edit bar"
                        >
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                            </svg>
                            Use prompt
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Bottom edit bar ───────────────────────────────────── */}
            <div className="px-4 pb-4 pt-2 flex flex-col items-center gap-1.5 flex-shrink-0">
                <div className="bg-[#1C1C1C] rounded-2xl w-full max-w-[640px] flex flex-col gap-2 px-4 py-3">
                    {/* Textarea — grows with content */}
                    <textarea
                        value={editPrompt}
                        onChange={e => setEditPrompt(e.target.value)}
                        onKeyDown={handleKey}
                        rows={3}
                        placeholder="Describe your edits"
                        className="w-full bg-transparent text-white placeholder-gray-600 text-sm resize-none outline-none leading-relaxed"
                        style={{ scrollbarWidth: "none" }}
                    />
                    {/* Action row */}
                    <div className="flex items-center justify-between">
                        <button className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-gray-300 transition-colors cursor-pointer rounded-full border border-[#333] hover:border-[#555]">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                        </button>
                        <div className="flex items-center gap-2">
                            <button className="flex items-center gap-1.5 px-3 h-8 rounded-full bg-[#2A2A2A] text-gray-300 text-xs hover:bg-[#333] transition-colors cursor-pointer">
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                                Omni {modelLabel}
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={!editPrompt.trim()}
                                className="w-8 h-8 rounded-full bg-white disabled:opacity-30 hover:bg-gray-200 text-black flex items-center justify-center transition-colors cursor-pointer"
                            >
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
                <p className="text-[11px] text-gray-700">AI can make mistakes, so double check it</p>
            </div>
        </div>
    );
}
