"use client";

import { useRef, useEffect } from "react";
import { GenerationSettings, AspectRatio, Quantity, Character } from "@/lib/types";

// ── Aspect ratio configs ───────────────────────────────────────────────────────

const IMAGE_RATIOS: { value: AspectRatio; w: number; h: number; label: string }[] = [
    { value: "16:9", w: 16, h: 9,  label: "16:9" },
    { value: "4:3",  w: 4,  h: 3,  label: "4:3"  },
    { value: "1:1",  w: 1,  h: 1,  label: "1:1"  },
    { value: "3:4",  w: 3,  h: 4,  label: "3:4"  },
    { value: "9:16", w: 9,  h: 16, label: "9:16" },
];

const VIDEO_RATIOS: { value: AspectRatio; w: number; h: number; label: string }[] = [
    { value: "9:16", w: 9,  h: 16, label: "9:16" },
    { value: "16:9", w: 16, h: 9,  label: "16:9" },
];

const QUANTITIES: Quantity[] = [1, 2, 3, 4];

// ── Sub-components ─────────────────────────────────────────────────────────────

function RatioBox({ w, h }: { w: number; h: number }) {
    const MAX = 22;
    const scale = MAX / Math.max(w, h);
    const bw = Math.max(8, Math.round(w * scale));
    const bh = Math.max(8, Math.round(h * scale));
    return (
        <div className="flex items-center justify-center" style={{ width: MAX, height: MAX }}>
            <div className="border-[1.5px] border-current rounded-[2px]" style={{ width: bw, height: bh }} />
        </div>
    );
}

// ── Main component ─────────────────────────────────────────────────────────────

interface GenerationPopupProps {
    settings: GenerationSettings;
    onChange: (patch: Partial<GenerationSettings>) => void;
    onClose: () => void;
    characters: Character[];
    creditBalance?: number;
}

export default function GenerationPopup({
    settings, onChange, onClose, characters, creditBalance,
}: GenerationPopupProps) {
    const ref = useRef<HTMLDivElement>(null);
    const isVideo = settings.mode === "video" || settings.mode === "frames";
    const ratios = isVideo ? VIDEO_RATIOS : IMAGE_RATIOS;

    // Per-image credit cost based on model + quality
    const perImageCost = isVideo ? 40 : (() => {
        const model = (settings.model === "flash") ? "flash" : "pro";
        const quality = (settings.quality as "1K" | "2K" | "4K") ?? "1K";
        const map: Record<string, number> = {
            "flash-1K": 1, "flash-2K": 1,
            "pro-1K": 1, "pro-2K": 2, "pro-4K": 3,
        };
        return map[`${model}-${quality}`] ?? 1;
    })();
    const cost = isVideo ? 40 : perImageCost * settings.quantity;

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        const onOut = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) onClose();
        };
        document.addEventListener("keydown", onKey);
        document.addEventListener("mousedown", onOut);
        return () => {
            document.removeEventListener("keydown", onKey);
            document.removeEventListener("mousedown", onOut);
        };
    }, [onClose]);

    return (
        <div
            ref={ref}
            className="absolute bottom-full mb-3 right-0 w-[300px] bg-[#1C1C1C] rounded-2xl shadow-2xl z-50 overflow-hidden border border-[#2A2A2A]"
        >
            {/* ── Row 1: Image / Video ─────────────────────────── */}
            <div className="flex gap-2 p-2 pb-0">
                {/* Image tab */}
                <button
                    onClick={() => onChange({ mode: "image" })}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-[15px] font-semibold transition-colors ${
                        !isVideo
                            ? "bg-white text-black"
                            : "bg-[#2A2A2A] text-gray-400 hover:text-white"
                    }`}
                >
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                    </svg>
                    Image
                </button>

                {/* Video tab */}
                <button
                    onClick={() => onChange({ mode: "video" })}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-[15px] font-semibold transition-colors ${
                        isVideo && settings.mode !== "frames"
                            ? "bg-white text-black"
                            : "bg-[#2A2A2A] text-gray-400 hover:text-white"
                    }`}
                >
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" stroke="none" />
                    </svg>
                    Video
                </button>
            </div>

            {/* ── Row 2: Frames / Ingredients (Video mode only) ─ */}
            {isVideo && (
                <div className="flex gap-2 px-2 pt-2 pb-0">
                    <button
                        onClick={() => onChange({ mode: "frames" })}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-[15px] font-semibold transition-colors ${
                            settings.mode === "frames"
                                ? "bg-white text-black"
                                : "bg-[#2A2A2A] text-gray-400 hover:text-white"
                        }`}
                    >
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="2" y="6" width="20" height="12" rx="2" />
                            <line x1="2" y1="10" x2="22" y2="10" />
                            <line x1="2" y1="14" x2="22" y2="14" />
                        </svg>
                        Frames
                    </button>
                    <button
                        onClick={() => onChange({ mode: "video" })}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-[15px] font-semibold transition-colors ${
                            settings.mode === "video"
                                ? "bg-white text-black"
                                : "bg-[#2A2A2A] text-gray-400 hover:text-white"
                        }`}
                    >
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 8H3" />
                            <path d="M21 12H3" />
                            <path d="M21 16H3" />
                            <rect x="2" y="4" width="20" height="16" rx="2" />
                        </svg>
                        Ingredients
                    </button>
                </div>
            )}

            {/* ── Aspect ratios ─────────────────────────────────── */}
            <div className={`flex gap-1.5 px-2 ${isVideo ? "pt-2" : "pt-2"}`}>
                {ratios.map(({ value, w, h, label }) => (
                    <button
                        key={value}
                        onClick={() => onChange({ aspectRatio: value })}
                        className={`flex-1 flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl text-xs font-medium transition-colors ${
                            settings.aspectRatio === value
                                ? "bg-[#3A3A3A] text-white"
                                : "bg-[#252525] text-gray-500 hover:text-gray-300"
                        }`}
                    >
                        <RatioBox w={w} h={h} />
                        {label}
                    </button>
                ))}
            </div>

            {/* ── Quantity ─────────────────────────────────────── */}
            <div className="flex gap-1.5 px-2 pt-1.5">
                {QUANTITIES.map((q) => (
                    <button
                        key={q}
                        onClick={() => onChange({ quantity: q })}
                        className={`flex-1 py-3 rounded-xl text-[15px] font-medium transition-colors ${
                            settings.quantity === q
                                ? "bg-[#3A3A3A] text-white"
                                : "bg-[#252525] text-gray-500 hover:text-gray-300"
                        }`}
                    >
                        {q === 1 ? "1x" : `x${q}`}
                    </button>
                ))}
            </div>

            {/* ── Quality (image mode only) ─────────────────────── */}
            {!isVideo && (() => {
                const isFlash = settings.model === "flash";
                const qualities: { value: "1K" | "2K" | "4K"; label: string; proOnly?: boolean }[] = [
                    { value: "1K", label: "1K" },
                    { value: "2K", label: "2K" },
                    { value: "4K", label: "4K", proOnly: true },
                ];
                return (
                    <div className="flex gap-1.5 px-2 pt-1.5">
                        {qualities.map(({ value, label, proOnly }) => {
                            const disabled = proOnly && isFlash;
                            const active = settings.quality === value;
                            return (
                                <button
                                    key={value}
                                    onClick={() => !disabled && onChange({ quality: value })}
                                    disabled={disabled}
                                    className={`flex-1 py-3 rounded-xl text-[15px] font-medium transition-colors ${
                                        disabled
                                            ? "bg-[#1E1E1E] text-gray-700 cursor-not-allowed"
                                            : active
                                            ? "bg-[#3A3A3A] text-white"
                                            : "bg-[#252525] text-gray-500 hover:text-gray-300"
                                    }`}
                                >
                                    {label}
                                </button>
                            );
                        })}
                    </div>
                );
            })()}

            {/* ── Model dropdown ────────────────────────────────── */}
            <div className="px-2 pt-1.5">
                <div className="relative">
                    <select
                        value={settings.model}
                        onChange={e => onChange({ model: e.target.value })}
                        className="w-full bg-transparent text-white text-[15px] font-medium py-3.5 px-4 rounded-xl appearance-none outline-none cursor-pointer border border-[#2A2A2A] hover:border-[#3A3A3A] transition-colors"
                    >
                        {isVideo ? (
                            <>
                                <option value="veo-fast">Veo 3.1 - Fast</option>
                                <option value="veo-pro">Veo 3.1 - Pro</option>
                            </>
                        ) : (
                            <>
                                <option value="flash">🍌 Nano Banana 2</option>
                                <option value="pro">✨ Nano Banana Pro</option>
                            </>
                        )}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="6 9 12 15 18 9" />
                        </svg>
                    </div>
                </div>
            </div>

            {/* ── Ingredients (character picker) ───────────────── */}
            {settings.mode === "video" && characters.length > 0 && (
                <div className="px-2 pt-1.5">
                    <div className="flex flex-wrap gap-1.5 p-3 bg-[#252525] rounded-xl">
                        {characters.map(c => {
                            const selected = settings.selectedCharacterIds.includes(c.id);
                            return (
                                <button
                                    key={c.id}
                                    onClick={() => onChange({
                                        selectedCharacterIds: selected
                                            ? settings.selectedCharacterIds.filter(id => id !== c.id)
                                            : [c.id],
                                    })}
                                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-colors ${
                                        selected ? "bg-white text-black" : "bg-[#333] text-gray-300 hover:text-white"
                                    }`}
                                >
                                    <img src={c.imageUrl} alt={c.name} className="w-4 h-4 rounded-full object-cover" />
                                    {c.name}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ── Credit cost ───────────────────────────────────── */}
            <div className="px-2 py-3 mt-1 border-t border-[#2A2A2A]">
                <p className="text-sm text-gray-400 text-center">
                    Generating will use{" "}
                    <span className="underline text-white">{cost} credits</span>
                </p>
            </div>
        </div>
    );
}
