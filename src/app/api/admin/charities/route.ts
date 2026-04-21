import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const createSchema = z.object({
  slug: z.string().min(2).max(80),
  name: z.string().min(2).max(120),
  shortDescription: z.string().min(10).max(240),
  longDescription: z.string().min(20).max(4000),
  websiteUrl: z.url().optional().or(z.literal("")),
  isFeatured: z.boolean().default(false),
});

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
  const { data, error } = await supabase
    .from("charities")
    .select(
      "id,slug,name,short_description,long_description,website_url,is_featured,is_active,created_at,updated_at,charity_media(id,media_url,alt_text,caption,sort_order,is_active),charity_events(id,title,description,event_image_url,location,event_url,starts_at,ends_at,is_published)",
    )
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ charities: data ?? [] });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const role = user.app_metadata?.role ?? user.user_metadata?.role;
  if (!isAdminRole(role)) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid charity payload." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("charities")
    .insert({
      slug: parsed.data.slug.trim().toLowerCase(),
      name: parsed.data.name.trim(),
      short_description: parsed.data.shortDescription.trim(),
      long_description: parsed.data.longDescription.trim(),
      website_url: parsed.data.websiteUrl?.trim() || null,
      is_featured: parsed.data.isFeatured,
      is_active: true,
    })
    .select("id,slug,name,short_description,long_description,website_url,is_featured,is_active")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ charity: data });
}
