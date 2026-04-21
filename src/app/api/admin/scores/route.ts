import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

function isAdminRole(value: unknown): boolean {
  return value === "admin";
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const role = user.app_metadata?.role ?? user.user_metadata?.role;
  if (!isAdminRole(role)) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const search = request.nextUrl.searchParams.get("q")?.trim().toLowerCase() ?? "";
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("scores")
    .select("id,user_id,score_date,stableford_score,created_at,updated_at,users(email)")
    .order("score_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(300);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []).filter((row) => {
    if (!search) return true;
    const email = (Array.isArray(row.users) ? row.users[0]?.email : row.users?.email) ?? "";
    return (
      email.toLowerCase().includes(search) ||
      String(row.score_date).includes(search) ||
      String(row.stableford_score).includes(search)
    );
  });

  return NextResponse.json({ scores: rows });
}
