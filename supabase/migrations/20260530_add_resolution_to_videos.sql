-- Migration: Add resolution column to generated_videos
ALTER TABLE generated_videos
  ADD COLUMN IF NOT EXISTS resolution TEXT;
