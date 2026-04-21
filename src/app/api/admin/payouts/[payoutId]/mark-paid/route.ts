import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const bodySchema = z.object({
  paymentReference: z.string().min(2).max(200),
});

function isAdminRole(value: unknown): boolean {
  return value === "admin";
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ payoutId: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!isAdminRole(user.app_metadata?.role ?? user.user_metadata?.role)) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const { payoutId } = await context.params;
  const payload = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payout payload." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();

  const { data: payout, error: payoutError } = await supabase
    .from("payouts")
    .select("id,status,winner_id,winners!inner(user_id)")
    .eq("id", payoutId)
    .single();

  if (payoutError || !payout) {
    return NextResponse.json({ error: "Payout record not found." }, { status: 404 });
  }

  if (payout.status === "paid") {
    return NextResponse.json({ error: "Payout already marked as paid." }, { status: 409 });
  }

  const { error: updateError } = await supabase
    .from("payouts")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      marked_paid_by_user_id: user.id,
      payment_reference: parsed.data.paymentReference,
      updated_at: new Date().toISOString(),
    })
    .eq("id", payoutId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  const winnerUserId = (payout.winners as unknown as { user_id: string }).user_id;

  await supabase.from("notifications").insert({
    user_id: winnerUserId,
    channel: "email",
    event_type: "winner.payout.paid",
    template_code: "winner_payout_paid",
    payload_json: { payoutId, paymentReference: parsed.data.paymentReference },
    delivery_status: "queued",
  });

  return NextResponse.json({ success: true });
}
