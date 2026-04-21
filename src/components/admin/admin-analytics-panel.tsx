"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

type AnalyticsResponse = {
  totals: {
    users: number;
    active_subscribers: number;
    published_draws: number;
    winners: number;
    pending_verifications: number;
    pending_payouts: number;
    donation_last_6_months_minor: number;
    prize_last_6_months_minor: number;
  };
  monthlySeries: Array<{
    month: string;
    label: string;
    donation_minor: number;
    prize_minor: number;
    new_subscribers: number;
  }>;
  topCharities: Array<{
    charity_id: string;
    charity_name: string;
    amount_minor: number;
  }>;
  error?: string;
};

async function getAdminAnalytics(): Promise<AnalyticsResponse> {
  const response = await fetch("/api/admin/analytics");
  const payload = (await response.json()) as AnalyticsResponse;
  if (!response.ok) {
    throw new Error(payload.error ?? "Unable to fetch admin analytics.");
  }
  return payload;
}

function formatMinor(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value / 100);
}

export function AdminAnalyticsPanel() {
  const analyticsQuery = useQuery({
    queryKey: ["admin-analytics"],
    queryFn: getAdminAnalytics,
    refetchInterval: 30_000,
  });

  const maxCombined = useMemo(() => {
    const rows = analyticsQuery.data?.monthlySeries ?? [];
    if (!rows.length) return 1;
    return Math.max(
      ...rows.map((row) => row.donation_minor + row.prize_minor),
      1,
    );
  }, [analyticsQuery.data?.monthlySeries]);

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="font-display text-2xl text-slate-900">Analytics & Reports</h2>
      <p className="mt-1 text-sm text-slate-600">Live operational totals and six-month trend snapshots.</p>

      {analyticsQuery.isLoading ? <p className="mt-3 text-sm text-slate-600">Loading analytics...</p> : null}
      {analyticsQuery.error ? (
        <p className="mt-3 text-sm text-red-600">{(analyticsQuery.error as Error).message}</p>
      ) : null}

      {analyticsQuery.data ? (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <article className="rounded-2xl border border-slate-200 p-4">
              <p className="text-xs text-slate-600">Total Users</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">{analyticsQuery.data.totals.users}</p>
            </article>
            <article className="rounded-2xl border border-slate-200 p-4">
              <p className="text-xs text-slate-600">Active Subscribers</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">{analyticsQuery.data.totals.active_subscribers}</p>
            </article>
            <article className="rounded-2xl border border-slate-200 p-4">
              <p className="text-xs text-slate-600">Published Draws</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">{analyticsQuery.data.totals.published_draws}</p>
            </article>
            <article className="rounded-2xl border border-slate-200 p-4">
              <p className="text-xs text-slate-600">Total Winners</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">{analyticsQuery.data.totals.winners}</p>
            </article>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <article className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-xs text-amber-700">Pending Verifications</p>
              <p className="mt-1 text-2xl font-semibold text-amber-900">{analyticsQuery.data.totals.pending_verifications}</p>
            </article>
            <article className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-xs text-amber-700">Pending Payouts</p>
              <p className="mt-1 text-2xl font-semibold text-amber-900">{analyticsQuery.data.totals.pending_payouts}</p>
            </article>
            <article className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 sm:col-span-2">
              <p className="text-xs text-emerald-700">Donations (Last 6 Months)</p>
              <p className="mt-1 text-2xl font-semibold text-emerald-900">
                {formatMinor(analyticsQuery.data.totals.donation_last_6_months_minor)}
              </p>
            </article>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <article className="rounded-2xl border border-slate-200 p-4">
              <h3 className="text-sm font-semibold text-slate-900">6-Month Financial Trend</h3>
              <p className="mt-1 text-xs text-slate-600">Combined bars: donations + prize pools (gross).</p>

              <div className="mt-4 space-y-3">
                {analyticsQuery.data.monthlySeries.map((row) => {
                  const combined = row.donation_minor + row.prize_minor;
                  const widthPercent = (combined / maxCombined) * 100;
                  return (
                    <div key={row.month}>
                      <div className="mb-1 flex items-center justify-between text-xs text-slate-600">
                        <span>{row.label}</span>
                        <span>{formatMinor(combined)}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-slate-900" style={{ width: `${widthPercent}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </article>

            <article className="rounded-2xl border border-slate-200 p-4">
              <h3 className="text-sm font-semibold text-slate-900">Top Charities (Donations)</h3>
              <p className="mt-1 text-xs text-slate-600">Based on independent donations processed in last 6 months.</p>

              <div className="mt-4 space-y-3">
                {analyticsQuery.data.topCharities.map((charity, index) => (
                  <div key={charity.charity_id} className="flex items-center justify-between text-sm">
                    <span className="text-slate-700">{index + 1}. {charity.charity_name}</span>
                    <span className="font-semibold text-slate-900">{formatMinor(charity.amount_minor)}</span>
                  </div>
                ))}
                {!analyticsQuery.data.topCharities.length ? (
                  <p className="text-sm text-slate-600">No donation data available yet.</p>
                ) : null}
              </div>
            </article>
          </div>
        </>
      ) : null}
    </section>
  );
}
