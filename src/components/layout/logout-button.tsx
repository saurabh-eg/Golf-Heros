"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  async function onLogout() {
    setIsPending(true);

    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) {
        setIsPending(false);
        return;
      }

      router.push("/auth/login");
      router.refresh();
    } catch {
      setIsPending(false);
    }
  }

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={onLogout}
      className="transition-colors hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {isPending ? "Signing out..." : "Logout"}
    </button>
  );
}
