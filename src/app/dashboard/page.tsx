import { CharityPreferenceCard } from "@/components/dashboard/charity-preference-card";
import { ScoreManager } from "@/components/dashboard/score-manager";
import { SubscriptionStatusCard } from "@/components/dashboard/subscription-status-card";
import { WinnerVerificationCard } from "@/components/dashboard/winner-verification-card";
import Link from "next/link";

export default function DashboardPage() {
  return (
    <section className="mx-auto w-full max-w-6xl space-y-6 px-4 py-14 sm:px-6">
      <header>
        <h1 className="font-display text-4xl text-slate-950">Subscriber Dashboard</h1>
        <p className="mt-3 max-w-2xl text-slate-700">
          Active modules: subscription status, charity preference, and score management.
        </p>
        <Link
          href="/dashboard/settings"
          className="mt-4 inline-flex rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 transition hover:border-slate-900 hover:text-slate-900"
        >
          Open Account Settings
        </Link>
      </header>
      <div className="grid gap-6 lg:grid-cols-2">
        <SubscriptionStatusCard />
        <CharityPreferenceCard />
      </div>
      <ScoreManager />
      <WinnerVerificationCard />
    </section>
  );
}
