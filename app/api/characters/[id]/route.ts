import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { deleteFromR2 } from "@/lib/r2-storage";
import { withCsrfProtection } from "@/lib/csrf";

// PUT /api/characters/[id] — update name and/or description
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    return withCsrfProtection(request, async (req) => {
        try {
            const { id } = await params;

            const supabase = await createClient();
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            if (authError || !user) {
                return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });
            }

            const body = await req.json();
            const { name, description } = body as { name?: string; description?: string };

            if (!name?.trim()) {
                return NextResponse.json({ error: "Character name is required." }, { status: 400 });
            }

            const adminSupabase = createAdminClient();
            const { data, error } = await adminSupabase
                .from("characters")
                .update({
                    name: name.trim(),
                    description: description?.trim() || null,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", id)
                .eq("user_id", user.id)  // ensure ownership
                .select("*")
                .single();

            if (error) {
                if (error.code === "PGRST116") {
                    return NextResponse.json({ error: "Character not found." }, { status: 404 });
                }
                throw new Error(error.message);
            }

            return NextResponse.json({
                character: {
                    id: data.id,
                    userId: data.user_id,
                    name: data.name,
                    description: data.description,
                    imageUrl: data.image_url,
                    thumbnailUrl: data.thumbnail_url,
                    tags: data.tags,
                    createdAt: new Date(data.created_at).getTime(),
                },
            });
        } catch (error) {
            console.error("PUT /api/characters/[id] error:", error);
            return NextResponse.json(
                { error: error instanceof Error ? error.message : "Failed to update character" },
                { status: 500 }
            );
        }
    });
}

// DELETE /api/characters/[id] — delete character + its R2 image (best-effort)
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    return withCsrfProtection(request, async () => {
        try {
            const { id } = await params;

            const supabase = await createClient();
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            if (authError || !user) {
                return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });
            }

            const adminSupabase = createAdminClient();

            // Fetch image_url first so we can clean up R2
            const { data: character, error: fetchError } = await adminSupabase
                .from("characters")
                .select("image_url")
                .eq("id", id)
                .eq("user_id", user.id)
                .single();

            if (fetchError || !character) {
                return NextResponse.json({ error: "Character not found." }, { status: 404 });
            }

            // Delete DB row
            const { error: deleteError } = await adminSupabase
                .from("characters")
                .delete()
                .eq("id", id)
                .eq("user_id", user.id);

            if (deleteError) throw new Error(deleteError.message);

            // Best-effort: delete from R2 by extracting the key from the public URL
            try {
                const publicUrl = process.env.R2_PUBLIC_URL;
                if (publicUrl && (character.image_url as string).startsWith(publicUrl)) {
                    const r2Key = (character.image_url as string).slice(publicUrl.length + 1);
                    await deleteFromR2(r2Key);
                }
            } catch (r2Error) {
                console.error("R2 deletion failed (non-fatal):", r2Error);
            }

            return NextResponse.json({ success: true });
        } catch (error) {
            console.error("DELETE /api/characters/[id] error:", error);
            return NextResponse.json(
                { error: error instanceof Error ? error.message : "Failed to delete character" },
                { status: 500 }
            );
        }
    });
}
