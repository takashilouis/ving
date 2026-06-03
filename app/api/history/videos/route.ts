import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 30;

/**
 * GET /api/history/videos
 * Returns the user's generated video history (limit 50)
 */
export async function GET(req: NextRequest) {
    try {
        const supabase = await createClient();

        // Get authenticated user
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Fetch user's videos (limit 50, newest first)
        const { data: videos, error: videosError } = await supabase
            .from("generated_videos")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(50);

        if (videosError) {
            console.error("Error fetching videos:", videosError);
            return NextResponse.json(
                { error: "Failed to fetch videos" },
                { status: 500 }
            );
        }

        // Transform to frontend format
        const transformedVideos = (videos || []).map((vid) => ({
            id: vid.id,
            url: vid.url,
            prompt: vid.prompt,
            duration: vid.duration,
            source: vid.source,
            aspectRatio: vid.aspect_ratio,
            resolution: vid.resolution ?? null,
            googleVideoUri: vid.google_uri ?? null,
            timestamp: new Date(vid.created_at).getTime(),
        }));

        return NextResponse.json({ videos: transformedVideos });
    } catch (error) {
        console.error("Error in /api/history/videos:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Internal server error" },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/history/videos
 * Delete a video by ID
 */
export async function DELETE(req: NextRequest) {
    try {
        const supabase = await createClient();

        // Get authenticated user
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const videoId = searchParams.get("id");

        if (!videoId) {
            return NextResponse.json({ error: "Video ID required" }, { status: 400 });
        }

        // Delete the video (RLS ensures user can only delete their own)
        const { error: deleteError } = await supabase
            .from("generated_videos")
            .delete()
            .eq("id", videoId)
            .eq("user_id", user.id);

        if (deleteError) {
            console.error("Error deleting video:", deleteError);
            return NextResponse.json(
                { error: "Failed to delete video" },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error in DELETE /api/history/videos:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Internal server error" },
            { status: 500 }
        );
    }
}
