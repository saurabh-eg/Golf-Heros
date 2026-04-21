"use client";

import { FormEvent, useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [nextPath] = useState(() => {
    if (typeof window === "undefined") return "/dashboard";
    const next = new URLSearchParams(window.location.search).get("next");
    return next?.startsWith("/") ? next : "/dashboard";
  });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");

    const response = await fetch("/api/auth/magic-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, next: nextPath }),
    });

    const result = (await response.json()) as { message?: string; error?: string };

    if (!response.ok) {
      setStatus("error");
      setMessage(result.error ?? "Unable to send sign-in link.");
      return;
    }

    setStatus("success");
    setMessage(result.message ?? "Check your inbox for a sign-in link.");
  }

  return (
    <section className="mx-auto w-full max-w-lg px-4 py-16 sm:px-6">
      <h1 className="font-display text-4xl text-slate-950">Sign in</h1>
      <p className="mt-2 text-sm text-slate-600">Use your email to receive a secure magic link.</p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
        <label className="block text-sm font-medium text-slate-700" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-300 focus:ring"
          placeholder="you@example.com"
        />

        <button
          type="submit"
          disabled={status === "loading"}
          className="inline-flex w-full items-center justify-center rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-70"
        >
          {status === "loading" ? "Sending link..." : "Send magic link"}
        </button>

        {message ? <p className="text-sm text-slate-600">{message}</p> : null}
      </form>
    </section>
  );
}
