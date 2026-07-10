"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { StudioAsset } from "@/lib/types";

// ── Download helper ──────────────────────────────────────────────────────────
async function triggerDownload(url: string, filename: string) {
    try {
        const proxyUrl = `/api/download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`;
        const res = await fetch(proxyUrl);
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = blobUrl; a.download = filename;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
    } catch {
        window.open(url, "_blank");
    }
}

// ── Context menu dropdown ────────────────────────────────────────────────────
function CardMenu({
    url, filename, onDelete, onClose,
}: {
    url: string; filename: string; onDelete?: () => void; onClose: () => void;
}) {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (!ref.current?.contains(e.target as Node)) onClose();
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [onClose]);

    return (
        <div
            ref={ref}
            className="absolute top-9 right-0 z-50 bg-[#1C1C1C] border border-[#2A2A2A] rounded-2xl shadow-2xl w-48 py-1.5 overflow-hidden"
            onClick={e => e.stopPropagation()}
        >
            <button
                onClick={() => { triggerDownload(url, filename); onClose(); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-200 hover:bg-[#2A2A2A] transition-colors cursor-pointer text-left"
            >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Download
            </button>

            <div className="border-t border-[#2A2A2A] my-1" />

            <button
                onClick={() => { onDelete?.(); onClose(); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-[#2A2A2A] transition-colors cursor-pointer text-left"
            >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14H6L5 6" />
                    <path d="M10 11v6M14 11v6" />
                    <path d="M9 6V4h6v2" />
                </svg>
                Move to trash
            </button>
        </div>
    );
}

// ── Gallery card ─────────────────────────────────────────────────────────────
function GalleryCard({
    asset, onClick, onDelete,
}: {
    asset: StudioAsset;
    onClick: () => void;
    onDelete?: () => void;
}) {
    const [menuOpen, setMenuOpen] = useState(false);
    const cssRatio = asset.aspectRatio?.replace(":", "/") ?? "1/1";
    const filename = `ving-${asset.type}-${asset.timestamp}.${asset.type === "video" ? "mp4" : "png"}`;
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        const vid = videoRef.current;
        if (!vid) return;
        vid.play().catch(() => {});
    }, []);

    return (
        // No overflow-hidden here — lets the dropdown overflow the card boundary
        <div
            className="relative group cursor-pointer rounded-xl bg-[#111]"
            style={{ aspectRatio: cssRatio }}
            onClick={onClick}
        >
            {/* Media — clipped to rounded corners */}
            <div className="absolute inset-0 rounded-xl overflow-hidden">
                {asset.type === "video" ? (
                    <video ref={videoRef} src={asset.url} loop muted playsInline className="w-full h-full object-cover" />
                ) : (
                    <img src={asset.url} alt={asset.prompt} className="w-full h-full object-cover" loading="lazy" />
                )}
            </div>

            {/* Video badge */}
            {asset.type === "video" && (
                <div className="absolute top-2 left-2 z-10 w-7 h-7 bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center pointer-events-none">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                </div>
            )}

            {/* Hover action buttons — top right */}
            <div className="absolute top-1.5 right-1.5 z-20 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {/* More options (⋮) */}
                <div className="relative">
                    <button
                        onClick={e => { e.stopPropagation(); setMenuOpen(v => !v); }}
                        className="w-7 h-7 bg-black/70 hover:bg-black/90 text-white rounded-lg flex items-center justify-center cursor-pointer transition-colors"
                        title="More options"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
                        </svg>
                    </button>
                    {menuOpen && (
                        <CardMenu
                            url={asset.url}
                            filename={filename}
                            onDelete={onDelete}
                            onClose={() => setMenuOpen(false)}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}

// ── Placeholder card ─────────────────────────────────────────────────────────
function PlaceholderCard({ aspectRatio = "1:1" }: { aspectRatio?: string }) {
    const cssRatio = aspectRatio.replace(":", "/");
    return (
        <div
            className="relative rounded-xl overflow-hidden"
            style={{ aspectRatio: cssRatio }}
        >
            <div className="absolute inset-0 card-shimmer" />
        </div>
    );
}

// ── Grid container ───────────────────────────────────────────────────────────
function GridContainer({ children }: { children: React.ReactNode }) {
    return (
        <div className="w-full h-full overflow-auto p-4">
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                    gap: "8px",
                    alignItems: "start",
                }}
            >
                {children}
            </div>
        </div>
    );
}

// ── Props ────────────────────────────────────────────────────────────────────
interface CanvasProps {
    asset?: StudioAsset | null;
    assets?: StudioAsset[];
    gallery?: StudioAsset[];
    galleryFilter?: "all" | "images" | "videos";
    isGenerating?: boolean;
    progress?: string;
    uploadProgress?: number | null;
    pendingCount?: number;
    pendingAspectRatio?: string;
    onAssetClick?: (asset: StudioAsset) => void;
    onDeleteAsset?: (asset: StudioAsset) => void;
}

export default function Canvas({
    asset, gallery = [], galleryFilter = "all", isGenerating, progress,
    uploadProgress, pendingCount = 0, pendingAspectRatio,
    onAssetClick, onDeleteAsset,
}: CanvasProps) {
    const hasPendingImages = isGenerating && pendingCount > 0;

    const filteredGallery = galleryFilter === "images"
        ? gallery.filter(a => a.type === "image")
        : galleryFilter === "videos"
        ? gallery.filter(a => a.type === "video")
        : gallery;

    // ── Upload progress ──────────────────────────────────────────────────────
    if (uploadProgress !== null && uploadProgress !== undefined) {
        return (
            <div className="w-full h-full flex items-center justify-center p-8">
                <div className="relative rounded-2xl bg-[#1C1C1C] w-full max-w-2xl" style={{ aspectRatio: "4/3" }}>
                    <span className="absolute top-3 right-3 text-sm text-gray-500 tabular-nums">{uploadProgress}%</span>
                </div>
            </div>
        );
    }

    // ── Image generation: grid with placeholders ─────────────────────────────
    if (hasPendingImages) {
        return (
            <GridContainer>
                {Array.from({ length: pendingCount }, (_, i) => (
                    <PlaceholderCard key={`ph-${i}`} aspectRatio={pendingAspectRatio} />
                ))}
                {filteredGallery.map(a => (
                    <GalleryCard key={a.id} asset={a} onClick={() => onAssetClick?.(a)} onDelete={() => onDeleteAsset?.(a)} />
                ))}
            </GridContainer>
        );
    }

    // ── Video / frames generation: spinner ──────────────────────────────────
    if (isGenerating) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center gap-3">
                <div className="w-8 h-8 border-2 border-white/20 border-t-white/70 rounded-full animate-spin" />
                {progress && <p className="text-sm text-gray-500 max-w-xs text-center">{progress}</p>}
            </div>
        );
    }

    // ── Gallery ──────────────────────────────────────────────────────────────
    if (filteredGallery.length > 0) {
        return (
            <GridContainer>
                {filteredGallery.map(a => (
                    <GalleryCard key={a.id} asset={a} onClick={() => onAssetClick?.(a)} onDelete={() => onDeleteAsset?.(a)} />
                ))}
            </GridContainer>
        );
    }

    if (gallery.length > 0) {
        return (
            <div className="w-full h-full flex items-center justify-center">
                <p className="text-gray-600 text-sm select-none">No {galleryFilter === "videos" ? "videos" : "images"} yet</p>
            </div>
        );
    }

    // ── Single asset fallback ────────────────────────────────────────────────
    if (asset) {
        return (
            <div className="w-full h-full p-4 flex items-start justify-start overflow-auto cursor-pointer"
                onClick={() => onAssetClick?.(asset)}>
                <div className="relative group rounded-xl overflow-hidden bg-[#111]">
                    {asset.type === "video" ? (
                        <video src={asset.url} autoPlay loop muted playsInline className="object-contain rounded-xl" style={{ maxHeight: "70vh" }} />
                    ) : (
                        <img src={asset.url} alt={asset.prompt} className="object-contain rounded-xl" style={{ maxHeight: "70vh" }} />
                    )}
                </div>
            </div>
        );
    }

    // ── Empty state ──────────────────────────────────────────────────────────
    return (
        <div className="w-full h-full flex items-center justify-center">
            <p className="text-gray-700 text-sm select-none">What do you want to create?</p>
        </div>
    );
}
