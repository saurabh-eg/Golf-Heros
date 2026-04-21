import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const mediaSchema = z.object({
  mediaUrl: z.url(),
  altText: z.string().max(200).default(""),
  caption: z.string().max(280).optional().or(z.literal("")),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
  isActive: z.boolean().default(true),
});

type Context = {
  params: Promise<{ charityId: string; mediaId: string }>;
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
  const parsed = mediaSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid media update payload." }, { status: 400 });
  }

  const { charityId, mediaId } = await context.params;
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("charity_media")
    .update({
      media_url: parsed.data.mediaUrl.trim(),
      alt_text: parsed.data.altText.trim(),
      caption: parsed.data.caption?.trim() || null,
      sort_order: parsed.data.sortOrder,
      is_active: parsed.data.isActive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", mediaId)
    .eq("charity_id", charityId)
    .select("id,charity_id,media_url,alt_text,caption,sort_order,is_active")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ media: data });
}

export async function DELETE(_request: Request, context: Context) {
  const authError = await requireAdmin();
  if (authError) {
    return authError;
  }

  const { charityId, mediaId } = await context.params;
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("charity_media")
    .delete()
    .eq("id", mediaId)
    .eq("charity_id", charityId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
