-- Migration: Add Image and Video History Tables
-- This migration adds persistent storage for user-generated images and videos

-- ============================================
-- Images Table
-- ============================================
CREATE TABLE IF NOT EXISTS generated_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  url TEXT NOT NULL,
  prompt TEXT NOT NULL,
  model TEXT NOT NULL,           -- 'flash' | 'pro'
  quality TEXT NOT NULL,         -- '1K' | '2K' | '4K'
  aspect_ratio TEXT NOT NULL,
  r2_key TEXT,                   -- R2 storage key for deletion
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_generated_images_user_id ON generated_images(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_images_created_at ON generated_images(created_at DESC);

-- ============================================
-- Videos Table
-- ============================================
CREATE TABLE IF NOT EXISTS generated_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  url TEXT NOT NULL,
  prompt TEXT NOT NULL,
  duration INTEGER NOT NULL,
  source TEXT NOT NULL DEFAULT 'veo',  -- 'veo' | 'kling'
  aspect_ratio TEXT,
  r2_key TEXT,                   -- R2 storage key for deletion
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_generated_videos_user_id ON generated_videos(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_videos_created_at ON generated_videos(created_at DESC);

-- ============================================
-- Enable Row Level Security
-- ============================================
ALTER TABLE generated_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_videos ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS Policies for generated_images
-- ============================================
DROP POLICY IF EXISTS "Users can view own images" ON generated_images;
CREATE POLICY "Users can view own images" ON generated_images
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own images" ON generated_images;
CREATE POLICY "Users can insert own images" ON generated_images
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own images" ON generated_images;
CREATE POLICY "Users can delete own images" ON generated_images
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- RLS Policies for generated_videos
-- ============================================
DROP POLICY IF EXISTS "Users can view own videos" ON generated_videos;
CREATE POLICY "Users can view own videos" ON generated_videos
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own videos" ON generated_videos;
CREATE POLICY "Users can insert own videos" ON generated_videos
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own videos" ON generated_videos;
CREATE POLICY "Users can delete own videos" ON generated_videos
  FOR DELETE USING (auth.uid() = user_id);
