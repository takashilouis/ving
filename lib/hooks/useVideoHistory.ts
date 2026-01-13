'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/context/AuthContext'
import { GeneratedVideo } from '@/lib/types'

export function useVideoHistory() {
  const { user, isDemoMode } = useAuth()
  const [videos, setVideos] = useState<GeneratedVideo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load video history on mount (only for authenticated users)
  useEffect(() => {
    const loadHistory = async () => {
      if (isDemoMode) {
        // Demo mode: no persistence, start with empty array
        setVideos([])
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch('/api/user/video-history?limit=20')
        if (!response.ok) {
          throw new Error('Failed to load video history')
        }

        const data = await response.json()
        const mappedVideos: GeneratedVideo[] = data.map((record: any) => ({
          id: record.id,
          url: record.video_url,
          prompt: record.prompt,
          duration: record.duration,
          timestamp: new Date(record.created_at).getTime(),
        }))

        setVideos(mappedVideos)
      } catch (err) {
        console.error('Error loading video history:', err)
        setError(err instanceof Error ? err.message : 'Failed to load history')
      } finally {
        setIsLoading(false)
      }
    }

    loadHistory()
  }, [isDemoMode, user])

  const addVideo = async (video: GeneratedVideo) => {
    // Add to local state first (optimistic update)
    setVideos((prev) => {
      const updated = [video, ...prev]
      // For demo mode, limit to 20 videos
      return isDemoMode ? updated.slice(0, 20) : updated
    })

    // Persist to Supabase if authenticated
    if (!isDemoMode) {
      try {
        const response = await fetch('/api/user/video-history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            videoUrl: video.url,
            videoType: video.url.includes('klingai') ? 'kling-motion' : 'veo',
            prompt: video.prompt,
            duration: video.duration,
            aspectRatio: '16:9', // Default aspect ratio
            metadata: {
              timestamp: video.timestamp,
            },
          }),
        })

        if (!response.ok) {
          throw new Error('Failed to save video to history')
        }
      } catch (err) {
        console.error('Error saving video to history:', err)
        // Don't remove from local state even if save fails
        // User can still see it in current session
      }
    }
  }

  const deleteVideo = async (videoId: string) => {
    // Remove from local state first (optimistic update)
    setVideos((prev) => prev.filter((v) => v.id !== videoId))

    // Delete from Supabase if authenticated
    if (!isDemoMode) {
      try {
        const response = await fetch('/api/user/video-history', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ videoId }),
        })

        if (!response.ok) {
          throw new Error('Failed to delete video')
        }
      } catch (err) {
        console.error('Error deleting video:', err)
        // Could reload history here to resync with server
      }
    }
  }

  const clearHistory = () => {
    setVideos([])
    // For authenticated users, we could add a server-side clear endpoint
    // For now, just clear local state (useful when switching to demo mode)
  }

  return {
    videos,
    isLoading,
    error,
    addVideo,
    deleteVideo,
    clearHistory,
  }
}
