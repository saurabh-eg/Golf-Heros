"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";

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
  const searchParams = useSearchParams();
  const donationStatus = searchParams.get("donation");
  const [query, setQuery] = useState("");
  const [selectedDonationCharityId, setSelectedDonationCharityId] = useState<string | null>(null);
  const [donationAmount, setDonationAmount] = useState(10);
  const [donorEmail, setDonorEmail] = useState("");
  const charitiesQuery = useQuery({ queryKey: ["charity-directory"], queryFn: getCharities });

  const donationMutation = useMutation({
    mutationFn: async (payload: { charityId: string; amountMajor: number; donorEmail?: string }) => {
      const response = await fetch("/api/donations/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !result.url) {
        throw new Error(result.error ?? "Unable to start donation checkout.");
      }

      return result.url;
    },
    onSuccess: (url) => {
      window.location.href = url;
    },
  });

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
      {donationStatus === "success" ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Donation payment completed. Thank you for supporting this cause.
        </p>
      ) : null}

      {donationStatus === "cancel" ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Donation checkout was canceled. You can try again anytime.
        </p>
      ) : null}

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
            <Link
              href={`/charities/${charity.slug}`}
              className="mt-4 inline-flex rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 transition hover:border-slate-900 hover:text-slate-900"
            >
              View Profile
            </Link>
            <button
              type="button"
              onClick={() => setSelectedDonationCharityId(charity.id)}
              className="mt-2 rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 transition hover:border-slate-900 hover:text-slate-900"
            >
              Donate
            </button>

            {selectedDonationCharityId === charity.id ? (
              <form
                className="mt-4 grid gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  donationMutation.mutate({
                    charityId: charity.id,
                    amountMajor: donationAmount,
                    donorEmail: donorEmail.trim() || undefined,
                  });
                }}
              >
                <input
                  type="number"
                  min={1}
                  max={5000}
                  step={1}
                  value={donationAmount}
                  onChange={(event) => setDonationAmount(Number(event.target.value))}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Donation amount (USD)"
                />
                <input
                  type="email"
                  value={donorEmail}
                  onChange={(event) => setDonorEmail(event.target.value)}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Email (required for guest donation)"
                />
                <button
                  type="submit"
                  disabled={donationMutation.isPending}
                  className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-70"
                >
                  {donationMutation.isPending ? "Redirecting..." : "Continue to Checkout"}
                </button>
              </form>
            ) : null}

            {selectedDonationCharityId === charity.id && donationMutation.error ? (
              <p className="mt-2 text-sm text-red-600">{(donationMutation.error as Error).message}</p>
            ) : null}

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
