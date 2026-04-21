import { DrawControlPanel } from "@/components/admin/draw-control-panel";
import { NotificationQueuePanel } from "@/components/admin/notification-queue-panel";
import { WinnerManagementPanel } from "@/components/admin/winner-management-panel";

export default function AdminPage() {
  return (
    <section className="mx-auto w-full max-w-6xl space-y-6 px-4 py-14 sm:px-6">
      <header>
        <h1 className="font-display text-4xl text-slate-950">Admin Console</h1>
        <p className="mt-3 max-w-2xl text-slate-700">
          Active module: draw simulation and official publish workflow.
        </p>
      </header>
      <DrawControlPanel />
      <WinnerManagementPanel />
      <NotificationQueuePanel />
    </section>
  );
}
