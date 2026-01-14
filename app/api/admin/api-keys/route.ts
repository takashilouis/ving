import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { encryptApiKey, decryptApiKey } from "@/lib/supabase/encryption";
import { withCsrfProtection } from "@/lib/csrf";

export const maxDuration = 30;

/**
 * Helper function to check if user is admin
 */
async function isUserAdmin(userId: string): Promise<boolean> {
  const adminSupabase = createAdminClient();
  const { data, error } = await adminSupabase
    .from("user_profiles")
    .select("is_admin")
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    return false;
  }

  return data.is_admin === true;
}

/**
 * GET /api/admin/api-keys
 * Returns all admin API keys (encrypted keys are decrypted for admin viewing)
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

    // Check if user is admin
    const isAdmin = await isUserAdmin(user.id);
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Forbidden. Admin access required." },
        { status: 403 }
      );
    }

    // Fetch all API keys
    const adminSupabase = createAdminClient();
    const { data: keys, error: keysError } = await adminSupabase
      .from("admin_api_keys")
      .select("*")
      .order("key_type");

    if (keysError) {
      console.error("Error fetching admin API keys:", keysError);
      return NextResponse.json(
        { error: "Failed to fetch API keys" },
        { status: 500 }
      );
    }

    // Decrypt keys for admin viewing
    const decryptedKeys = keys.map((key) => ({
      id: key.id,
      keyType: key.key_type,
      decryptedKey: decryptApiKey(key.encrypted_key, "admin"),
      isActive: key.is_active,
      createdAt: key.created_at,
      updatedAt: key.updated_at,
    }));

    return NextResponse.json({ keys: decryptedKeys });
  } catch (error) {
    console.error("Error in /api/admin/api-keys GET:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/api-keys
 * Creates or updates an admin API key
 * Body: { keyType: string, apiKey: string }
 */
export async function POST(req: NextRequest) {
  return withCsrfProtection(req, async (request) => {
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

    // Check if user is admin
    const isAdmin = await isUserAdmin(user.id);
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Forbidden. Admin access required." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { keyType, apiKey } = body;

    if (!keyType || !apiKey) {
      return NextResponse.json(
        { error: "keyType and apiKey are required" },
        { status: 400 }
      );
    }

    // Validate key type
    const validKeyTypes = ["gemini", "kling_access", "kling_secret"];
    if (!validKeyTypes.includes(keyType)) {
      return NextResponse.json(
        { error: `Invalid keyType. Must be one of: ${validKeyTypes.join(", ")}` },
        { status: 400 }
      );
    }

    // Encrypt the API key
    const encryptedKey = encryptApiKey(apiKey, "admin");

    // Upsert the API key
    const adminSupabase = createAdminClient();
    const { data, error } = await adminSupabase
      .from("admin_api_keys")
      .upsert(
        {
          key_type: keyType,
          encrypted_key: encryptedKey,
          is_active: true,
          updated_at: new Date().toISOString(),
          created_by: user.id,
        },
        {
          onConflict: "key_type",
        }
      )
      .select()
      .single();

    if (error) {
      console.error("Error upserting admin API key:", error);
      return NextResponse.json(
        { error: "Failed to save API key" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `API key for ${keyType} saved successfully`,
      keyType,
    });
  } catch (error) {
    console.error("Error in /api/admin/api-keys POST:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
  });
}

/**
 * DELETE /api/admin/api-keys
 * Deactivates an admin API key
 * Body: { keyType: string }
 */
export async function DELETE(req: NextRequest) {
  return withCsrfProtection(req, async (request) => {
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

    // Check if user is admin
    const isAdmin = await isUserAdmin(user.id);
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Forbidden. Admin access required." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { keyType } = body;

    if (!keyType) {
      return NextResponse.json(
        { error: "keyType is required" },
        { status: 400 }
      );
    }

    // Deactivate the API key (don't delete, for audit purposes)
    const adminSupabase = createAdminClient();
    const { error } = await adminSupabase
      .from("admin_api_keys")
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq("key_type", keyType);

    if (error) {
      console.error("Error deactivating admin API key:", error);
      return NextResponse.json(
        { error: "Failed to deactivate API key" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `API key for ${keyType} deactivated successfully`,
    });
  } catch (error) {
    console.error("Error in /api/admin/api-keys DELETE:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
  });
}
