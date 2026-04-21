import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

function isAdminRole(value: unknown): boolean {
  return value === "admin";
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const role = user.app_metadata?.role ?? user.user_metadata?.role;
  if (!isAdminRole(role)) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const supabase = createSupabaseAdminClient();

  const { data: draw, error: drawError } = await supabase
    .from("draws")
    .select("id,draw_year,draw_month,mode,status,published_at,draw_runs(id,run_type,result_numbers,participant_snapshot_count,executed_at,is_published)")
    .order("draw_year", { ascending: false })
    .order("draw_month", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (drawError) {
    return NextResponse.json({ error: drawError.message }, { status: 500 });
  }

  const drawId = draw?.id;
  if (!drawId) {
    return NextResponse.json({ draw: null, prizePool: null, winners: [] });
  }

  const [{ data: prizePool }, { data: winners }] = await Promise.all([
    supabase.from("prize_pools").select("*").eq("draw_id", drawId).maybeSingle(),
    supabase
      .from("winners")
      .select("id,user_id,tier,winning_amount_minor,currency,created_at")
      .eq("draw_id", drawId)
      .order("tier", { ascending: false }),
  ]);

  return NextResponse.json({
    draw,
    prizePool: prizePool ?? null,
    winners: winners ?? [],
  });
}
