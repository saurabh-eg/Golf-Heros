import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const updateSchema = z.object({
  slug: z.string().min(2).max(80),
  name: z.string().min(2).max(120),
  shortDescription: z.string().min(10).max(240),
  longDescription: z.string().min(20).max(4000),
  websiteUrl: z.url().optional().or(z.literal("")),
  isFeatured: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

function isAdminRole(value: unknown): boolean {
  return value === "admin";
}

type Context = {
  params: Promise<{ charityId: string }>;
};

export async function PATCH(request: Request, context: Context) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const role = user.app_metadata?.role ?? user.user_metadata?.role;
  if (!isAdminRole(role)) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid charity update payload." }, { status: 400 });
  }

  const { charityId } = await context.params;
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("charities")
    .update({
      slug: parsed.data.slug.trim().toLowerCase(),
      name: parsed.data.name.trim(),
      short_description: parsed.data.shortDescription.trim(),
      long_description: parsed.data.longDescription.trim(),
      website_url: parsed.data.websiteUrl?.trim() || null,
      is_featured: parsed.data.isFeatured,
      is_active: parsed.data.isActive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", charityId)
    .select("id,slug,name,short_description,long_description,website_url,is_featured,is_active")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ charity: data });
}

export async function DELETE(_request: Request, context: Context) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const role = user.app_metadata?.role ?? user.user_metadata?.role;
  if (!isAdminRole(role)) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const { charityId } = await context.params;
  const supabase = createSupabaseAdminClient();

  const { error } = await supabase
    .from("charities")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", charityId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
