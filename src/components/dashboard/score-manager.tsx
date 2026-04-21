"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

const scoreSchema = z.object({
  scoreDate: z.iso.date(),
  stablefordScore: z.number().int().min(1).max(45),
});

type ScoreFormValues = z.infer<typeof scoreSchema>;

type ApiScore = {
  id: string;
  scoreDate: string;
  stablefordScore: number;
  createdAt: string;
};

type ScoresResponse = {
  scores: ApiScore[];
  error?: string;
};

async function getScores(): Promise<ApiScore[]> {
  const response = await fetch("/api/scores");
  const payload = (await response.json()) as ScoresResponse;

  if (!response.ok) {
    throw new Error(payload.error ?? "Unable to fetch scores.");
  }

  return payload.scores;
}

export function ScoreManager() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingDate, setEditingDate] = useState("");
  const [editingScore, setEditingScore] = useState("0");

  const createForm = useForm<ScoreFormValues>({
    resolver: zodResolver(scoreSchema),
    defaultValues: {
      scoreDate: new Date().toISOString().slice(0, 10),
      stablefordScore: 30,
    },
  });

  const scoresQuery = useQuery({
    queryKey: ["scores"],
    queryFn: getScores,
  });

  const createMutation = useMutation({
    mutationFn: async (values: ScoreFormValues) => {
      const response = await fetch("/api/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to add score.");
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["scores"] });
      createForm.reset({
        scoreDate: new Date().toISOString().slice(0, 10),
        stablefordScore: 30,
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (scoreId: string) => {
      const response = await fetch(`/api/scores/${scoreId}`, { method: "DELETE" });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to delete score.");
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["scores"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ scoreId, scoreDate, stablefordScore }: { scoreId: string; scoreDate: string; stablefordScore: number }) => {
      const response = await fetch(`/api/scores/${scoreId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scoreDate, stablefordScore }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to update score.");
      }
    },
    onSuccess: async () => {
      setEditingId(null);
      await queryClient.invalidateQueries({ queryKey: ["scores"] });
    },
  });

  const statusMessage = useMemo(() => {
    if (createMutation.error) return (createMutation.error as Error).message;
    if (deleteMutation.error) return (deleteMutation.error as Error).message;
    if (updateMutation.error) return (updateMutation.error as Error).message;
    if (scoresQuery.error) return (scoresQuery.error as Error).message;
    return null;
  }, [createMutation.error, deleteMutation.error, scoresQuery.error, updateMutation.error]);

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl text-slate-900">Score Manager</h2>
          <p className="mt-1 text-sm text-slate-600">Enter and maintain your latest five Stableford scores.</p>
        </div>
      </div>

      <form
        className="mt-6 grid gap-3 sm:grid-cols-[1fr_1fr_auto]"
        onSubmit={createForm.handleSubmit((values) => createMutation.mutate(values))}
      >
        <input
          type="date"
          className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
          {...createForm.register("scoreDate")}
        />
        <input
          type="number"
          min={1}
          max={45}
          className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
          {...createForm.register("stablefordScore", { valueAsNumber: true })}
        />
        <button
          type="submit"
          disabled={createMutation.isPending}
          className="rounded-full bg-ink px-5 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-70"
        >
          {createMutation.isPending ? "Saving..." : "Add score"}
        </button>
      </form>

      {statusMessage ? <p className="mt-3 text-sm text-red-600">{statusMessage}</p> : null}

      <div className="mt-6 space-y-3">
        {scoresQuery.isLoading ? <p className="text-sm text-slate-600">Loading scores...</p> : null}
        {!scoresQuery.isLoading && (scoresQuery.data?.length ?? 0) === 0 ? (
          <p className="text-sm text-slate-600">No scores yet. Add your first entry.</p>
        ) : null}

        {scoresQuery.data?.map((score) => {
          const isEditing = editingId === score.id;
          return (
            <article key={score.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 px-4 py-3">
              {isEditing ? (
                <div className="flex flex-1 flex-wrap items-center gap-2">
                  <input
                    type="date"
                    value={editingDate}
                    onChange={(event) => setEditingDate(event.target.value)}
                    className="rounded-lg border border-slate-300 px-2 py-1 text-sm"
                  />
                  <input
                    type="number"
                    min={1}
                    max={45}
                    value={editingScore}
                    onChange={(event) => setEditingScore(event.target.value)}
                    className="w-24 rounded-lg border border-slate-300 px-2 py-1 text-sm"
                  />
                </div>
              ) : (
                <div>
                  <p className="text-sm font-semibold text-slate-900">{score.stablefordScore} points</p>
                  <p className="text-xs text-slate-600">{score.scoreDate}</p>
                </div>
              )}

              <div className="flex items-center gap-2">
                {isEditing ? (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        updateMutation.mutate({
                          scoreId: score.id,
                          scoreDate: editingDate,
                          stablefordScore: Number(editingScore),
                        })
                      }
                      className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(score.id);
                        setEditingDate(score.scoreDate);
                        setEditingScore(String(score.stablefordScore));
                      }}
                      className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteMutation.mutate(score.id)}
                      className="rounded-full border border-red-300 px-3 py-1 text-xs font-semibold text-red-600"
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
