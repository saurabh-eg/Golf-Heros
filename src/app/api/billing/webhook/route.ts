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

const donationEventTypes = new Set(["checkout.session.completed"]);

function timestampFromUnix(value: number | null): string | null {
  if (!value) return null;
  return new Date(value * 1000).toISOString();
}

function timestampFromUnixMaybe(value: number | null | undefined): string | null {
  if (!value) return null;
  return new Date(value * 1000).toISOString();
}

function addMonthsIso(isoTimestamp: string, months: number): string {
  const date = new Date(isoTimestamp);
  date.setMonth(date.getMonth() + months);
  return date.toISOString();
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
  try {
    if (!serverEnv.STRIPE_SECRET_KEY || !serverEnv.STRIPE_WEBHOOK_SECRET) {
      console.error("[billing-webhook] missing Stripe environment configuration");
      return NextResponse.json({ error: "Stripe webhook environment is not configured." }, { status: 500 });
    }

    const stripe = new Stripe(serverEnv.STRIPE_SECRET_KEY);
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      console.error("[billing-webhook] missing stripe-signature header");
      return NextResponse.json({ error: "Missing stripe-signature header." }, { status: 400 });
    }

    const rawBody = await request.text();

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, serverEnv.STRIPE_WEBHOOK_SECRET);
    } catch (error) {
      console.error("[billing-webhook] signature verification failed", error);
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
      console.error("[billing-webhook] billing_events insert failed", {
        eventId: event.id,
        eventType: event.type,
        error: billingEventError.message,
      });
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

      const firstItem = subscription.items.data[0] as Stripe.SubscriptionItem & {
        current_period_start?: number | null;
        current_period_end?: number | null;
      };

      const startedAt = timestampFromUnixMaybe(subscription.start_date) ?? new Date().toISOString();
      const periodStart =
        timestampFromUnixMaybe(subscription.current_period_start) ??
        timestampFromUnixMaybe(firstItem?.current_period_start) ??
        startedAt;

      const periodEnd =
        timestampFromUnixMaybe(subscription.current_period_end) ??
        timestampFromUnixMaybe(firstItem?.current_period_end) ??
        addMonthsIso(periodStart, 1);

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
          started_at: startedAt,
          current_period_start: periodStart,
          current_period_end: periodEnd,
          canceled_at: timestampFromUnix(subscription.canceled_at),
          ended_at: timestampFromUnix(subscription.ended_at),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "stripe_subscription_id" },
      );

      if (subscriptionError) {
        console.error("[billing-webhook] subscriptions upsert failed", {
          eventId: event.id,
          subscriptionId: subscription.id,
          userId,
          error: subscriptionError.message,
        });
        return NextResponse.json({ error: subscriptionError.message }, { status: 500 });
      }
    }

    if (donationEventTypes.has(event.type)) {
      const session = event.data.object as Stripe.Checkout.Session;
      const sourceType = session.metadata?.source_type;

      if (session.mode === "payment" && sourceType === "independent_donation") {
        const charityId = session.metadata?.charity_id;
        const userId = session.metadata?.user_id || null;
        const amountMinor = session.amount_total ?? 0;
        const currency = (session.currency ?? "usd").toUpperCase();

        if (charityId && amountMinor > 0) {
          const { error: donationError } = await supabase.from("donations").insert({
            user_id: userId,
            charity_id: charityId,
            source_type: "independent",
            amount_minor: amountMinor,
            currency,
            reference_type: "manual_checkout",
            reference_id: session.id,
          });

          if (donationError) {
            console.error("[billing-webhook] donations insert failed", {
              eventId: event.id,
              sessionId: session.id,
              charityId,
              userId,
              error: donationError.message,
            });
            return NextResponse.json({ error: donationError.message }, { status: 500 });
          }
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[billing-webhook] unexpected failure", error);
    return NextResponse.json({ error: "Unexpected webhook failure." }, { status: 500 });
  }
}
