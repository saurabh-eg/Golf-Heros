import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/audit/logs";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

function isAdminRole(value: unknown): boolean {
  return value === "admin";
}

export async function PATCH(
  _request: Request,
  context: { params: Promise<{ notificationId: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!isAdminRole(user.app_metadata?.role ?? user.user_metadata?.role)) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const { notificationId } = await context.params;
  const supabase = createSupabaseAdminClient();

  const { data: existing, error: existingError } = await supabase
    .from("notifications")
    .select("id,delivery_status")
    .eq("id", notificationId)
    .maybeSingle();

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 500 });
  }

  if (!existing) {
    return NextResponse.json({ error: "Notification not found." }, { status: 404 });
  }

  if (existing.delivery_status === "sent") {
    return NextResponse.json({ error: "Sent notifications cannot be retried." }, { status: 409 });
  }

  const { error: updateError } = await supabase
    .from("notifications")
    .update({
      delivery_status: "queued",
      error_message: null,
      provider_message_id: null,
      sent_at: null,
    })
    .eq("id", notificationId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  await writeAuditLog({
    actorUserId: user.id,
    entityType: "notification",
    entityId: notificationId,
    action: "admin.retry",
    oldValues: { delivery_status: existing.delivery_status },
    newValues: { delivery_status: "queued" },
  });

  return NextResponse.json({ success: true });
}
