import { NextResponse } from "next/server";
import { z } from "zod";
import { serverEnv } from "@/lib/config/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const bodySchema = z.object({
  email: z.email(),
  password: z.string().min(8),
  next: z.string().startsWith("/").default("/dashboard"),
});

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const normalizedEmail = parsed.data.email.trim().toLowerCase();
  const adminEmail = serverEnv.ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = serverEnv.ADMIN_PASSWORD;

  if (!adminEmail || normalizedEmail !== adminEmail) {
    return NextResponse.json(
      { error: "Password login is available for admin email only." },
      { status: 403 },
    );
  }

  if (!adminPassword) {
    return NextResponse.json(
      { error: "ADMIN_PASSWORD is not configured." },
      { status: 500 },
    );
  }

  if (parsed.data.password !== adminPassword) {
    return NextResponse.json({ error: "Invalid admin email or password." }, { status: 401 });
  }

  const supabaseAdmin = createSupabaseAdminClient();
  const { data: adminUserRow, error: adminUserRowError } = await supabaseAdmin
    .from("users")
    .select("id,role")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (adminUserRowError) {
    return NextResponse.json({ error: adminUserRowError.message }, { status: 500 });
  }

  if (!adminUserRow || adminUserRow.role !== "admin") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const { error: passwordSyncError } = await supabaseAdmin.auth.admin.updateUserById(adminUserRow.id, {
    password: adminPassword,
  });

  if (passwordSyncError) {
    return NextResponse.json({ error: passwordSyncError.message }, { status: 500 });
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password: parsed.data.password,
  });

  if (error || !data.user) {
    return NextResponse.json({ error: "Invalid admin email or password." }, { status: 401 });
  }

  const roleFromMetadata = data.user.app_metadata?.role ?? data.user.user_metadata?.role;
  let isAdmin = roleFromMetadata === "admin";

  if (!isAdmin) {
    const { data: userRow } = await supabase
      .from("users")
      .select("role")
      .eq("id", data.user.id)
      .maybeSingle();
    isAdmin = userRow?.role === "admin";
  }

  if (!isAdmin) {
    await supabase.auth.signOut();
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  return NextResponse.json({ ok: true, redirectTo: parsed.data.next });
}
