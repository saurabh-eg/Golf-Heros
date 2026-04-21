import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

function isAdminRole(value: unknown): boolean {
  return value === "admin";
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!isAdminRole(user.app_metadata?.role ?? user.user_metadata?.role)) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("notifications")
    .select(
      "id,user_id,channel,event_type,template_code,payload_json,delivery_status,provider_message_id,error_message,created_at,sent_at,users:user_id(email)",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const summary = (data ?? []).reduce(
    (acc, row) => {
      const key = row.delivery_status as "queued" | "sent" | "failed" | "suppressed";
      if (acc[key] !== undefined) {
        acc[key] += 1;
      }
      return acc;
    },
    {
      queued: 0,
      sent: 0,
      failed: 0,
      suppressed: 0,
    },
  );

  return NextResponse.json({
    summary,
    notifications: data ?? [],
  });
}
