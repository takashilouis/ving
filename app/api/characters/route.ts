import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { uploadToR2 } from "@/lib/r2-storage";
import { withCsrfProtection } from "@/lib/csrf";
import { Character } from "@/lib/types";

export const maxDuration = 60;

function rowToCharacter(row: Record<string, unknown>): Character {
    return {
        id: row.id as string,
        userId: row.user_id as string,
        name: row.name as string,
        description: row.description as string | undefined,
        imageUrl: row.image_url as string,
        thumbnailUrl: row.thumbnail_url as string | undefined,
        tags: row.tags as string[] | undefined,
        createdAt: new Date(row.created_at as string).getTime(),
    };
}

// GET /api/characters — list the authenticated user's characters
export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });
        }

        const adminSupabase = createAdminClient();
        const { data, error } = await adminSupabase
            .from("characters")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false });

        if (error) throw new Error(error.message);

        return NextResponse.json({ characters: (data ?? []).map(rowToCharacter) });
    } catch (error) {
        console.error("GET /api/characters error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to fetch characters" },
            { status: 500 }
        );
    }
}

// POST /api/characters — create a new character (multipart/form-data)
// Fields: image (File), name (string), description? (string)
export async function POST(request: NextRequest) {
    return withCsrfProtection(request, async () => {
        try {
            const supabase = await createClient();
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            if (authError || !user) {
                return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });
            }

            const formData = await request.formData();
            const imageFile = formData.get("image") as File | null;
            const name = (formData.get("name") as string | null)?.trim();
            const description = (formData.get("description") as string | null)?.trim() || undefined;

            if (!imageFile) {
                return NextResponse.json({ error: "Image file is required." }, { status: 400 });
            }
            if (!name) {
                return NextResponse.json({ error: "Character name is required." }, { status: 400 });
            }

            const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
            if (!allowedTypes.includes(imageFile.type)) {
                return NextResponse.json(
                    { error: "Invalid image type. Use JPEG, PNG, or WebP." },
                    { status: 400 }
                );
            }

            const maxSize = 10 * 1024 * 1024; // 10 MB
            if (imageFile.size > maxSize) {
                return NextResponse.json({ error: "Image must be under 10 MB." }, { status: 400 });
            }

            // Upload image to R2 under characters/{userId}/
            const ext = imageFile.type === "image/png" ? "png" : imageFile.type === "image/webp" ? "webp" : "jpg";
            const timestamp = Date.now();
            const randomStr = Math.random().toString(36).substring(2, 8);
            const filename = `characters/${user.id}/${timestamp}-${randomStr}.${ext}`;

            const imageBuffer = Buffer.from(await imageFile.arrayBuffer());
            const { url: imageUrl } = await uploadToR2(imageBuffer, filename, imageFile.type);

            // Insert DB row
            const adminSupabase = createAdminClient();
            const { data, error } = await adminSupabase
                .from("characters")
                .insert({
                    user_id: user.id,
                    name,
                    description: description || null,
                    image_url: imageUrl,
                })
                .select("*")
                .single();

            if (error) throw new Error(error.message);

            return NextResponse.json({ character: rowToCharacter(data as Record<string, unknown>) }, { status: 201 });
        } catch (error) {
            console.error("POST /api/characters error:", error);
            return NextResponse.json(
                { error: error instanceof Error ? error.message : "Failed to create character" },
                { status: 500 }
            );
        }
    });
}
