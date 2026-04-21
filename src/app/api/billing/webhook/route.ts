import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { serverEnv } from "@/lib/config/env";

export const runtime = "nodejs";

const subscriptionEventTypes = new Set([
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
]);

function timestampFromUnix(value: number | null): string | null {
  if (!value) return null;
  return new Date(value * 1000).toISOString();
}

function resolvePlanCode(subscription: Stripe.Subscription): "monthly" | "yearly" | null {
  const metadataPlan = subscription.metadata?.plan_code;
  if (metadataPlan === "monthly" || metadataPlan === "yearly") {
    return metadataPlan;
  }

  const priceId = subscription.items.data[0]?.price?.id;
  if (priceId && priceId === serverEnv.STRIPE_PRICE_MONTHLY_ID) return "monthly";
  if (priceId && priceId === serverEnv.STRIPE_PRICE_YEARLY_ID) return "yearly";

  return null;
}

function resolveStripeCustomerId(event: Stripe.Event): string {
  const eventObject = event.data.object as { customer?: string | Stripe.Customer | Stripe.DeletedCustomer };
  if (typeof eventObject.customer === "string") {
    return eventObject.customer;
  }
  if (eventObject.customer && "id" in eventObject.customer) {
    return eventObject.customer.id;
  }
  return "unknown";
}

export async function POST(request: Request) {
  if (!serverEnv.STRIPE_SECRET_KEY || !serverEnv.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Stripe webhook environment is not configured." }, { status: 500 });
  }

  const stripe = new Stripe(serverEnv.STRIPE_SECRET_KEY);
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header." }, { status: 400 });
  }

  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, serverEnv.STRIPE_WEBHOOK_SECRET);
  } catch (error) {
    return NextResponse.json({ error: `Invalid webhook signature: ${String(error)}` }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();

  const { data: existing } = await supabase
    .from("billing_events")
    .select("id")
    .eq("stripe_event_id", event.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ received: true, idempotent: true });
  }

  const eventObject = event.data.object as Partial<Stripe.Subscription>;

  const { error: billingEventError } = await supabase.from("billing_events").insert({
    stripe_event_id: event.id,
    event_type: event.type,
    stripe_customer_id: resolveStripeCustomerId(event),
    stripe_subscription_id: eventObject.id ?? null,
    payload_json: event as unknown as Record<string, unknown>,
    process_status: "processed",
    processed_at: new Date().toISOString(),
  });

  if (billingEventError) {
    return NextResponse.json({ error: billingEventError.message }, { status: 500 });
  }

  if (subscriptionEventTypes.has(event.type)) {
    const subscription = event.data.object as Stripe.Subscription;
    const userId = subscription.metadata?.user_id ?? null;

    if (!userId) {
      return NextResponse.json({
        received: true,
        warning: "Subscription event recorded, but user_id metadata is missing.",
      });
    }

    const { error: subscriptionError } = await supabase.from("subscriptions").upsert(
      {
        user_id: userId,
        plan_code: resolvePlanCode(subscription),
        stripe_customer_id:
          typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer.id,
        stripe_subscription_id: subscription.id,
        status: subscription.status,
        started_at: timestampFromUnix(subscription.start_date),
        current_period_start: timestampFromUnix(subscription.current_period_start),
        current_period_end: timestampFromUnix(subscription.current_period_end),
        canceled_at: timestampFromUnix(subscription.canceled_at),
        ended_at: timestampFromUnix(subscription.ended_at),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "stripe_subscription_id" },
    );

    if (subscriptionError) {
      return NextResponse.json({ error: subscriptionError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
