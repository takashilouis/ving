"use client";

import { useState, useCallback, useEffect } from "react";
import LeftSidebar from "@/components/LeftSidebar";
import MiddlePanel from "@/components/MiddlePanel";
import VideoPreview from "@/components/VideoPreview";
import ApiKeySettings from "@/components/ApiKeySettings";
import { Preset } from "@/lib/presets";

export default function Home() {
  const [sidebarTab, setSidebarTab] = useState("gallery");
  const [apiKey, setApiKey] = useState("");
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentVideo, setCurrentVideo] = useState<{
    url: string;
    prompt: string;
    duration: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string>("");

  // Load API key from localStorage on mount
  useEffect(() => {
    const savedKey = localStorage.getItem("gemini-api-key");
    if (savedKey) {
      setApiKey(savedKey);
    }
  }, []);

  const handlePresetSelect = (preset: Preset) => {
    setPrompt(preset.prompt);
    setError(null);
  };

  const handleGenerate = async (aspectRatio: string = "16:9") => {
    if (!apiKey || !prompt.trim()) return;

    setIsGenerating(true);
    setError(null);
    setProgress("Starting video generation...");

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          apiKey,
          prompt: prompt.trim(),
          duration: 6, // Default 6s
          aspectRatio, // Pass aspect ratio to API
        }),
      });

      setProgress("Processing with Veo 3.1...");

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate video");
      }

      setCurrentVideo({
        url: data.videoUrl,
        prompt: data.prompt,
        duration: data.duration,
      });
      setProgress("");
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An error occurred";
      setError(errorMessage);
      setProgress("");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#0A0A0A]">
      {/* Left Sidebar - 60px */}
      <LeftSidebar onTabChange={setSidebarTab} activeTab={sidebarTab} />

      {/* Middle Panel - 370px */}
      {sidebarTab === "settings" ? (
        <div className="w-[370px] bg-[#0A0A0A] border-r border-[#1A1A1A]">
          <ApiKeySettings apiKey={apiKey} onApiKeyChange={setApiKey} />
        </div>
      ) : (
        <MiddlePanel
          apiKey={apiKey}
          onPresetSelect={handlePresetSelect}
          onPromptChange={setPrompt}
          onGenerate={handleGenerate}
          prompt={prompt}
          isGenerating={isGenerating}
        />
      )}

      {/* Right Panel - Video Preview */}
      <VideoPreview
        video={currentVideo}
        isGenerating={isGenerating}
        progress={progress}
      />
    </div>
  );
}
