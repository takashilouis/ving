import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// GET - Fetch user's video history
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Fetch video history from database
    const { data: videos, error: fetchError } = await supabase
      .from('video_history')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (fetchError) {
      throw fetchError
    }

    return NextResponse.json(videos || [])
  } catch (error) {
    console.error('Error fetching video history:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch video history' },
      { status: 500 }
    )
  }
}

// POST - Save a new video to history
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { videoUrl, videoType, prompt, duration, aspectRatio, metadata } = await request.json()

    if (!videoUrl || !videoType || !prompt || !duration) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Validate video type
    const validVideoTypes = ['veo', 'kling-motion']
    if (!validVideoTypes.includes(videoType)) {
      return NextResponse.json({ error: 'Invalid video type' }, { status: 400 })
    }

    // Insert video record
    const { data: video, error: insertError } = await supabase
      .from('video_history')
      .insert({
        user_id: user.id,
        video_url: videoUrl,
        video_type: videoType,
        prompt,
        duration,
        aspect_ratio: aspectRatio || '16:9',
        metadata: metadata || {},
      })
      .select()
      .single()

    if (insertError) {
      throw insertError
    }

    return NextResponse.json(video)
  } catch (error) {
    console.error('Error saving video to history:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save video' },
      { status: 500 }
    )
  }
}

// DELETE - Soft delete a video (mark as deleted)
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { videoId } = await request.json()

    if (!videoId) {
      return NextResponse.json({ error: 'Missing video ID' }, { status: 400 })
    }

    // Soft delete the video
    const { error: deleteError } = await supabase
      .from('video_history')
      .update({ is_deleted: true })
      .eq('id', videoId)
      .eq('user_id', user.id)

    if (deleteError) {
      throw deleteError
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting video:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete video' },
      { status: 500 }
    )
  }
}
