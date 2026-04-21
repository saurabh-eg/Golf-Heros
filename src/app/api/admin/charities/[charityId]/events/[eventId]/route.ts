import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const eventSchema = z.object({
  title: z.string().min(3).max(120),
  description: z.string().min(10).max(1500),
  startsAt: z.iso.datetime(),
  endsAt: z.iso.datetime().optional().or(z.literal("")),
  location: z.string().max(180).optional().or(z.literal("")),
  eventUrl: z.url().optional().or(z.literal("")),
  eventImageUrl: z.url().optional().or(z.literal("")),
  isPublished: z.boolean().default(true),
});

type Context = {
  params: Promise<{ charityId: string; eventId: string }>;
};

function isAdminRole(value: unknown): boolean {
  return value === "admin";
}

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const role = user.app_metadata?.role ?? user.user_metadata?.role;
  if (!isAdminRole(role)) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  return null;
}

export async function PATCH(request: Request, context: Context) {
  const authError = await requireAdmin();
  if (authError) {
    return authError;
  }

  const payload = await request.json().catch(() => null);
  const parsed = eventSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid charity event update payload." }, { status: 400 });
  }

  const { charityId, eventId } = await context.params;
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("charity_events")
    .update({
      title: parsed.data.title.trim(),
      description: parsed.data.description.trim(),
      starts_at: parsed.data.startsAt,
      ends_at: parsed.data.endsAt || null,
      location: parsed.data.location?.trim() || null,
      event_url: parsed.data.eventUrl?.trim() || null,
      event_image_url: parsed.data.eventImageUrl?.trim() || null,
      is_published: parsed.data.isPublished,
      updated_at: new Date().toISOString(),
    })
    .eq("id", eventId)
    .eq("charity_id", charityId)
    .select("id,charity_id,title,description,event_image_url,location,event_url,starts_at,ends_at,is_published")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ event: data });
}

export async function DELETE(_request: Request, context: Context) {
  const authError = await requireAdmin();
  if (authError) {
    return authError;
  }

  const { charityId, eventId } = await context.params;
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("charity_events")
    .delete()
    .eq("id", eventId)
    .eq("charity_id", charityId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
