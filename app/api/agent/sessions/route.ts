import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { withCsrfProtection } from "@/lib/csrf";

// GET /api/agent/sessions — list user's chat sessions
export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
        }

        const adminSupabase = createAdminClient();
        const { data, error } = await adminSupabase
            .from("chat_sessions")
            .select("id, title, created_at, updated_at")
            .eq("user_id", user.id)
            .order("updated_at", { ascending: false });

        if (error) throw new Error(error.message);

        const sessions = (data ?? []).map((row) => ({
            id: row.id,
            userId: user.id,
            title: row.title,
            createdAt: new Date(row.created_at).getTime(),
            updatedAt: new Date(row.updated_at).getTime(),
        }));

        return NextResponse.json({ sessions });
    } catch (error) {
        console.error("GET /api/agent/sessions error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to fetch sessions" },
            { status: 500 }
        );
    }
}

// POST /api/agent/sessions — create a new chat session
export async function POST(request: NextRequest) {
    return withCsrfProtection(request, async () => {
        try {
            const supabase = await createClient();
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            if (authError || !user) {
                return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
            }

            const adminSupabase = createAdminClient();
            const { data, error } = await adminSupabase
                .from("chat_sessions")
                .insert({ user_id: user.id, title: "New Chat" })
                .select("id, title, created_at, updated_at")
                .single();

            if (error) throw new Error(error.message);

            return NextResponse.json(
                {
                    session: {
                        id: data.id,
                        userId: user.id,
                        title: data.title,
                        createdAt: new Date(data.created_at).getTime(),
                        updatedAt: new Date(data.updated_at).getTime(),
                    },
                },
                { status: 201 }
            );
        } catch (error) {
            console.error("POST /api/agent/sessions error:", error);
            return NextResponse.json(
                { error: error instanceof Error ? error.message : "Failed to create session" },
                { status: 500 }
            );
        }
    });
}
