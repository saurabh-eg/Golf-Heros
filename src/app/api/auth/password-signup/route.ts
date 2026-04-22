import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";

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
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase.auth.signUp({
    email: normalizedEmail,
    password: parsed.data.password,
  });

  if (error) {
    const status = error.status ?? 400;
    return NextResponse.json({ error: error.message }, { status });
  }

  const requiresEmailConfirmation = !data.session;

  return NextResponse.json({
    ok: true,
    redirectTo: parsed.data.next,
    requiresEmailConfirmation,
    message: requiresEmailConfirmation
      ? "Account created. Please check your email to verify your account before signing in."
      : "Account created and signed in successfully.",
  });
}
