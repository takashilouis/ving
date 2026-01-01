"use client";

import { useState, useEffect } from "react";
import LeftSidebar from "@/components/LeftSidebar";
import MiddlePanel from "@/components/MiddlePanel";
import VideoPreview from "@/components/VideoPreview";
import ApiKeySettings from "@/components/ApiKeySettings";
import { Preset } from "@/lib/presets";

interface GeneratedVideo {
  id: string;
  url: string;
  prompt: string;
  duration: number;
  timestamp: number;
}

interface ScriptClip {
  id: string;
  prompt: string;
  duration: number;
}

export default function Home() {
  const [sidebarTab, setSidebarTab] = useState("video");
  const [apiKey, setApiKey] = useState("");
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentVideo, setCurrentVideo] = useState<GeneratedVideo | null>(null);
  const [videoHistory, setVideoHistory] = useState<GeneratedVideo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string>("");
  const [selectedModel, setSelectedModel] = useState<"veo" | "kling">("veo");
  const [scriptClips, setScriptClips] = useState<ScriptClip[]>([]); // Persist scripts across tabs
  const [scriptIdea, setScriptIdea] = useState(""); // Persist idea across tabs

  // Load API key from localStorage on mount
  useEffect(() => {
    const savedKey = localStorage.getItem("gemini-api-key");
    if (savedKey) {
      setApiKey(savedKey);
    }
    // Note: Video history is NOT persisted because video blobs are too large for localStorage
  }, []);

  // Don't persist video history to localStorage - videos are blob URLs that can't be saved

  const handlePresetSelect = (preset: Preset) => {
    setPrompt(preset.prompt);
    setError(null);
  };

  const handleGenerate = async (aspectRatio: string = "16:9", duration: number = 6) => {
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
          duration,
          aspectRatio,
        }),
      });

      setProgress("Processing with Veo 3.1...");

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate video");
      }

      const newVideo: GeneratedVideo = {
        id: `video-${Date.now()}`,
        url: data.videoUrl,
        prompt: data.prompt,
        duration: data.duration,
        timestamp: Date.now(),
      };

      setCurrentVideo(newVideo);
      setVideoHistory((prev) => [newVideo, ...prev].slice(0, 20));
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

  // Handle generating a clip from Script Generator
  const handleGenerateClip = async (clipPrompt: string, clipDuration: number, aspectRatio: string) => {
    if (!apiKey || !clipPrompt.trim()) return;

    setIsGenerating(true);
    setError(null);
    setProgress(`Generating clip...`);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          apiKey,
          prompt: clipPrompt.trim(),
          duration: Math.min(Math.max(clipDuration, 4), 8), // Clamp to 4-8 seconds
          aspectRatio,
        }),
      });

      setProgress("Processing with Veo 3.1...");

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate video");
      }

      const newVideo: GeneratedVideo = {
        id: `video-${Date.now()}`,
        url: data.videoUrl,
        prompt: clipPrompt,
        duration: clipDuration,
        timestamp: Date.now(),
      };

      setCurrentVideo(newVideo);
      setVideoHistory((prev) => [newVideo, ...prev].slice(0, 20));
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

  const handleSelectHistoryVideo = (video: GeneratedVideo) => {
    setCurrentVideo(video);
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
          onGenerateClip={handleGenerateClip}
          prompt={prompt}
          isGenerating={isGenerating}
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
          scriptClips={scriptClips}
          onScriptClipsChange={setScriptClips}
          scriptIdea={scriptIdea}
          onScriptIdeaChange={setScriptIdea}
        />
      )}

      {/* Right Panel - Video Preview */}
      <VideoPreview
        video={currentVideo}
        isGenerating={isGenerating}
        progress={progress}
        videoHistory={videoHistory}
        onSelectVideo={handleSelectHistoryVideo}
      />
    </div>
  );
}
