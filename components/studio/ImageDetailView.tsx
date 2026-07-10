"use client";

import { useState, useRef, useCallback, KeyboardEvent } from "react";
import { StudioAsset } from "@/lib/types";

interface ImageDetailViewProps {
    asset: StudioAsset;
    onClose: () => void;
    onEditSubmit?: (editPrompt: string) => void;
    modelLabel?: string;
}

export default function ImageDetailView({
    asset, onClose, onEditSubmit, modelLabel = "Pro",
}: ImageDetailViewProps) {
    const [editPrompt, setEditPrompt] = useState("");
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const shortTitle = asset.prompt.length > 48
        ? asset.prompt.slice(0, 48) + "…"
        : asset.prompt;

    const handleSubmit = useCallback(() => {
        if (!editPrompt.trim()) return;
        onEditSubmit?.(editPrompt.trim());
        onClose();
    }, [editPrompt, onEditSubmit, onClose]);

    function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
    }

    return (
        <div className="fixed inset-0 z-50 bg-black flex flex-col select-none">

            {/* ── Top bar ─────────────────────────────────────────── */}
            <div className="flex items-center gap-2 px-4 h-12 flex-shrink-0 border-b border-[#111]">
                {/* Back */}
                <button
                    onClick={onClose}
                    className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-white transition-colors flex-shrink-0"
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15 18 9 12 15 6" />
                    </svg>
                </button>

                {/* Prompt title */}
                <span className="text-white text-sm font-medium truncate">{shortTitle}</span>

                {/* Info */}
                <button className="text-gray-700 hover:text-gray-400 transition-colors flex-shrink-0">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="16" x2="12" y2="12" />
                        <line x1="12" y1="8" x2="12.01" y2="8" />
                    </svg>
                </button>

                <div className="flex-1" />

                {/* Right actions */}
                <button className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-white transition-colors" title="Like">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                </button>
                <button className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-white transition-colors" title="Share with team">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                </button>
                <button className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-white transition-colors" title="Share">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
                        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                    </svg>
                </button>

                {/* Hide history */}
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#2A2A2A] hover:border-[#444] text-gray-500 hover:text-white transition-colors text-xs flex-shrink-0">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                    </svg>
                    Hide history
                </button>

                {/* Done */}
                <button
                    onClick={onClose}
                    className="px-4 py-1.5 rounded-full bg-green-500/10 hover:bg-green-500/20 text-green-400 text-sm font-medium transition-colors flex-shrink-0"
                >
                    Done
                </button>
            </div>

            {/* ── Body ────────────────────────────────────────────── */}
            <div className="flex flex-1 min-h-0 relative">

                {/* Left edit toolbar */}
                <div className="w-12 flex flex-col items-center gap-3 pt-8 flex-shrink-0">
                    <button className="w-9 h-9 flex items-center justify-center text-gray-600 hover:text-gray-300 rounded-xl hover:bg-[#1C1C1C] transition-colors" title="Crop">
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="6 2 6 6 2 6" />
                            <polyline points="18 22 18 18 22 18" />
                            <path d="M6 6h14v12" />
                            <path d="M2 18h12V6" />
                        </svg>
                    </button>
                    <button className="w-9 h-9 flex items-center justify-center text-gray-600 hover:text-gray-300 rounded-xl hover:bg-[#1C1C1C] transition-colors" title="Zoom / lens">
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="11" cy="11" r="8" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                            <line x1="11" y1="8" x2="11" y2="14" />
                            <line x1="8" y1="11" x2="14" y2="11" />
                        </svg>
                    </button>
                    <button className="w-9 h-9 flex items-center justify-center text-gray-600 hover:text-gray-300 rounded-xl hover:bg-[#1C1C1C] transition-colors" title="AI edit">
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>
                    </button>
                </div>

                {/* Image (centered) */}
                <div className="flex-1 flex items-center justify-center overflow-hidden p-6 pr-52">
                    <img
                        src={asset.url}
                        alt={asset.prompt}
                        className="max-h-full max-w-full object-contain rounded-2xl shadow-2xl"
                        style={{ userSelect: "none" }}
                    />
                </div>

                {/* Thumbnail info card (bottom-right of body) */}
                <div className="absolute bottom-6 right-6 w-44 flex-shrink-0">
                    <img
                        src={asset.url}
                        alt="thumbnail"
                        className="w-full rounded-xl object-cover mb-2 shadow-lg"
                        style={{
                            aspectRatio: asset.aspectRatio?.replace(":", "/") ?? "1/1",
                            maxHeight: 120,
                            objectFit: "cover",
                        }}
                    />
                    <p className="text-xs text-gray-500 leading-relaxed line-clamp-3">
                        {asset.prompt}
                    </p>
                    <button
                        onClick={() => setEditPrompt(asset.prompt)}
                        className="mt-1 self-start flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#1A1A1A] hover:bg-[#252525] text-gray-500 hover:text-gray-300 text-[11px] transition-colors cursor-pointer"
                        title="Copy prompt to edit bar"
                    >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                        Use prompt
                    </button>
                </div>
            </div>

            {/* ── Bottom prompt bar ───────────────────────────────── */}
            <div className="px-4 pb-5 pt-2 flex justify-center flex-shrink-0">
                <div className="bg-[#1C1C1C] rounded-2xl w-full max-w-[620px] flex items-center gap-2 px-3 py-2.5">
                    {/* + */}
                    <button className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-300 flex-shrink-0 transition-colors">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                    </button>

                    {/* Textarea */}
                    <textarea
                        ref={textareaRef}
                        value={editPrompt}
                        onChange={e => setEditPrompt(e.target.value)}
                        onKeyDown={handleKeyDown}
                        rows={1}
                        placeholder="What do you want to change?"
                        className="flex-1 bg-transparent text-white placeholder-gray-500 text-sm resize-none outline-none leading-relaxed"
                        style={{ scrollbarWidth: "none" }}
                    />

                    {/* Model chip */}
                    <div className="flex items-center gap-1.5 bg-[#2A2A2A] rounded-full px-2.5 py-1.5 flex-shrink-0">
                        <span className="text-green-500 text-xs">✦</span>
                        <span className="text-gray-400 text-xs">{modelLabel}</span>
                        <span className="text-gray-700 text-[10px]">□</span>
                        <span className="text-gray-400 text-xs">1x</span>
                    </div>

                    {/* Send */}
                    <button
                        onClick={handleSubmit}
                        disabled={!editPrompt.trim()}
                        className="w-8 h-8 rounded-full bg-[#2A2A2A] disabled:opacity-30 hover:bg-[#333] text-white flex items-center justify-center flex-shrink-0 transition-colors"
                    >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="19" x2="12" y2="5" />
                            <polyline points="5 12 12 5 19 12" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
}
