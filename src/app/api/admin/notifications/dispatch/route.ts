import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/audit/logs";
import { dispatchQueuedNotifications } from "@/lib/notifications/dispatch";

function isAdminRole(value: unknown): boolean {
  return value === "admin";
}

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!isAdminRole(user.app_metadata?.role ?? user.user_metadata?.role)) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  try {
    const result = await dispatchQueuedNotifications();

    await writeAuditLog({
      actorUserId: user.id,
      entityType: "notifications_dispatch",
      entityId: user.id,
      action: "admin.dispatch_now",
      newValues: result,
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to dispatch notifications." },
      { status: 500 },
    );
  }
}
