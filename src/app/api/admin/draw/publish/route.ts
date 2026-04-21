import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { serverEnv } from "@/lib/config/env";
import { calculatePrizePools, splitTierAmount } from "@/lib/domain/prize";
import { buildUserEntriesFromScores, countMatches, generateDrawNumbers, type DrawMode } from "@/lib/domain/draw";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const bodySchema = z.object({
  mode: z.enum(["random", "weighted"]).default("random"),
  drawYear: z.number().int().optional(),
  drawMonth: z.number().int().min(1).max(12).optional(),
});

function isAdminRole(value: unknown): boolean {
  return value === "admin";
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!isAdminRole(user.app_metadata?.role ?? user.user_metadata?.role)) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid publish payload." }, { status: 400 });
  }

  const now = new Date();
  const drawYear = parsed.data.drawYear ?? now.getUTCFullYear();
  const drawMonth = parsed.data.drawMonth ?? now.getUTCMonth() + 1;
  const mode = parsed.data.mode as DrawMode;

  const supabase = createSupabaseAdminClient();

  const { data: existingDraw } = await supabase
    .from("draws")
    .select("id,status")
    .eq("draw_year", drawYear)
    .eq("draw_month", drawMonth)
    .maybeSingle();

  if (existingDraw?.status === "published") {
    return NextResponse.json({ error: "Draw already published for this period." }, { status: 409 });
  }

  const { data: activeSubscriptions, error: subError } = await supabase
    .from("subscriptions")
    .select("user_id,current_period_end")
    .in("status", ["active", "trialing"])
    .gte("current_period_end", new Date().toISOString());

  if (subError) {
    return NextResponse.json({ error: subError.message }, { status: 500 });
  }

  const userIds = Array.from(new Set((activeSubscriptions ?? []).map((item) => item.user_id)));
  if (userIds.length === 0) {
    return NextResponse.json({ error: "No active subscribers for draw publish." }, { status: 400 });
  }

  const { data: scoreRows, error: scoreError } = await supabase
    .from("scores")
    .select("user_id,stableford_score,score_date,created_at")
    .in("user_id", userIds);

  if (scoreError) {
    return NextResponse.json({ error: scoreError.message }, { status: 500 });
  }

  const entries = buildUserEntriesFromScores(scoreRows ?? []);
  if (entries.length === 0) {
    return NextResponse.json({ error: "No eligible users with 5 scores for draw publish." }, { status: 400 });
  }

  const drawNumbers = generateDrawNumbers(mode, entries);

  const { data: draw, error: drawUpsertError } = await supabase
    .from("draws")
    .upsert(
      {
        draw_year: drawYear,
        draw_month: drawMonth,
        mode,
        status: "published",
        published_at: new Date().toISOString(),
        published_by: user.id,
      },
      { onConflict: "draw_year,draw_month" },
    )
    .select("id")
    .single();

  if (drawUpsertError) {
    return NextResponse.json({ error: drawUpsertError.message }, { status: 500 });
  }

  await supabase.from("draw_entries").delete().eq("draw_id", draw.id);
  await supabase.from("winners").delete().eq("draw_id", draw.id);
  await supabase.from("prize_pools").delete().eq("draw_id", draw.id);
  await supabase.from("draw_runs").delete().eq("draw_id", draw.id).eq("run_type", "official");

  const entryRows = entries.map((entry) => ({
    draw_id: draw.id,
    user_id: entry.userId,
    entry_numbers: entry.numbers,
    match_count: countMatches(entry.numbers, drawNumbers),
    is_eligible: true,
  }));

  const { data: insertedEntries, error: entryInsertError } = await supabase
    .from("draw_entries")
    .insert(entryRows)
    .select("id,user_id,match_count");

  if (entryInsertError) {
    return NextResponse.json({ error: entryInsertError.message }, { status: 500 });
  }

  const { error: runError } = await supabase.from("draw_runs").insert({
    draw_id: draw.id,
    run_type: "official",
    run_version: 1,
    result_numbers: drawNumbers,
    participant_snapshot_count: entries.length,
    executed_by: user.id,
    is_published: true,
  });

  if (runError) {
    return NextResponse.json({ error: runError.message }, { status: 500 });
  }

  const { data: prevPool } = await supabase
    .from("prize_pools")
    .select("rollover_out_minor")
    .order("computed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const rolloverInMinor = prevPool?.rollover_out_minor ?? 0;
  const poolPerActiveMinor = serverEnv.DRAW_POOL_PER_ACTIVE_MINOR ?? 1000;
  const grossPoolMinor = entries.length * poolPerActiveMinor;

  const prize = calculatePrizePools({
    grossPoolMinor,
    rolloverInMinor,
  });

  const tier5Winners = (insertedEntries ?? []).filter((entry) => entry.match_count === 5);
  const tier4Winners = (insertedEntries ?? []).filter((entry) => entry.match_count === 4);
  const tier3Winners = (insertedEntries ?? []).filter((entry) => entry.match_count === 3);

  const rolloverOutMinor = tier5Winners.length === 0 ? prize.tier5Minor : 0;

  const { error: poolError } = await supabase.from("prize_pools").insert({
    draw_id: draw.id,
    active_subscriber_count: entries.length,
    gross_pool_minor: grossPoolMinor,
    rollover_in_minor: rolloverInMinor,
    tier_5_minor: prize.tier5Minor,
    tier_4_minor: prize.tier4Minor,
    tier_3_minor: prize.tier3Minor,
    rollover_out_minor: rolloverOutMinor,
    currency: "USD",
  });

  if (poolError) {
    return NextResponse.json({ error: poolError.message }, { status: 500 });
  }

  const winnerRows = [
    ...tier5Winners.map((entry) => ({
      draw_id: draw.id,
      user_id: entry.user_id,
      draw_entry_id: entry.id,
      tier: 5,
      winning_amount_minor: splitTierAmount(prize.tier5Minor, tier5Winners.length),
      currency: "USD",
    })),
    ...tier4Winners.map((entry) => ({
      draw_id: draw.id,
      user_id: entry.user_id,
      draw_entry_id: entry.id,
      tier: 4,
      winning_amount_minor: splitTierAmount(prize.tier4Minor, tier4Winners.length),
      currency: "USD",
    })),
    ...tier3Winners.map((entry) => ({
      draw_id: draw.id,
      user_id: entry.user_id,
      draw_entry_id: entry.id,
      tier: 3,
      winning_amount_minor: splitTierAmount(prize.tier3Minor, tier3Winners.length),
      currency: "USD",
    })),
  ];

  if (winnerRows.length > 0) {
    const { error: winnerError } = await supabase.from("winners").insert(winnerRows);
    if (winnerError) {
      return NextResponse.json({ error: winnerError.message }, { status: 500 });
    }
  }

  return NextResponse.json({
    drawId: draw.id,
    drawYear,
    drawMonth,
    mode,
    drawNumbers,
    participantCount: entries.length,
    winners: {
      tier5: tier5Winners.length,
      tier4: tier4Winners.length,
      tier3: tier3Winners.length,
    },
    rolloverOutMinor,
  });
}
