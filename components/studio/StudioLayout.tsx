"use client";

import { useState, useCallback, useRef } from "react";
import Canvas from "./Canvas";
import HistoryRail from "./HistoryRail";
import BottomBar from "./BottomBar";
import StudioSidebar from "./StudioSidebar";
import StudioTopBar from "./StudioTopBar";
import ImageDetailView from "./ImageDetailView";
import VideoDetailView from "./VideoDetailView";
import { StudioAsset, GenerationSettings, Character } from "@/lib/types";

interface StudioLayoutProps {
    currentAsset: StudioAsset | null;
    onAssetSelect: (asset: StudioAsset) => void;
    sessionHistory: StudioAsset[];
    showRail: boolean;
    onToggleRail: () => void;
    agentMode: boolean;
    activeSessionId: string | null;
    onSessionChange: (id: string | null) => void;
    prompt: string;
    onPromptChange: (v: string) => void;
    settings: GenerationSettings;
    onSettingsChange: (patch: Partial<GenerationSettings>) => void;
    onToggleAgentMode: () => void;
    isGenerating: boolean;
    progress: string;
    characters: Character[];
    onCharactersChange: (chars: Character[]) => void;
    onAddAsset: (asset: StudioAsset) => void;
    onDeleteAsset: (asset: StudioAsset) => void;
    setIsGenerating: (v: boolean) => void;
    setProgress: (v: string) => void;
    csrfToken: string | null;
}

export default function StudioLayout({
    currentAsset, onAssetSelect,
    sessionHistory, showRail, onToggleRail,
    agentMode, onToggleAgentMode,
    prompt, onPromptChange,
    settings, onSettingsChange,
    isGenerating, progress,
    characters,
    onAddAsset, onDeleteAsset,
    setIsGenerating, setProgress,
    csrfToken,
}: StudioLayoutProps) {
    const [sidebarTab, setSidebarTab] = useState<"all-media" | "images" | "videos" | "characters" | "scenes" | "tools">("all-media");
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<number | null>(null);
    const [batchAssets, setBatchAssets] = useState<StudioAsset[]>([]);
    const [thinkingStep, setThinkingStep] = useState<string | null>(null);
    const abortRef = useRef<AbortController | null>(null);
    const [detailAsset, setDetailAsset] = useState<StudioAsset | null>(null);

    const handleStop = useCallback(() => {
        abortRef.current?.abort();
        setIsGenerating(false);
        setThinkingStep(null);
        setProgress("");
    }, [setIsGenerating, setProgress]);

    // ── T28: Image generation ──────────────────────────────────────────────────
    const handleImageGeneration = useCallback(async () => {
        setIsGenerating(true);
        abortRef.current = new AbortController();
        const { signal } = abortRef.current;

        setThinkingStep("Analyzing Prompt");
        setProgress(`Generating ${settings.quantity} image${settings.quantity > 1 ? "s" : ""}…`);

        try {
            // Kick off API calls immediately so they run in parallel with the thinking steps
            const callsPromise = Promise.all(
                Array.from({ length: settings.quantity }, () =>
                    fetch("/api/generate-image", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "x-csrf-token": csrfToken ?? "",
                        },
                        body: JSON.stringify({
                            prompt,
                            model: (settings.model === "veo-fast" || settings.model === "veo-pro")
                                ? "pro"
                                : (settings.model as "flash" | "pro") ?? "pro",
                            quality: settings.quality ?? "1K",
                            aspectRatio: settings.aspectRatio,
                        }),
                        signal,
                    }).then(r => r.json())
                )
            );

            // Cycle through visible thinking steps while the API call runs
            await new Promise(r => setTimeout(r, 1500));
            setThinkingStep("Defining Visual Parameters");

            await new Promise(r => setTimeout(r, 2000));
            setThinkingStep("Rendering Image");

            // Now wait for the actual API response
            const results = await callsPromise;

            setThinkingStep("Saving to Gallery");
            const batch: StudioAsset[] = [];

            for (const result of results) {
                if (result.imageUrl) {
                    const asset: StudioAsset = {
                        id: `asset-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                        type: "image",
                        url: result.imageUrl,
                        prompt,
                        timestamp: Date.now(),
                        aspectRatio: settings.aspectRatio,
                    };
                    batch.push(asset);
                    onAddAsset(asset);
                } else if (result.error) {
                    console.error("Image generation error:", result.error);
                }
            }

            if (batch.length > 0) setBatchAssets(prev => [...prev, ...batch]);
        } catch (err) {
            if (!(err instanceof Error && err.name === "AbortError")) {
                console.error("Image generation failed:", err);
            }
        } finally {
            setThinkingStep(null);
            setIsGenerating(false);
            abortRef.current = null;
            setProgress("");
        }
    }, [prompt, settings, csrfToken, onAddAsset, setIsGenerating, setProgress]);

    // ── T29: Video generation ──────────────────────────────────────────────────
    const handleVideoGeneration = useCallback(async () => {
        setIsGenerating(true);
        setProgress("Starting video generation…");
        setBatchAssets([]);

        try {
            const startRes = await fetch("/api/generate-veo-video", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-csrf-token": csrfToken ?? "",
                },
                body: JSON.stringify({
                    prompt,
                    aspectRatio: settings.aspectRatio,
                    duration: 6,
                    resolution: "720p",
                }),
            });

            const startData = await startRes.json();

            if (!startRes.ok) {
                throw new Error(startData.error || "Failed to start video generation");
            }

            // Gemini provider: video is ready immediately
            if (startData.success && startData.videoUrl) {
                const asset: StudioAsset = {
                    id: `asset-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                    type: "video",
                    url: startData.videoUrl,
                    prompt,
                    timestamp: Date.now(),
                    aspectRatio: settings.aspectRatio,
                    googleVideoUri: startData.googleVideoUri,
                    duration: 6,
                };
                onAddAsset(asset);
                setBatchAssets([asset]);
                return;
            }

            // Vertex provider: poll until done
            if (startData.async && startData.operationName) {
                const operationName: string = startData.operationName;
                const duration: number = startData.duration ?? 6;
                let elapsed = 0;
                const maxWait = 600; // 10 min

                while (elapsed < maxWait) {
                    await new Promise(r => setTimeout(r, 10000));
                    elapsed += 10;
                    setProgress(`Generating video… (${elapsed}s)`);

                    const pollRes = await fetch("/api/generate-veo-video/poll", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "x-csrf-token": csrfToken ?? "",
                        },
                        body: JSON.stringify({
                            operationName,
                            prompt,
                            duration,
                            aspectRatio: settings.aspectRatio,
                        }),
                    });

                    const pollData = await pollRes.json();

                    if (pollData.error) throw new Error(pollData.error);

                    if (pollData.done && pollData.videoUrl) {
                        const asset: StudioAsset = {
                            id: `asset-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                            type: "video",
                            url: pollData.videoUrl,
                            prompt,
                            timestamp: Date.now(),
                            aspectRatio: settings.aspectRatio,
                            duration,
                        };
                        onAddAsset(asset);
                        setBatchAssets([asset]);
                        return;
                    }
                }

                throw new Error("Video generation timed out after 10 minutes.");
            }

            throw new Error("Unexpected response from video API");
        } catch (err) {
            console.error("Video generation failed:", err);
            setProgress(err instanceof Error ? err.message : "Generation failed");
            await new Promise(r => setTimeout(r, 3000));
        } finally {
            setIsGenerating(false);
            setProgress("");
        }
    }, [prompt, settings, csrfToken, onAddAsset, setIsGenerating, setProgress]);

    // ── T30: Frames mode (image-to-video from start frame) ────────────────────
    const handleFramesGeneration = useCallback(async () => {
        if (!settings.startFrameBase64) {
            setProgress("Please upload a start frame image first.");
            await new Promise(r => setTimeout(r, 2500));
            setProgress("");
            return;
        }

        setIsGenerating(true);
        setProgress("Starting frames generation…");
        setBatchAssets([]);

        try {
            // Strip data: URI prefix before sending
            const imageBase64 = settings.startFrameBase64.replace(/^data:[^;]+;base64,/, "");
            const mimeMatch = settings.startFrameBase64.match(/^data:([^;]+);base64,/);
            const imageMimeType = mimeMatch?.[1] ?? "image/jpeg";

            const startRes = await fetch("/api/generate-veo-video", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-csrf-token": csrfToken ?? "",
                },
                body: JSON.stringify({
                    prompt: prompt || "",
                    aspectRatio: settings.aspectRatio,
                    duration: 6,
                    resolution: "720p",
                    imageBase64,
                    imageMimeType,
                }),
            });

            const startData = await startRes.json();

            if (!startRes.ok) {
                throw new Error(startData.error || "Failed to start frames generation");
            }

            // Gemini provider: video ready immediately
            if (startData.success && startData.videoUrl) {
                const asset: StudioAsset = {
                    id: `asset-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                    type: "video",
                    url: startData.videoUrl,
                    prompt,
                    timestamp: Date.now(),
                    aspectRatio: settings.aspectRatio,
                    googleVideoUri: startData.googleVideoUri,
                    duration: 6,
                };
                onAddAsset(asset);
                setBatchAssets([asset]);
                return;
            }

            // Vertex provider: poll
            if (startData.async && startData.operationName) {
                const operationName: string = startData.operationName;
                const duration: number = startData.duration ?? 6;
                let elapsed = 0;
                const maxWait = 600;

                while (elapsed < maxWait) {
                    await new Promise(r => setTimeout(r, 10000));
                    elapsed += 10;
                    setProgress(`Animating frame… (${elapsed}s)`);

                    const pollRes = await fetch("/api/generate-veo-video/poll", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "x-csrf-token": csrfToken ?? "",
                        },
                        body: JSON.stringify({ operationName, prompt, duration, aspectRatio: settings.aspectRatio }),
                    });

                    const pollData = await pollRes.json();
                    if (pollData.error) throw new Error(pollData.error);

                    if (pollData.done && pollData.videoUrl) {
                        const asset: StudioAsset = {
                            id: `asset-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                            type: "video",
                            url: pollData.videoUrl,
                            prompt,
                            timestamp: Date.now(),
                            aspectRatio: settings.aspectRatio,
                            duration,
                        };
                        onAddAsset(asset);
                        setBatchAssets([asset]);
                        return;
                    }
                }
                throw new Error("Frames generation timed out after 10 minutes.");
            }

            throw new Error("Unexpected response from video API");
        } catch (err) {
            console.error("Frames generation failed:", err);
            setProgress(err instanceof Error ? err.message : "Generation failed");
            await new Promise(r => setTimeout(r, 3000));
        } finally {
            setIsGenerating(false);
            setProgress("");
        }
    }, [prompt, settings, csrfToken, onAddAsset, setIsGenerating, setProgress]);

    // ── Dispatch ───────────────────────────────────────────────────────────────
    function handleSubmit() {
        if (isGenerating) return;
        if (settings.mode !== "frames" && !prompt.trim()) return;

        if (settings.mode === "image") {
            handleImageGeneration();
        } else if (settings.mode === "video") {
            handleVideoGeneration();
        } else if (settings.mode === "frames") {
            handleFramesGeneration();
        }
    }

    const canvasAssets = batchAssets.length > 1 ? batchAssets : undefined;
    const canvasAsset = batchAssets.length === 1 ? batchAssets[0] : currentAsset;
    const galleryFilter: "all" | "images" | "videos" =
        sidebarTab === "images" ? "images" :
        sidebarTab === "videos" ? "videos" : "all";

    return (
        <div className="h-full w-full flex flex-col bg-black">

            {/* ── Global top bar ────────────────────────────────────────── */}
            <StudioTopBar />

            {/* ── Body: sidebar + canvas ────────────────────────────────── */}
            <div className="flex flex-1 min-h-0">

                {/* Left sidebar */}
                {!sidebarCollapsed && (
                    <StudioSidebar
                        activeTab={sidebarTab}
                        onTabChange={setSidebarTab}
                        onCollapse={() => setSidebarCollapsed(true)}
                    />
                )}

                {/* Collapsed restore button */}
                {sidebarCollapsed && (
                    <button
                        onClick={() => setSidebarCollapsed(false)}
                        className="absolute top-14 left-3 z-20 w-8 h-8 bg-[#111] border border-[#222] rounded-lg flex items-center justify-center text-gray-500 hover:text-white transition-colors"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="13 17 18 12 13 7" /><polyline points="6 17 11 12 6 7" />
                        </svg>
                    </button>
                )}

                {/* Main area: canvas + bottom bar */}
                <div className="flex-1 min-w-0 flex flex-col">
                    <div className="flex-1 min-h-0">
                        {(sidebarTab === "characters" || sidebarTab === "scenes" || sidebarTab === "tools") ? (
                            <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-center px-8">
                                <div className="w-12 h-12 rounded-2xl bg-[#1A1A1A] flex items-center justify-center text-gray-600 mb-1">
                                    {sidebarTab === "characters" && (
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" /></svg>
                                    )}
                                    {sidebarTab === "scenes" && (
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 2l-4 5-4-5" /></svg>
                                    )}
                                    {sidebarTab === "tools" && (
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M12 1v3M12 20v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M1 12h3M20 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" /></svg>
                                    )}
                                </div>
                                <p className="text-white text-sm font-medium capitalize">{sidebarTab}</p>
                                <p className="text-gray-600 text-xs">Coming soon</p>
                            </div>
                        ) : (
                            <Canvas
                                asset={canvasAsset}
                                assets={canvasAssets}
                                gallery={sessionHistory}
                                galleryFilter={galleryFilter}
                                isGenerating={isGenerating}
                                progress={progress}
                                uploadProgress={uploadProgress}
                                pendingCount={isGenerating && settings.mode === "image" ? settings.quantity : 0}
                                pendingAspectRatio={settings.aspectRatio}
                                onAssetClick={setDetailAsset}
                                onDeleteAsset={onDeleteAsset}
                            />
                        )}
                    </div>

                    <BottomBar
                        prompt={prompt}
                        onPromptChange={onPromptChange}
                        onSubmit={handleSubmit}
                        settings={settings}
                        onSettingsChange={onSettingsChange}
                        agentMode={agentMode}
                        onToggleAgentMode={onToggleAgentMode}
                        isGenerating={isGenerating}
                        characters={characters}
                        onManageCharacters={() => setSidebarTab("characters")}
                        onAttachImage={dataUrl => onSettingsChange({ attachedImages: [...settings.attachedImages, dataUrl] })}
                        onAttachVideo={() => {}}
                        onUploadProgress={setUploadProgress}
                        csrfToken={csrfToken}
                        thinkingStep={thinkingStep}
                        onStop={handleStop}
                    />
                </div>

            </div>

            {/* ── Image detail overlay ──────────────────────────────── */}
            {detailAsset?.type === "image" && (
                <ImageDetailView
                    asset={detailAsset}
                    onClose={() => setDetailAsset(null)}
                    onEditSubmit={(editPrompt) => {
                        onPromptChange(editPrompt);
                        setDetailAsset(null);
                    }}
                    modelLabel={settings.model === "flash" ? "Flash" : "Pro"}
                />
            )}

            {/* ── Video detail overlay ──────────────────────────────── */}
            {detailAsset?.type === "video" && (
                <VideoDetailView
                    asset={detailAsset}
                    relatedAssets={sessionHistory}
                    onClose={() => setDetailAsset(null)}
                    onEditSubmit={(editPrompt) => {
                        onPromptChange(editPrompt);
                        setDetailAsset(null);
                    }}
                    modelLabel={settings.model === "flash" ? "Flash" : "Pro"}
                />
            )}
        </div>
    );
}
