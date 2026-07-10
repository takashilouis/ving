"use client";

import { useRef, useState, useEffect, KeyboardEvent, useCallback } from "react";
import { GenerationSettings, Character } from "@/lib/types";
import GenerationPopup from "./GenerationPopup";

// ── Plus menu ──────────────────────────────────────────────────────────────────

interface PlusMenuProps {
    onClose: () => void;
    onUploadImage: (file: File) => void;
    onUploadVideo: (file: File) => void;
    onManageCharacters: () => void;
}

function PlusMenu({ onClose, onUploadImage, onUploadVideo, onManageCharacters }: PlusMenuProps) {
    const ref = useRef<HTMLDivElement>(null);
    const imgRef = useRef<HTMLInputElement>(null);
    const vidRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const fn = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
        document.addEventListener("mousedown", fn);
        return () => document.removeEventListener("mousedown", fn);
    }, [onClose]);

    return (
        <div ref={ref} className="absolute bottom-full mb-2 left-0 w-48 bg-[#1C1C1C] border border-[#333] rounded-2xl shadow-2xl overflow-hidden py-1.5 z-50">
            <label className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-[#2A2A2A] cursor-pointer transition-colors">
                Upload image
                <input ref={imgRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) { onUploadImage(f); onClose(); } }} />
            </label>
            <label className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-[#2A2A2A] cursor-pointer transition-colors">
                Upload video
                <input ref={vidRef} type="file" accept="video/mp4,video/quicktime,video/avi" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) { onUploadVideo(f); onClose(); } }} />
            </label>
            <button onClick={() => { onManageCharacters(); onClose(); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-[#2A2A2A] transition-colors">
                Manage characters
            </button>
        </div>
    );
}

// ── Frame picker ───────────────────────────────────────────────────────────────

function FramePicker({
    label, value, onChange,
}: { label: string; value?: string; onChange: (b64: string) => void }) {
    return (
        <label className="relative flex items-center justify-center w-[72px] h-[72px] rounded-xl bg-[#252525] hover:bg-[#2A2A2A] cursor-pointer transition-colors flex-shrink-0 overflow-hidden">
            {value ? (
                <img src={value} alt={label} className="w-full h-full object-cover" />
            ) : (
                <span className="text-sm text-gray-500 font-medium select-none">{label}</span>
            )}
            <input
                type="file" accept="image/*" className="hidden"
                onChange={e => {
                    const f = e.target.files?.[0]; if (!f) return;
                    const r = new FileReader();
                    r.onload = () => onChange(r.result as string);
                    r.readAsDataURL(f);
                }}
            />
        </label>
    );
}

// ── Inline aspect-ratio shape for the mode badge ───────────────────────────────

function RatioShape({ aspectRatio }: { aspectRatio: string }) {
    const [w, h] = aspectRatio.split(":").map(Number);
    const MAX = 13;
    const scale = MAX / Math.max(w, h);
    const bw = Math.max(6, Math.round(w * scale));
    const bh = Math.max(6, Math.round(h * scale));
    return (
        <span className="inline-flex items-center justify-center" style={{ width: MAX, height: MAX }}>
            <span className="border border-current rounded-[1.5px]" style={{ width: bw, height: bh }} />
        </span>
    );
}

// ── Character chip ─────────────────────────────────────────────────────────────

function CharacterChip({ character, onRemove }: { character: Character; onRemove: () => void }) {
    return (
        <span className="inline-flex items-center gap-1.5 bg-[#2A2A2A] rounded-full pl-1 pr-2 py-0.5 text-xs text-gray-300">
            <img src={character.imageUrl} alt={character.name} className="w-4 h-4 rounded-full object-cover" />
            {character.name}
            <button onClick={onRemove} className="text-gray-500 hover:text-white transition-colors leading-none">×</button>
        </span>
    );
}

// ── BottomBar ──────────────────────────────────────────────────────────────────

interface BottomBarProps {
    prompt: string;
    onPromptChange: (v: string) => void;
    onSubmit: () => void;
    settings: GenerationSettings;
    onSettingsChange: (patch: Partial<GenerationSettings>) => void;
    agentMode: boolean;
    onToggleAgentMode: () => void;
    isGenerating: boolean;
    characters: Character[];
    onManageCharacters: () => void;
    onAttachImage: (dataUrl: string) => void;
    onAttachVideo: (url: string) => void;
    onUploadProgress: (pct: number | null) => void;
    csrfToken?: string | null;
    creditBalance?: number;
    thinkingStep?: string | null;
    onStop?: () => void;
}

export default function BottomBar({
    prompt, onPromptChange, onSubmit,
    settings, onSettingsChange,
    agentMode, onToggleAgentMode,
    isGenerating, characters,
    onManageCharacters, onAttachImage, onAttachVideo,
    onUploadProgress, csrfToken,
    creditBalance,
    thinkingStep, onStop,
}: BottomBarProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [showPlusMenu, setShowPlusMenu] = useState(false);
    const [showPopup, setShowPopup] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    const attachedChars = characters.filter(c => settings.selectedCharacterIds.includes(c.id));

    // Auto-upload image to R2 while showing progress in Canvas
    const handleImageFile = useCallback((file: File) => {
        const reader = new FileReader();
        reader.onload = () => {
            const dataUrl = reader.result as string;
            onAttachImage(dataUrl);
            if (!csrfToken) return;
            const formData = new FormData();
            formData.append("file", file);
            const xhr = new XMLHttpRequest();
            xhr.upload.addEventListener("progress", (e) => {
                if (e.lengthComputable) onUploadProgress(Math.round((e.loaded / e.total) * 100));
            });
            xhr.addEventListener("load", () => onUploadProgress(null));
            xhr.addEventListener("error", () => onUploadProgress(null));
            xhr.open("POST", "/api/upload-image");
            xhr.setRequestHeader("x-csrf-token", csrfToken);
            xhr.send(formData);
        };
        reader.readAsDataURL(file);
    }, [csrfToken, onAttachImage, onUploadProgress]);

    const autoResize = useCallback(() => {
        const el = textareaRef.current;
        if (!el) return;
        el.style.height = "auto";
        el.style.height = Math.min(el.scrollHeight, 200) + "px";
    }, []);

    useEffect(() => { autoResize(); }, [prompt, autoResize]);

    function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (!isGenerating && prompt.trim()) onSubmit();
        }
    }

    function handleDrop(e: React.DragEvent) {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (!file) return;
        if (file.type.startsWith("image/")) handleImageFile(file);
        else if (file.type.startsWith("video/")) onAttachVideo(URL.createObjectURL(file));
    }

    const isVideo = settings.mode === "video" || settings.mode === "frames";

    // Model chip display
    const MODEL_META: Record<string, { emoji: string; name: string }> = {
        "flash":    { emoji: "🍌", name: "Nano Banana 2" },
        "pro":      { emoji: "✨", name: "Nano Banana Pro" },
        "veo-fast": { emoji: "⚡", name: "Veo Fast"      },
        "veo-pro":  { emoji: "🎬", name: "Veo Pro"       },
    };
    const modelMeta = MODEL_META[settings.model] ?? { emoji: "✨", name: settings.model };
    const quantityLabel = `${settings.quantity}x`;

    return (
        <div className="px-4 pb-5 pt-2 flex justify-center">
            <div
                className={`relative bg-[#1C1C1C] rounded-2xl transition-colors w-full max-w-[680px] ${isDragging ? "ring-2 ring-green-500/60" : ""}`}
                onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
            >
                {/* Frames mode: Start ⇄ End pickers */}
                {settings.mode === "frames" && (
                    <div className="flex items-center gap-3 px-4 pt-4 pb-0">
                        <FramePicker
                            label="Start"
                            value={settings.startFrameBase64}
                            onChange={v => onSettingsChange({ startFrameBase64: v })}
                        />
                        <span className="text-gray-600">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M7 16V4m0 0L3 8m4-4l4 4" />
                                <path d="M17 8v12m0 0l4-4m-4 4l-4-4" />
                            </svg>
                        </span>
                        <FramePicker
                            label="End"
                            value={settings.endFrameBase64}
                            onChange={v => onSettingsChange({ endFrameBase64: v })}
                        />
                    </div>
                )}

                {/* Character chips (when characters attached) */}
                {attachedChars.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 px-4 pt-3 pb-0">
                        {attachedChars.map(c => (
                            <CharacterChip key={c.id} character={c}
                                onRemove={() => onSettingsChange({
                                    selectedCharacterIds: settings.selectedCharacterIds.filter(id => id !== c.id),
                                })}
                            />
                        ))}
                    </div>
                )}

                {isGenerating && agentMode && thinkingStep ? (
                    /* ── Agent thinking state ─────────────────────────── */
                    <>
                        {/* Thinking text + expand icon */}
                        <div className="px-4 pt-3 pb-1 flex items-start justify-between min-h-[44px]">
                            <p className="text-[15px] text-gray-500 italic leading-relaxed select-none">
                                {thinkingStep}
                            </p>
                            <button className="w-6 h-6 flex items-center justify-center text-gray-600 hover:text-gray-400 transition-colors mt-0.5 flex-shrink-0">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="15 3 21 3 21 9" />
                                    <polyline points="9 21 3 21 3 15" />
                                    <line x1="21" y1="3" x2="14" y2="10" />
                                    <line x1="3" y1="21" x2="10" y2="14" />
                                </svg>
                            </button>
                        </div>

                        {/* Thinking footer */}
                        <div className="flex items-center gap-2 px-3 pb-3">
                            {/* + button */}
                            <button
                                className="w-9 h-9 rounded-full bg-[#2A2A2A] text-gray-600 flex items-center justify-center flex-shrink-0"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                                </svg>
                            </button>

                            {/* Agent pill — white/inverted while thinking */}
                            <button
                                onClick={onToggleAgentMode}
                                className="px-4 py-2 rounded-full text-sm font-medium bg-white text-black transition-colors flex-shrink-0"
                            >
                                Agent
                            </button>

                            <div className="flex-1" />

                            {/* Dimmed icon buttons */}
                            <button className="w-9 h-9 rounded-xl bg-[#2A2A2A] text-gray-700 flex items-center justify-center">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="3" width="18" height="18" rx="2" />
                                    <path d="M9 9h6M9 12h6M9 15h4" />
                                    <path d="M17 9l2 2-2 2" />
                                </svg>
                            </button>
                            <button className="w-9 h-9 rounded-xl bg-[#2A2A2A] text-gray-700 flex items-center justify-center">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="4" y1="6" x2="20" y2="6" />
                                    <line x1="4" y1="12" x2="20" y2="12" />
                                    <line x1="4" y1="18" x2="20" y2="18" />
                                    <circle cx="8" cy="6" r="2" fill="currentColor" stroke="none" />
                                    <circle cx="16" cy="12" r="2" fill="currentColor" stroke="none" />
                                    <circle cx="10" cy="18" r="2" fill="currentColor" stroke="none" />
                                </svg>
                            </button>

                            {/* Stop button — prominent white circle */}
                            <button
                                onClick={onStop}
                                className="w-9 h-9 rounded-full bg-white hover:bg-gray-200 flex items-center justify-center transition-colors flex-shrink-0"
                                title="Stop generation"
                            >
                                <div className="w-3 h-3 bg-black rounded-[2px]" />
                            </button>
                        </div>
                    </>
                ) : (
                    /* ── Normal state ─────────────────────────────────── */
                    <>
                        {/* Textarea */}
                        <div className="px-4 pt-3 pb-1">
                            <textarea
                                ref={textareaRef}
                                value={prompt}
                                onChange={e => onPromptChange(e.target.value)}
                                onKeyDown={handleKeyDown}
                                rows={1}
                                placeholder={agentMode ? "Ask the agent to create something…" : "What do you want to create?"}
                                className="w-full bg-transparent text-white placeholder-gray-500 text-[15px] leading-relaxed resize-none outline-none min-h-[28px] max-h-48"
                                style={{ scrollbarWidth: "none" }}
                                disabled={isGenerating}
                            />
                        </div>

                        {/* Footer row */}
                        <div className="flex items-center gap-2 px-3 pb-3">
                            {/* + button */}
                            <div className="relative">
                                <button
                                    onClick={() => setShowPlusMenu(v => !v)}
                                    className="w-9 h-9 rounded-full bg-[#2A2A2A] hover:bg-[#333] text-gray-400 hover:text-white flex items-center justify-center transition-colors flex-shrink-0"
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                        <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                                    </svg>
                                </button>
                                {showPlusMenu && (
                                    <PlusMenu
                                        onClose={() => setShowPlusMenu(false)}
                                        onUploadImage={file => { handleImageFile(file); }}
                                        onUploadVideo={file => onAttachVideo(URL.createObjectURL(file))}
                                        onManageCharacters={onManageCharacters}
                                    />
                                )}
                            </div>

                            {/* Agent toggle */}
                            <button
                                onClick={onToggleAgentMode}
                                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors flex-shrink-0 ${
                                    agentMode
                                        ? "bg-green-500 text-black"
                                        : "bg-[#2A2A2A] text-gray-300 hover:text-white"
                                }`}
                            >
                                Agent
                            </button>

                            <div className="flex-1" />

                            {/* Combined model chip — opens popup */}
                            <div className="relative">
                                <button
                                    onClick={() => setShowPopup(v => !v)}
                                    className="flex items-center gap-2 px-3 h-9 rounded-full bg-[#2A2A2A] hover:bg-[#333] text-gray-200 hover:text-white transition-colors text-sm font-medium flex-shrink-0"
                                    title="Generation settings"
                                >
                                    <span>{modelMeta.emoji}</span>
                                    <span>{modelMeta.name}</span>
                                    <RatioShape aspectRatio={settings.aspectRatio} />
                                    <span className="text-gray-500 text-xs">{quantityLabel}</span>
                                </button>
                                {showPopup && (
                                    <GenerationPopup
                                        settings={settings}
                                        onChange={onSettingsChange}
                                        onClose={() => setShowPopup(false)}
                                        characters={characters}
                                        creditBalance={creditBalance}
                                    />
                                )}
                            </div>

                            {/* Send button */}
                            <button
                                onClick={onSubmit}
                                disabled={isGenerating || !prompt.trim()}
                                className="w-9 h-9 rounded-full bg-[#2A2A2A] disabled:opacity-40 hover:bg-[#333] text-white flex items-center justify-center transition-colors flex-shrink-0"
                            >
                                {isGenerating
                                    ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                    : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                                      </svg>
                                }
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
