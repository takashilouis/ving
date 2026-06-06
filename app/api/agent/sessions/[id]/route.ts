import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { withCsrfProtection } from "@/lib/csrf";

// PATCH /api/agent/sessions/[id] — rename session title
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    return withCsrfProtection(request, async (req) => {
        try {
            const { id } = await params;

            const supabase = await createClient();
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            if (authError || !user) {
                return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
            }

            const { title } = await req.json() as { title?: string };
            if (!title?.trim()) {
                return NextResponse.json({ error: "Title is required." }, { status: 400 });
            }

            const adminSupabase = createAdminClient();
            const { data, error } = await adminSupabase
                .from("chat_sessions")
                .update({ title: title.trim(), updated_at: new Date().toISOString() })
                .eq("id", id)
                .eq("user_id", user.id)
                .select("id, title, updated_at")
                .single();

            if (error) {
                if (error.code === "PGRST116") {
                    return NextResponse.json({ error: "Session not found." }, { status: 404 });
                }
                throw new Error(error.message);
            }

            return NextResponse.json({
                session: { id: data.id, title: data.title, updatedAt: new Date(data.updated_at).getTime() },
            });
        } catch (error) {
            console.error("PATCH /api/agent/sessions/[id] error:", error);
            return NextResponse.json(
                { error: error instanceof Error ? error.message : "Failed to rename session" },
                { status: 500 }
            );
        }
    });
}

// DELETE /api/agent/sessions/[id] — delete session (messages cascade via FK)
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
                return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
            }

            const adminSupabase = createAdminClient();
            const { error } = await adminSupabase
                .from("chat_sessions")
                .delete()
                .eq("id", id)
                .eq("user_id", user.id);

            if (error) throw new Error(error.message);

            return NextResponse.json({ success: true });
        } catch (error) {
            console.error("DELETE /api/agent/sessions/[id] error:", error);
            return NextResponse.json(
                { error: error instanceof Error ? error.message : "Failed to delete session" },
                { status: 500 }
            );
        }
    });
}
