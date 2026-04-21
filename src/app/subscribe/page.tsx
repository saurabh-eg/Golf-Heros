"use client";

import { useState } from "react";
import type { PlanCode } from "@/lib/billing/plans";

export default function SubscribePage() {
  const [loadingPlan, setLoadingPlan] = useState<PlanCode | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function startCheckout(planCode: PlanCode) {
    setLoadingPlan(planCode);
    setErrorMessage(null);

    const response = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planCode }),
    });

    const payload = (await response.json()) as { url?: string; error?: string };

    if (!response.ok || !payload.url) {
      setErrorMessage(payload.error ?? "Unable to start checkout.");
      setLoadingPlan(null);
      return;
    }

    window.location.href = payload.url;
  }

  return (
    <section className="mx-auto w-full max-w-4xl px-4 py-14 sm:px-6">
      <h1 className="font-display text-4xl text-slate-950">Choose your subscription</h1>
      <p className="mt-3 text-slate-700">
        Select a plan to unlock score tracking, draw participation, and charity contributions.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <button
          onClick={() => startCheckout("monthly")}
          disabled={loadingPlan !== null}
          className="rounded-2xl border border-slate-300 bg-white p-5 text-left transition hover:border-slate-900 disabled:opacity-70"
        >
          <h2 className="text-lg font-semibold text-slate-900">Monthly Plan</h2>
          <p className="mt-1 text-sm text-slate-600">Flexible month-to-month access.</p>
        </button>

        <button
          onClick={() => startCheckout("yearly")}
          disabled={loadingPlan !== null}
          className="rounded-2xl border border-slate-300 bg-white p-5 text-left transition hover:border-slate-900 disabled:opacity-70"
        >
          <h2 className="text-lg font-semibold text-slate-900">Yearly Plan</h2>
          <p className="mt-1 text-sm text-slate-600">Best value with discounted annual billing.</p>
        </button>
      </div>

      {errorMessage ? <p className="mt-4 text-sm text-red-600">{errorMessage}</p> : null}
    </section>
  );
}
