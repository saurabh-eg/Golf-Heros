"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

const preferenceSchema = z.object({
  charityId: z.string().uuid(),
  contributionPercent: z.number().min(10).max(100),
});

type PreferenceFormValues = z.infer<typeof preferenceSchema>;

type Charity = {
  id: string;
  name: string;
  slug: string;
  is_featured: boolean;
};

type PreferenceResponse = {
  preference: {
    charity_id: string;
    contribution_percent: number;
    charities?: Charity;
  } | null;
  error?: string;
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

async function getPreference(): Promise<PreferenceResponse> {
  const response = await fetch("/api/user/charity-preference");
  const payload = (await response.json()) as PreferenceResponse;
  if (!response.ok) {
    throw new Error(payload.error ?? "Unable to fetch charity preference.");
  }
  return payload;
}

export function CharityPreferenceCard() {
  const queryClient = useQueryClient();
  const charitiesQuery = useQuery({ queryKey: ["charities"], queryFn: getCharities });
  const preferenceQuery = useQuery({ queryKey: ["charity-preference"], queryFn: getPreference });

  const form = useForm<PreferenceFormValues>({
    resolver: zodResolver(preferenceSchema),
    defaultValues: {
      charityId: "",
      contributionPercent: 10,
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (values: PreferenceFormValues) => {
      const response = await fetch("/api/user/charity-preference", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to save preference.");
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["charity-preference"] });
    },
  });

  const currentPreference = preferenceQuery.data?.preference;

  useEffect(() => {
    if (currentPreference?.charity_id) {
      form.setValue("charityId", currentPreference.charity_id);
      form.setValue("contributionPercent", currentPreference.contribution_percent ?? 10);
      return;
    }

    if (charitiesQuery.data && charitiesQuery.data.length > 0 && !form.getValues("charityId")) {
      form.setValue("charityId", charitiesQuery.data[0].id);
    }
  }, [charitiesQuery.data, currentPreference, form]);

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="font-display text-2xl text-slate-900">Charity Preference</h2>
      <p className="mt-1 text-sm text-slate-600">Set your charity and contribution percentage (minimum 10%).</p>

      <form
        className="mt-5 grid gap-3 sm:grid-cols-[1fr_160px_auto]"
        onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))}
      >
        <select className="rounded-xl border border-slate-300 px-3 py-2 text-sm" {...form.register("charityId")}>
          <option value="">Select charity</option>
          {charitiesQuery.data?.map((charity) => (
            <option key={charity.id} value={charity.id}>
              {charity.name}
            </option>
          ))}
        </select>

        <input
          type="number"
          min={10}
          max={100}
          className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
          {...form.register("contributionPercent", { valueAsNumber: true })}
        />

        <button
          type="submit"
          disabled={saveMutation.isPending}
          className="rounded-full bg-ink px-5 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-70"
        >
          {saveMutation.isPending ? "Saving..." : "Save"}
        </button>
      </form>

      {saveMutation.error ? <p className="mt-3 text-sm text-red-600">{(saveMutation.error as Error).message}</p> : null}

      <div className="mt-4 text-sm text-slate-700">
        <p>
          Current charity: <span className="font-semibold text-slate-900">{currentPreference?.charities?.name ?? "Not selected"}</span>
        </p>
        <p>
          Contribution: <span className="font-semibold text-slate-900">{currentPreference?.contribution_percent ?? 10}%</span>
        </p>
      </div>
    </section>
  );
}
