"use client";

import { useState } from "react";
import LeftSidebar from "@/components/LeftSidebar";
import MiddlePanel from "@/components/MiddlePanel";
import VideoPreview from "@/components/VideoPreview";
import ImageGenerationPanel from "@/components/ImageGenerationPanel";
import ImagePreview from "@/components/ImagePreview";
import CreditBalance from "@/components/CreditBalance";
import AuthModal from "@/components/auth/AuthModal";
import { useCsrfToken, withCsrfToken } from "@/lib/useCsrfToken";
import { useAuth } from "@/lib/context/AuthContext";
import { GeneratedImage, FusionImage, FusionQuality } from "@/lib/types";


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

export default function Dashboard() {
  const { user, isLoading } = useAuth();
  const { csrfToken } = useCsrfToken();
  const [sidebarTab, setSidebarTab] = useState("video");
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentVideo, setCurrentVideo] = useState<GeneratedVideo | null>(null);
  const [videoHistory, setVideoHistory] = useState<GeneratedVideo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string>("");
  const [selectedModel, setSelectedModel] = useState<"veo" | "kling">("veo");
  const [scriptClips, setScriptClips] = useState<ScriptClip[]>([]);
  const [scriptIdea, setScriptIdea] = useState("");
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Image generation state
  const [currentImage, setCurrentImage] = useState<GeneratedImage | null>(null);
  const [imageHistory, setImageHistory] = useState<GeneratedImage[]>([]);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [imageProgress, setImageProgress] = useState("");

  // Fusion state (lifted to persist across tab switches)
  const [fusionImages, setFusionImages] = useState<FusionImage[]>([]);
  const [fusionPrompt, setFusionPrompt] = useState("");
  const [fusionAspectRatio, setFusionAspectRatio] = useState("16:9");
  const [fusionQuality, setFusionQuality] = useState<FusionQuality>("standard");

  //const handlePresetSelect = (preset: Preset) => {
  //  setPrompt(preset.prompt);
  //  setError(null);
  //};

  const handleGenerate = async (aspectRatio: string = "16:9", duration: number = 6) => {
    if (!prompt.trim()) return;

    // Check if user is authenticated
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    setIsGenerating(true);
    setError(null);
    setProgress("Starting video generation...");

    try {
      const response = await fetch("/api/generate", withCsrfToken(csrfToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          duration,
          aspectRatio,
        }),
      }));

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
      setError(err instanceof Error ? err.message : "An error occurred");
      setProgress("");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateClip = async (clipPrompt: string, clipDuration: number, aspectRatio: string) => {
    if (!clipPrompt.trim()) return;

    // Check if user is authenticated
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    setIsGenerating(true);
    setError(null);
    setProgress(`Generating clip...`);

    try {
      const response = await fetch("/api/generate", withCsrfToken(csrfToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: clipPrompt.trim(),
          duration: Math.min(Math.max(clipDuration, 4), 8),
          aspectRatio,
        }),
      }));

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
      setError(err instanceof Error ? err.message : "An error occurred");
      setProgress("");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleMotionVideoGenerated = (videoUrl: string, motionPrompt: string) => {
    const newVideo: GeneratedVideo = {
      id: `video-${Date.now()}`,
      url: videoUrl,
      prompt: motionPrompt,
      duration: 5,
      timestamp: Date.now(),
    };
    setCurrentVideo(newVideo);
    setVideoHistory((prev) => [newVideo, ...prev].slice(0, 20));
  };

  const handleSelectHistoryVideo = (video: GeneratedVideo) => {
    setCurrentVideo(video);
  };

  // Image generation handlers
  const handleImageGenerated = (image: GeneratedImage) => {
    setCurrentImage(image);
    setImageHistory((prev) => [image, ...prev].slice(0, 20));
  };

  const handleSelectHistoryImage = (image: GeneratedImage) => {
    setCurrentImage(image);
  };

  return (
    <>
      <div className="h-screen flex bg-[#0A0A0A] overflow-hidden">
        <LeftSidebar onTabChange={setSidebarTab} activeTab={sidebarTab} />

        {sidebarTab === "settings" ? (
          <>
            <div className="w-[370px] h-full overflow-y-auto bg-[#0A0A0A] border-r border-[#1A1A1A]">
              <CreditBalance />
            </div>
            <div className="flex-1 bg-[#0A0A0A]" />
          </>
        ) : sidebarTab === "image" ? (
          <>
            <ImageGenerationPanel
              onImageGenerated={handleImageGenerated}
              csrfToken={csrfToken}
              fusionImages={fusionImages}
              onFusionImagesChange={setFusionImages}
              fusionPrompt={fusionPrompt}
              onFusionPromptChange={setFusionPrompt}
              fusionAspectRatio={fusionAspectRatio}
              onFusionAspectRatioChange={setFusionAspectRatio}
              fusionQuality={fusionQuality}
              onFusionQualityChange={setFusionQuality}
            />
            <ImagePreview
              image={currentImage}
              isGenerating={isGeneratingImage}
              progress={imageProgress}
              imageHistory={imageHistory}
              onSelectImage={handleSelectHistoryImage}
            />
          </>
        ) : (
          <>
            <MiddlePanel
              onPromptChange={setPrompt}
              onGenerate={handleGenerate}
              onGenerateClip={handleGenerateClip}
              onMotionVideoGenerated={handleMotionVideoGenerated}
              prompt={prompt}
              isGenerating={isGenerating}
              selectedModel={selectedModel}
              onModelChange={setSelectedModel}
              scriptClips={scriptClips}
              onScriptClipsChange={setScriptClips}
              scriptIdea={scriptIdea}
              onScriptIdeaChange={setScriptIdea}
              csrfToken={csrfToken}
            />
            <VideoPreview
              video={currentVideo}
              isGenerating={isGenerating}
              progress={progress}
              videoHistory={videoHistory}
              onSelectVideo={handleSelectHistoryVideo}
            />
          </>
        )}
      </div>

      {/* Auth Modal - shown when guest tries to generate */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        defaultMode="signin"
      />
    </>
  );
}
