import { ScoreManager } from "@/components/dashboard/score-manager";

export default function DashboardPage() {
  return (
    <section className="mx-auto w-full max-w-6xl space-y-6 px-4 py-14 sm:px-6">
      <header>
        <h1 className="font-display text-4xl text-slate-950">Subscriber Dashboard</h1>
        <p className="mt-3 max-w-2xl text-slate-700">
          Active module: score management with rolling retention, edit, and delete actions.
        </p>
      </header>
      <ScoreManager />
    </section>
  );
}
