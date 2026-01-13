import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 30;

/**
 * GET /api/credits/balance
 * Returns the authenticated user's credit balance
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

    // Fetch user credits
    const { data: credits, error: creditsError } = await supabase
      .from("user_credits")
      .select("balance, total_earned, total_spent, updated_at")
      .eq("user_id", user.id)
      .single();

    if (creditsError) {
      console.error("Error fetching credits:", creditsError);
      return NextResponse.json(
        { error: "Failed to fetch credits" },
        { status: 500 }
      );
    }

    if (!credits) {
      return NextResponse.json(
        { error: "Credits not found. Contact support." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      balance: credits.balance,
      totalEarned: credits.total_earned,
      totalSpent: credits.total_spent,
      updatedAt: credits.updated_at,
    });
  } catch (error) {
    console.error("Error in /api/credits/balance:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
