"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/context/AuthContext";
import { useCsrfToken } from "@/lib/useCsrfToken";
import StudioLayout from "@/components/studio/StudioLayout";
import {
    StudioAsset,
    GenerationSettings,
    Character,
    AspectRatio,
    GenerationMode,
    Quantity,
} from "@/lib/types";

const DEFAULT_SETTINGS: GenerationSettings = {
    mode: "image",
    aspectRatio: "1:1",
    quantity: 1,
    quality: "1K",
    model: "pro",
    selectedCharacterIds: [],
    attachedImages: [],
};

export default function StudioPage() {
    const router = useRouter();
    const { user, isLoading: authLoading } = useAuth();
    const { csrfToken } = useCsrfToken();

    // ── State ────────────────────────────────────────────────────────────────
    const [currentAsset, setCurrentAsset] = useState<StudioAsset | null>(null);
    const [sessionHistory, setSessionHistory] = useState<StudioAsset[]>([]);
    const [settings, setSettings] = useState<GenerationSettings>(DEFAULT_SETTINGS);
    const [agentMode, setAgentMode] = useState(false);
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
    const [characters, setCharacters] = useState<Character[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [progress, setProgress] = useState("");
    const [prompt, setPrompt] = useState("");
    const [showRail, setShowRail] = useState(false);

    // ── Auth gate ────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!authLoading && !user) {
            router.replace("/");
        }
    }, [authLoading, user, router]);

    // ── Load characters ──────────────────────────────────────────────────────
    useEffect(() => {
        if (!user) return;
        fetch("/api/characters")
            .then((r) => r.json())
            .then((d) => {
                if (d.characters) setCharacters(d.characters);
            })
            .catch(() => {});
    }, [user]);

    // ── Load history from DB on mount ────────────────────────────────────────
    useEffect(() => {
        if (!user) return;

        Promise.all([
            fetch("/api/history/images").then((r) => r.json()),
            fetch("/api/history/videos").then((r) => r.json()),
        ])
            .then(([imgData, vidData]) => {
                const images: StudioAsset[] = (imgData.images ?? []).map(
                    (img: { id: string; url: string; prompt: string; timestamp: number; aspectRatio?: string }) => ({
                        id: img.id,
                        type: "image" as const,
                        url: img.url,
                        prompt: img.prompt,
                        timestamp: img.timestamp,
                        aspectRatio: img.aspectRatio,
                    })
                );

                const videos: StudioAsset[] = (vidData.videos ?? []).map(
                    (vid: { id: string; url: string; prompt: string; timestamp: number; aspectRatio?: string; googleVideoUri?: string; duration?: number }) => ({
                        id: vid.id,
                        type: "video" as const,
                        url: vid.url,
                        prompt: vid.prompt,
                        timestamp: vid.timestamp,
                        aspectRatio: vid.aspectRatio,
                        googleVideoUri: vid.googleVideoUri ?? undefined,
                        duration: vid.duration,
                    })
                );

                const merged = [...images, ...videos]
                    .sort((a, b) => b.timestamp - a.timestamp)
                    .slice(0, 50);

                if (merged.length > 0) {
                    setSessionHistory(merged);
                    setCurrentAsset(merged[0]);
                    setShowRail(true);
                }
            })
            .catch(() => {});
    }, [user]);

    // ── Helpers ──────────────────────────────────────────────────────────────
    const addAsset = useCallback((asset: StudioAsset) => {
        setCurrentAsset(asset);
        setSessionHistory((prev) => [asset, ...prev].slice(0, 50));
    }, []);

    const deleteAsset = useCallback(async (asset: StudioAsset) => {
        // Optimistic remove from local state
        setSessionHistory(prev => prev.filter(a => a.id !== asset.id));
        setCurrentAsset(prev => (prev?.id === asset.id ? null : prev));
        // Persist to DB (best-effort)
        const endpoint = asset.type === "image"
            ? `/api/history/images?id=${encodeURIComponent(asset.id)}`
            : `/api/history/videos?id=${encodeURIComponent(asset.id)}`;
        try { await fetch(endpoint, { method: "DELETE" }); } catch { /* ignore */ }
    }, []);

    const updateSettings = useCallback((patch: Partial<GenerationSettings>) => {
        setSettings((prev) => ({ ...prev, ...patch }));
    }, []);

    if (authLoading) {
        return (
            <div className="h-screen w-screen bg-[#0A0A0A] flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!user) return null;

    return (
        <StudioLayout
            // Canvas
            currentAsset={currentAsset}
            onAssetSelect={setCurrentAsset}
            // Rail
            sessionHistory={sessionHistory}
            showRail={showRail}
            onToggleRail={() => setShowRail((v) => !v)}
            // Agent mode
            agentMode={agentMode}
            activeSessionId={activeSessionId}
            onSessionChange={setActiveSessionId}
            // Bottom bar
            prompt={prompt}
            onPromptChange={setPrompt}
            settings={settings}
            onSettingsChange={updateSettings}
            onToggleAgentMode={() => setAgentMode((v) => !v)}
            // Generation state
            isGenerating={isGenerating}
            progress={progress}
            // Characters
            characters={characters}
            onCharactersChange={setCharacters}
            // Callbacks
            onAddAsset={addAsset}
            onDeleteAsset={deleteAsset}
            setIsGenerating={setIsGenerating}
            setProgress={setProgress}
            csrfToken={csrfToken}
        />
    );
}
