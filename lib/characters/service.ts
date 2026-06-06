import { createAdminClient } from "@/lib/supabase/admin";
import { Character } from "@/lib/types";

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

export async function getCharacters(userId: string): Promise<Character[]> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
        .from("characters")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

    if (error) throw new Error(`Failed to fetch characters: ${error.message}`);
    return (data ?? []).map(rowToCharacter);
}

export interface ResolvedCharacterImage {
    base64: string;   // raw base64, no data: prefix — ready for Gemini inlineData
    mimeType: string;
}

export async function resolveCharacterImage(
    characterId: string,
    userId: string
): Promise<ResolvedCharacterImage> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
        .from("characters")
        .select("image_url")
        .eq("id", characterId)
        .eq("user_id", userId)
        .single();

    if (error || !data) throw new Error("Character not found or access denied.");

    const response = await fetch(data.image_url as string);
    if (!response.ok) throw new Error(`Failed to fetch character image: ${response.statusText}`);

    const arrayBuffer = await response.arrayBuffer();
    const mimeType = response.headers.get("content-type") || "image/png";
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    return { base64, mimeType };
}
