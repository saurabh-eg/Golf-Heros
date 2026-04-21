import { CharityDirectory } from "@/components/charities/charity-directory";

export default function CharitiesPage() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6">
      <h1 className="font-display text-4xl text-slate-950">Charity Directory</h1>
      <p className="mt-3 max-w-2xl text-slate-700">
        Explore available causes and choose where your subscription impact should go.
      </p>
      <CharityDirectory />
    </section>
  );
}
