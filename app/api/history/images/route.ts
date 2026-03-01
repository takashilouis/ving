import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 30;

/**
 * GET /api/history/images
 * Returns the user's generated image history (limit 50)
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

        // Fetch user's images (limit 50, newest first)
        const { data: images, error: imagesError } = await supabase
            .from("generated_images")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(50);

        if (imagesError) {
            console.error("Error fetching images:", imagesError);
            return NextResponse.json(
                { error: "Failed to fetch images" },
                { status: 500 }
            );
        }

        // Transform to frontend format
        const transformedImages = (images || []).map((img) => ({
            id: img.id,
            url: img.url,
            prompt: img.prompt,
            model: img.model,
            quality: img.quality,
            aspectRatio: img.aspect_ratio,
            timestamp: new Date(img.created_at).getTime(),
        }));

        return NextResponse.json({ images: transformedImages });
    } catch (error) {
        console.error("Error in /api/history/images:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Internal server error" },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/history/images
 * Delete an image by ID
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
        const imageId = searchParams.get("id");

        if (!imageId) {
            return NextResponse.json({ error: "Image ID required" }, { status: 400 });
        }

        // Delete the image (RLS ensures user can only delete their own)
        const { error: deleteError } = await supabase
            .from("generated_images")
            .delete()
            .eq("id", imageId)
            .eq("user_id", user.id);

        if (deleteError) {
            console.error("Error deleting image:", deleteError);
            return NextResponse.json(
                { error: "Failed to delete image" },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error in DELETE /api/history/images:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Internal server error" },
            { status: 500 }
        );
    }
}
