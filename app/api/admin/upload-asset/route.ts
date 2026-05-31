import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { uploadToR2 } from "@/lib/r2-storage";
import { withCsrfProtection } from "@/lib/csrf";

export const maxDuration = 30;

async function isUserAdmin(userId: string): Promise<boolean> {
  const adminSupabase = createAdminClient();
  const { data, error } = await adminSupabase
    .from("user_profiles")
    .select("is_admin")
    .eq("user_id", userId)
    .single();
  if (error || !data) return false;
  return data.is_admin === true;
}

const ALLOWED_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export async function POST(req: NextRequest) {
  return withCsrfProtection(req, async (request) => {
    try {
      const supabase = await createClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const isAdmin = await isUserAdmin(user.id);
      if (!isAdmin) {
        return NextResponse.json(
          { error: "Forbidden. Admin access required." },
          { status: 403 }
        );
      }

      const formData = await request.formData();
      const file = formData.get("file") as File | null;

      if (!file) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 });
      }

      const ext = ALLOWED_TYPES[file.type];
      if (!ext) {
        return NextResponse.json(
          { error: "Invalid file type. Allowed: PNG, JPG, WEBP, GIF." },
          { status: 400 }
        );
      }

      if (file.size > MAX_SIZE_BYTES) {
        return NextResponse.json(
          { error: "File too large. Maximum size is 10MB." },
          { status: 400 }
        );
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 8);
      const filename = `site-assets/${timestamp}-${randomStr}.${ext}`;

      const { url, key } = await uploadToR2(buffer, filename, file.type);

      return NextResponse.json({ url, key });
    } catch (error) {
      console.error("Error in /api/admin/upload-asset:", error);
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Upload failed" },
        { status: 500 }
      );
    }
  });
}
