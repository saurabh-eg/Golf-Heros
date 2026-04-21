"use client";

import { useQuery } from "@tanstack/react-query";

type StatusResponse = {
  subscription: {
    status: string;
    plan_code: string | null;
    current_period_end: string;
  } | null;
  hasAccess: boolean;
  error?: string;
};

async function getSubscriptionStatus(): Promise<StatusResponse> {
  const response = await fetch("/api/subscription/status");
  const payload = (await response.json()) as StatusResponse;

  if (!response.ok) {
    throw new Error(payload.error ?? "Unable to fetch subscription status.");
  }

  return payload;
}

export function SubscriptionStatusCard() {
  const query = useQuery({
    queryKey: ["subscription-status"],
    queryFn: getSubscriptionStatus,
  });

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="font-display text-2xl text-slate-900">Subscription Status</h2>
      {query.isLoading ? <p className="mt-2 text-sm text-slate-600">Loading subscription...</p> : null}
      {query.error ? <p className="mt-2 text-sm text-red-600">{(query.error as Error).message}</p> : null}

      {query.data ? (
        <div className="mt-3 space-y-2 text-sm text-slate-700">
          <p>
            Access: <span className="font-semibold text-slate-900">{query.data.hasAccess ? "Active" : "Inactive"}</span>
          </p>
          <p>
            Plan: <span className="font-semibold text-slate-900">{query.data.subscription?.plan_code ?? "Not set"}</span>
          </p>
          <p>
            Renewal: <span className="font-semibold text-slate-900">{query.data.subscription?.current_period_end ?? "N/A"}</span>
          </p>
        </div>
      ) : null}
    </section>
  );
}
