"use client";

import { useState, useEffect } from "react";
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
  source?: string;
  aspectRatio?: string;
  resolution?: string;
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

  // Load history on mount
  useEffect(() => {
    const loadHistory = async () => {
      if (!user) return;

      try {
        // Load image history
        const imageRes = await fetch("/api/history/images");
        if (imageRes.ok) {
          const { images } = await imageRes.json();
          setImageHistory(images || []);
        }

        // Load video history
        const videoRes = await fetch("/api/history/videos");
        if (videoRes.ok) {
          const { videos } = await videoRes.json();
          setVideoHistory(videos || []);
        }
      } catch (error) {
        console.error("Failed to load history:", error);
      }
    };

    loadHistory();
  }, [user]);

  //const handlePresetSelect = (preset: Preset) => {
  //  setPrompt(preset.prompt);
  //  setError(null);
  //};

  // Shared polling logic for Vertex AI async generation.
  // Calls /api/generate-veo-video/poll every 15s until the video is ready.
  const pollForVideo = async (
    operationName: string,
    videoPrompt: string,
    videoDuration: number,
    videoAspectRatio: string
  ): Promise<GeneratedVideo> => {
    const POLL_INTERVAL = 15000;
    const MAX_WAIT_MS = 15 * 60 * 1000; // 15 minutes
    const startTime = Date.now();

    while (Date.now() - startTime < MAX_WAIT_MS) {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const mins = Math.floor(elapsed / 60);
      const secs = elapsed % 60;
      setProgress(`Generating with Veo 3.1... ${mins}m ${secs}s`);

      await new Promise((r) => setTimeout(r, POLL_INTERVAL));

      const pollRes = await fetch("/api/generate-veo-video/poll", withCsrfToken(csrfToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operationName,
          prompt: videoPrompt,
          duration: videoDuration,
          aspectRatio: videoAspectRatio,
        }),
      }));

      const pollData = await pollRes.json();
      if (!pollRes.ok) throw new Error(pollData.error || "Failed to check video status");

      if (pollData.done) {
        return {
          id: `video-${Date.now()}`,
          url: pollData.videoUrl,
          prompt: pollData.prompt,
          duration: pollData.duration,
          timestamp: Date.now(),
        };
      }
    }

    throw new Error("Video generation timed out after 15 minutes. Please try again.");
  };

  const handleGenerate = async (aspectRatio: string = "16:9", duration: number = 6, resolution: "720p" | "1080p" | "4k" = "720p") => {
    if (!prompt.trim()) return;

    if (!user) {
      setShowAuthModal(true);
      return;
    }

    setIsGenerating(true);
    setError(null);
    setProgress("Starting video generation...");

    try {
      const response = await fetch("/api/generate-veo-video", withCsrfToken(csrfToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim(), duration, aspectRatio, resolution }),
      }));

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to generate video");

      let newVideo: GeneratedVideo;

      if (data.async) {
        // Vertex AI: poll client-side
        newVideo = await pollForVideo(data.operationName, data.prompt, data.duration, data.aspectRatio);
      } else {
        // Gemini: video returned directly
        newVideo = {
          id: `video-${Date.now()}`,
          url: data.videoUrl,
          prompt: data.prompt,
          duration: data.duration,
          timestamp: Date.now(),
          source: "veo",
          aspectRatio,
          resolution,
        };
      }

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

  const handleGenerateClip = async (clipPrompt: string, clipDuration: number, aspectRatio: string, resolution: "720p" | "1080p" | "4k" = "720p") => {
    if (!clipPrompt.trim()) return;

    if (!user) {
      setShowAuthModal(true);
      return;
    }

    setIsGenerating(true);
    setError(null);
    setProgress("Starting clip generation...");

    const clampedDuration = Math.min(Math.max(clipDuration, 4), 8);

    try {
      const response = await fetch("/api/generate-veo-video", withCsrfToken(csrfToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: clipPrompt.trim(), duration: clampedDuration, aspectRatio, resolution }),
      }));

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to generate video");

      let newVideo: GeneratedVideo;

      if (data.async) {
        newVideo = await pollForVideo(data.operationName, data.prompt, data.duration, data.aspectRatio);
      } else {
        newVideo = {
          id: `video-${Date.now()}`,
          url: data.videoUrl,
          prompt: clipPrompt,
          duration: clipDuration,
          timestamp: Date.now(),
          source: "veo",
          aspectRatio,
          resolution,
        };
      }

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

  const handleGenerateImageToVideo = async (
    imageBase64: string,
    imageMimeType: string,
    prompt: string,
    aspectRatio: string,
    duration: number,
    resolution: "720p" | "1080p" | "4k"
  ) => {
    if (!user) { setShowAuthModal(true); return; }

    setIsGenerating(true);
    setError(null);
    setProgress("Starting image-to-video generation...");

    try {
      const response = await fetch("/api/generate-veo-video", withCsrfToken(csrfToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, duration, aspectRatio, resolution, imageBase64, imageMimeType }),
      }));

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to generate video");

      const newVideo: GeneratedVideo = {
        id: `video-${Date.now()}`,
        url: data.videoUrl,
        prompt: prompt || "Image to video",
        duration,
        timestamp: Date.now(),
        source: "veo",
        aspectRatio,
        resolution,
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
    setImageHistory((prev) => [image, ...prev].slice(0, 50));
  };

  const handleSelectHistoryImage = (image: GeneratedImage) => {
    setCurrentImage(image);
  };

  const handleDeleteImage = async (imageId: string) => {
    try {
      const res = await fetch(`/api/history/images?id=${imageId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setImageHistory((prev) => prev.filter((img) => img.id !== imageId));
        if (currentImage?.id === imageId) {
          setCurrentImage(null);
        }
      }
    } catch (error) {
      console.error("Failed to delete image:", error);
    }
  };

  const handleDeleteVideo = async (videoId: string) => {
    try {
      const res = await fetch(`/api/history/videos?id=${videoId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setVideoHistory((prev) => prev.filter((vid) => vid.id !== videoId));
        if (currentVideo?.id === videoId) {
          setCurrentVideo(null);
        }
      }
    } catch (error) {
      console.error("Failed to delete video:", error);
    }
  };

  return (
    <>
      <div className="h-screen flex bg-[#0A0A0A] overflow-hidden">
        <LeftSidebar onTabChange={setSidebarTab} activeTab={sidebarTab} />

        {sidebarTab === "credits" ? (
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
              onDeleteImage={handleDeleteImage}
            />
          </>
        ) : (
          <>
            <MiddlePanel
              onPromptChange={setPrompt}
              onGenerate={handleGenerate}
              onGenerateClip={handleGenerateClip}
              onGenerateImageToVideo={handleGenerateImageToVideo}
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
              onDeleteVideo={handleDeleteVideo}
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
