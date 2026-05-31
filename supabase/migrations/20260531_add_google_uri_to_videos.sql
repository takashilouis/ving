-- Migration: Store Google-hosted video URI for video extension
-- Google keeps generated videos for 2 days; the URI is required to extend them.
ALTER TABLE generated_videos
  ADD COLUMN IF NOT EXISTS google_uri TEXT;
