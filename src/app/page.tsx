import Link from "next/link";

export default function Home() {
  return (
    <section className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:py-24">
      <div className="space-y-8">
        <p className="inline-flex rounded-full border border-slate-200 bg-white px-4 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
          Charity-Led Golf Platform
        </p>
        <h1 className="font-display text-4xl leading-tight text-slate-950 sm:text-5xl lg:text-6xl">
          Compete each month.
          <br />
          Fund what matters.
        </h1>
        <p className="max-w-xl text-lg leading-relaxed text-slate-700">
          Subscribers track Stableford scores, join monthly draws, and direct a percentage of every plan
          to a charity they care about.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/subscribe"
            className="inline-flex items-center justify-center rounded-full bg-ink px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            Start Subscription
          </Link>
          <Link
            href="/charities"
            className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-900 hover:text-slate-900"
          >
            Explore Charities
          </Link>
        </div>
      </div>

      <div className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-[0_18px_50px_-24px_rgba(15,23,42,0.55)] backdrop-blur">
        <h2 className="font-display text-2xl text-slate-900">How the cycle works</h2>
        <ol className="mt-5 space-y-3 text-sm text-slate-700">
          <li>1. Choose monthly or yearly subscription.</li>
          <li>2. Enter your latest five Stableford scores.</li>
          <li>3. Pick your charity contribution percentage.</li>
          <li>4. Join the monthly draw and track winnings.</li>
        </ol>
        <div className="mt-6 rounded-2xl bg-slate-900 p-4 text-sm text-slate-100">
          Prize pool tiers: 40% for 5-match jackpot, 35% for 4-match, 25% for 3-match.
        </div>
      </div>
    </section>
  );
}
