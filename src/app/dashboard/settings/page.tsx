import Link from "next/link";
import { AccountSettingsCard } from "@/components/dashboard/account-settings-card";
import { BillingManagementCard } from "@/components/dashboard/billing-management-card";
import { CharityPreferenceCard } from "@/components/dashboard/charity-preference-card";
import { SubscriptionStatusCard } from "@/components/dashboard/subscription-status-card";

export default function DashboardSettingsPage() {
  return (
    <section className="mx-auto w-full max-w-6xl space-y-6 px-4 py-14 sm:px-6">
      <header className="space-y-3">
        <Link href="/dashboard" className="text-sm font-medium text-slate-600 hover:text-slate-900">
          ← Back to dashboard
        </Link>
        <h1 className="font-display text-4xl text-slate-950">Account Settings</h1>
        <p className="max-w-2xl text-slate-700">Manage your account profile, billing, and charity contribution preferences.</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <SubscriptionStatusCard />
        <BillingManagementCard />
        <AccountSettingsCard />
        <CharityPreferenceCard />
      </div>
    </section>
  );
}
