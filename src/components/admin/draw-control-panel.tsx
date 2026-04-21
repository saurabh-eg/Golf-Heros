"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { DrawMode } from "@/lib/domain/draw";

type DrawCurrentResponse = {
  draw: {
    id: string;
    draw_year: number;
    draw_month: number;
    mode: DrawMode;
    status: string;
    draw_runs?: Array<{
      id: string;
      run_type: string;
      result_numbers: number[];
      participant_snapshot_count: number;
      executed_at: string;
      is_published: boolean;
    }>;
  } | null;
  prizePool: {
    gross_pool_minor: number;
    rollover_in_minor: number;
    rollover_out_minor: number;
    tier_5_minor: number;
    tier_4_minor: number;
    tier_3_minor: number;
  } | null;
  winners: Array<{ tier: number; winning_amount_minor: number }>;
  error?: string;
};

async function getCurrentDraw(): Promise<DrawCurrentResponse> {
  const response = await fetch("/api/admin/draw/current");
  const payload = (await response.json()) as DrawCurrentResponse;
  if (!response.ok) {
    throw new Error(payload.error ?? "Unable to fetch current draw.");
  }
  return payload;
}

export function DrawControlPanel() {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<DrawMode>("random");

  const currentQuery = useQuery({
    queryKey: ["admin-draw-current"],
    queryFn: getCurrentDraw,
  });

  const simulateMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/admin/draw/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Failed to run simulation.");
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-draw-current"] });
    },
  });

  const publishMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/admin/draw/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Failed to publish draw.");
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-draw-current"] });
    },
  });

  const latestRun = currentQuery.data?.draw?.draw_runs?.[0];

  const errorMessage = useMemo(() => {
    if (currentQuery.error) return (currentQuery.error as Error).message;
    if (simulateMutation.error) return (simulateMutation.error as Error).message;
    if (publishMutation.error) return (publishMutation.error as Error).message;
    return null;
  }, [currentQuery.error, publishMutation.error, simulateMutation.error]);

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="font-display text-2xl text-slate-900">Draw Operations</h2>
      <p className="mt-1 text-sm text-slate-600">Run simulation and publish official monthly draw results.</p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <select
          value={mode}
          onChange={(event) => setMode(event.target.value as DrawMode)}
          className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="random">Random Mode</option>
          <option value="weighted">Weighted Mode</option>
        </select>

        <button
          type="button"
          onClick={() => simulateMutation.mutate()}
          disabled={simulateMutation.isPending || publishMutation.isPending}
          className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
        >
          {simulateMutation.isPending ? "Simulating..." : "Run Simulation"}
        </button>

        <button
          type="button"
          onClick={() => publishMutation.mutate()}
          disabled={simulateMutation.isPending || publishMutation.isPending}
          className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
        >
          {publishMutation.isPending ? "Publishing..." : "Publish Official Draw"}
        </button>
      </div>

      {errorMessage ? <p className="mt-3 text-sm text-red-600">{errorMessage}</p> : null}

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 p-4">
          <h3 className="text-sm font-semibold text-slate-900">Current Draw</h3>
          {currentQuery.isLoading ? <p className="mt-2 text-sm text-slate-600">Loading...</p> : null}
          {currentQuery.data?.draw ? (
            <div className="mt-2 space-y-1 text-sm text-slate-700">
              <p>Status: {currentQuery.data.draw.status}</p>
              <p>
                Period: {currentQuery.data.draw.draw_year}-{String(currentQuery.data.draw.draw_month).padStart(2, "0")}
              </p>
              <p>Mode: {currentQuery.data.draw.mode}</p>
              <p>Numbers: {(latestRun?.result_numbers ?? []).join(", ") || "Not available"}</p>
            </div>
          ) : (
            <p className="mt-2 text-sm text-slate-600">No draw recorded yet.</p>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 p-4">
          <h3 className="text-sm font-semibold text-slate-900">Prize Snapshot</h3>
          {currentQuery.data?.prizePool ? (
            <div className="mt-2 space-y-1 text-sm text-slate-700">
              <p>Gross Pool: {currentQuery.data.prizePool.gross_pool_minor}</p>
              <p>Tier 5: {currentQuery.data.prizePool.tier_5_minor}</p>
              <p>Tier 4: {currentQuery.data.prizePool.tier_4_minor}</p>
              <p>Tier 3: {currentQuery.data.prizePool.tier_3_minor}</p>
              <p>Rollover Out: {currentQuery.data.prizePool.rollover_out_minor}</p>
            </div>
          ) : (
            <p className="mt-2 text-sm text-slate-600">No prize pool published yet.</p>
          )}
        </div>
      </div>
    </section>
  );
}
