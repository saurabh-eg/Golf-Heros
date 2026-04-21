"use client";

import { useMutation } from "@tanstack/react-query";

export function BillingManagementCard() {
  const portalMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/billing/portal", {
        method: "POST",
      });

      const payload = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !payload.url) {
        throw new Error(payload.error ?? "Unable to open billing portal.");
      }

      return payload.url;
    },
    onSuccess: (url) => {
      window.location.href = url;
    },
  });

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="font-display text-2xl text-slate-900">Billing & Cancellation</h2>
      <p className="mt-1 text-sm text-slate-600">
        Open Stripe Customer Portal to change payment method, switch plans, or cancel your subscription safely.
      </p>

      <button
        type="button"
        onClick={() => portalMutation.mutate()}
        disabled={portalMutation.isPending}
        className="mt-5 rounded-full bg-ink px-5 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-70"
      >
        {portalMutation.isPending ? "Opening..." : "Manage Billing"}
      </button>

      {portalMutation.error ? <p className="mt-3 text-sm text-red-600">{(portalMutation.error as Error).message}</p> : null}
    </section>
  );
}
