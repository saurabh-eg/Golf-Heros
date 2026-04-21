import { AdminAnalyticsPanel } from "@/components/admin/admin-analytics-panel";
import { CharityManagementPanel } from "@/components/admin/charity-management-panel";
import { DrawControlPanel } from "@/components/admin/draw-control-panel";
import { NotificationQueuePanel } from "@/components/admin/notification-queue-panel";
import { ScoreModerationPanel } from "@/components/admin/score-moderation-panel";
import { SubscriptionManagementPanel } from "@/components/admin/subscription-management-panel";
import { UserManagementPanel } from "@/components/admin/user-management-panel";
import { WinnerManagementPanel } from "@/components/admin/winner-management-panel";
import { AnimatedChip, AnimatedSection } from "@/components/ui/animated-surface";

export default function AdminPage() {
  return (
    <AnimatedSection className="mx-auto w-full max-w-6xl space-y-6 px-4 py-14 sm:px-6">
      <header className="max-w-3xl space-y-4">
        <AnimatedChip className="bg-white/85 text-slate-600">Operations center</AnimatedChip>
        <h1 className="font-display text-5xl text-slate-950">Admin Console</h1>
        <p className="max-w-2xl text-lg leading-relaxed text-slate-700">
          Manage draw operations, winner lifecycle, notifications, and business analytics.
        </p>
      </header>
      <AdminAnalyticsPanel />
      <UserManagementPanel />
      <SubscriptionManagementPanel />
      <ScoreModerationPanel />
      <CharityManagementPanel />
      <DrawControlPanel />
      <WinnerManagementPanel />
      <NotificationQueuePanel />
    </AnimatedSection>
  );
}
