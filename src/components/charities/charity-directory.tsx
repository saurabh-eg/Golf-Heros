"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

type Charity = {
  id: string;
  slug: string;
  name: string;
  short_description: string;
  long_description: string;
  website_url: string | null;
  is_featured: boolean;
};

type CharityListResponse = {
  charities: Charity[];
  error?: string;
};

async function getCharities(): Promise<Charity[]> {
  const response = await fetch("/api/charities");
  const payload = (await response.json()) as CharityListResponse;
  if (!response.ok) {
    throw new Error(payload.error ?? "Unable to fetch charities.");
  }
  return payload.charities;
}

export function CharityDirectory() {
  const [query, setQuery] = useState("");
  const charitiesQuery = useQuery({ queryKey: ["charity-directory"], queryFn: getCharities });

  const filtered = useMemo(() => {
    if (!charitiesQuery.data) return [];
    const q = query.trim().toLowerCase();
    if (!q) return charitiesQuery.data;

    return charitiesQuery.data.filter((charity) => {
      return (
        charity.name.toLowerCase().includes(q) ||
        charity.short_description.toLowerCase().includes(q) ||
        charity.long_description.toLowerCase().includes(q)
      );
    });
  }, [charitiesQuery.data, query]);

  return (
    <section className="mt-8 space-y-4">
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm"
        placeholder="Search charities"
      />

      {charitiesQuery.isLoading ? <p className="text-sm text-slate-600">Loading charities...</p> : null}
      {charitiesQuery.error ? <p className="text-sm text-red-600">{(charitiesQuery.error as Error).message}</p> : null}

      <div className="grid gap-4 md:grid-cols-2">
        {filtered.map((charity) => (
          <article key={charity.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-2xl text-slate-900">{charity.name}</h2>
              {charity.is_featured ? (
                <span className="rounded-full bg-warm px-2 py-0.5 text-xs font-semibold text-slate-700">Featured</span>
              ) : null}
            </div>
            <p className="mt-2 text-sm text-slate-700">{charity.short_description}</p>
            {charity.website_url ? (
              <a href={charity.website_url} target="_blank" rel="noreferrer" className="mt-4 inline-block text-sm font-semibold text-slate-900 underline">
                Visit website
              </a>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
