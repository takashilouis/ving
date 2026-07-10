"use client";

import { StudioAsset } from "@/lib/types";

interface HistoryRailProps {
    history: StudioAsset[];
    currentAssetId?: string;
    onAssetSelect: (asset: StudioAsset) => void;
    onHide: () => void;
}

function HistoryItem({ asset, selected, onClick }: { asset: StudioAsset; selected: boolean; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className={`w-full text-left group rounded-xl overflow-hidden transition-colors ${
                selected ? "ring-2 ring-white/30" : "hover:bg-[#1A1A1A]"
            }`}
        >
            {/* Thumbnail */}
            <div className="w-full aspect-[4/3] relative overflow-hidden rounded-xl bg-[#111]">
                {asset.type === "video" ? (
                    <video src={asset.url} muted playsInline className="w-full h-full object-cover" />
                ) : (
                    <img src={asset.url} alt={asset.prompt} className="w-full h-full object-cover" />
                )}
                {asset.type === "video" && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="bg-black/50 rounded-full p-1.5">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                        </div>
                    </div>
                )}
            </div>
            {/* Caption */}
            <p className="text-xs text-gray-400 group-hover:text-gray-200 transition-colors px-1 pt-1.5 pb-2 line-clamp-2 leading-relaxed">
                {asset.prompt}
            </p>
        </button>
    );
}

export default function HistoryRail({ history, currentAssetId, onAssetSelect, onHide }: HistoryRailProps) {
    return (
        <div className="flex flex-col h-full bg-[#0A0A0A] border-l border-[#1A1A1A]">
            <div className="flex-1 overflow-y-auto px-2 pt-2 space-y-1" style={{ scrollbarWidth: "none" }}>
                {history.length === 0 ? (
                    <div className="flex items-center justify-center h-32">
                        <p className="text-xs text-gray-600 text-center px-4">Your generations will appear here</p>
                    </div>
                ) : (
                    history.map(asset => (
                        <HistoryItem
                            key={asset.id}
                            asset={asset}
                            selected={asset.id === currentAssetId}
                            onClick={() => onAssetSelect(asset)}
                        />
                    ))
                )}
            </div>
        </div>
    );
}
