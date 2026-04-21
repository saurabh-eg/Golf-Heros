import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

function isAdminRole(value: unknown): boolean {
  return value === "admin";
}

type UserRow = {
  id: string;
  email: string;
  role: "subscriber" | "admin";
  created_at: string;
  updated_at: string;
  profiles:
    | {
        id: string;
        full_name: string | null;
        country_code: string | null;
        timezone: string;
      }[]
    | null;
};

type SubscriptionRow = {
  user_id: string;
  status: string;
  current_period_end: string;
};

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

  const { data: users, error: usersError } = await supabase
    .from("users")
    .select("id,email,role,created_at,updated_at,profiles(id,full_name,country_code,timezone)")
    .order("created_at", { ascending: false })
    .limit(200);

  if (usersError) {
    return NextResponse.json({ error: usersError.message }, { status: 500 });
  }

  const userIds = (users ?? []).map((row) => row.id);
  const latestSubByUser = new Map<string, { status: string; current_period_end: string }>();

  if (userIds.length > 0) {
    const { data: subscriptions, error: subscriptionsError } = await supabase
      .from("subscriptions")
      .select("user_id,status,current_period_end")
      .in("user_id", userIds)
      .order("current_period_end", { ascending: false });

    if (subscriptionsError) {
      return NextResponse.json({ error: subscriptionsError.message }, { status: 500 });
    }

    for (const row of (subscriptions ?? []) as SubscriptionRow[]) {
      if (!latestSubByUser.has(row.user_id)) {
        latestSubByUser.set(row.user_id, {
          status: row.status,
          current_period_end: row.current_period_end,
        });
      }
    }
  }

  const result = ((users ?? []) as UserRow[]).map((row) => {
    const profile = row.profiles?.[0] ?? null;
    return {
      id: row.id,
      email: row.email,
      role: row.role,
      created_at: row.created_at,
      updated_at: row.updated_at,
      profile,
      subscription: latestSubByUser.get(row.id) ?? null,
    };
  });

  return NextResponse.json({ users: result });
}
