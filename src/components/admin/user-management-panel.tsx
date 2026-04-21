"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

type UserRow = {
  id: string;
  email: string;
  role: "subscriber" | "admin";
  created_at: string;
  updated_at: string;
  profile: {
    id: string;
    full_name: string | null;
    country_code: string | null;
    timezone: string;
  } | null;
  subscription: {
    status: string;
    current_period_end: string;
  } | null;
};

async function getAdminUsers(): Promise<{ users: UserRow[]; error?: string }> {
  const response = await fetch("/api/admin/users");
  const payload = (await response.json()) as { users: UserRow[]; error?: string };
  if (!response.ok) {
    throw new Error(payload.error ?? "Unable to fetch users.");
  }
  return payload;
}

function prettyDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export function UserManagementPanel() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [roleValue, setRoleValue] = useState<"subscriber" | "admin">("subscriber");
  const [fullName, setFullName] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [timezone, setTimezone] = useState("UTC");

  const usersQuery = useQuery({ queryKey: ["admin-users"], queryFn: getAdminUsers });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editingUserId) return;
      const response = await fetch(`/api/admin/users/${editingUserId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: roleValue,
          fullName,
          countryCode,
          timezone,
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to update user profile.");
      }
    },
    onSuccess: async () => {
      setEditingUserId(null);
      await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });

  const filteredUsers = useMemo(() => {
    const rows = usersQuery.data?.users ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => {
      return (
        row.email.toLowerCase().includes(q) ||
        row.role.toLowerCase().includes(q) ||
        (row.profile?.full_name ?? "").toLowerCase().includes(q) ||
        (row.subscription?.status ?? "").toLowerCase().includes(q)
      );
    });
  }, [search, usersQuery.data?.users]);

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="font-display text-2xl text-slate-900">User Management</h2>
      <p className="mt-1 text-sm text-slate-600">View users, update role, and maintain profile details.</p>

      <input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        className="mt-4 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
        placeholder="Search by email, role, name, or subscription status"
      />

      {usersQuery.isLoading ? <p className="mt-3 text-sm text-slate-600">Loading users...</p> : null}
      {usersQuery.error ? <p className="mt-3 text-sm text-red-600">{(usersQuery.error as Error).message}</p> : null}
      {updateMutation.error ? <p className="mt-3 text-sm text-red-600">{(updateMutation.error as Error).message}</p> : null}

      <div className="mt-5 space-y-3">
        {filteredUsers.map((row) => (
          <article key={row.id} className="rounded-2xl border border-slate-200 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-900">{row.email}</p>
              <span className="rounded-full border border-slate-300 px-2 py-0.5 text-xs font-semibold text-slate-700">
                {row.role}
              </span>
            </div>

            <div className="mt-1 grid gap-1 text-xs text-slate-600 sm:grid-cols-2">
              <p>Name: {row.profile?.full_name ?? "-"}</p>
              <p>Country: {row.profile?.country_code ?? "-"}</p>
              <p>Timezone: {row.profile?.timezone ?? "UTC"}</p>
              <p>Subscription: {row.subscription?.status ?? "none"}</p>
              <p>Period End: {row.subscription?.current_period_end ? prettyDate(row.subscription.current_period_end) : "-"}</p>
              <p>Created: {prettyDate(row.created_at)}</p>
            </div>

            <div className="mt-3">
              {editingUserId === row.id ? (
                <form
                  className="grid gap-2 sm:grid-cols-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    updateMutation.mutate();
                  }}
                >
                  <select
                    value={roleValue}
                    onChange={(event) => setRoleValue(event.target.value as "subscriber" | "admin")}
                    className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="subscriber">subscriber</option>
                    <option value="admin">admin</option>
                  </select>
                  <input
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Full name"
                  />
                  <input
                    value={countryCode}
                    onChange={(event) => setCountryCode(event.target.value)}
                    className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Country code"
                  />
                  <input
                    value={timezone}
                    onChange={(event) => setTimezone(event.target.value)}
                    className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Timezone"
                  />

                  <div className="sm:col-span-2 flex flex-wrap gap-2">
                    <button
                      type="submit"
                      disabled={updateMutation.isPending}
                      className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white"
                    >
                      {updateMutation.isPending ? "Saving..." : "Save"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingUserId(null)}
                      className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setEditingUserId(row.id);
                    setRoleValue(row.role);
                    setFullName(row.profile?.full_name ?? "");
                    setCountryCode(row.profile?.country_code ?? "");
                    setTimezone(row.profile?.timezone ?? "UTC");
                  }}
                  className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700"
                >
                  Edit User
                </button>
              )}
            </div>
          </article>
        ))}

        {!filteredUsers.length ? <p className="text-sm text-slate-600">No users in this view.</p> : null}
      </div>
    </section>
  );
}
