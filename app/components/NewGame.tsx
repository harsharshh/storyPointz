"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewGame() {
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please enter a session name.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      router.push(`/session/${data.sessionId}`);
    } catch (err) {
      setError("Could not create session. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <form onSubmit={onSubmit} className="space-y-6">
        <div className="space-y-2">
          <label htmlFor="sessionName" className="block text-sm font-medium">
            Game’s name
          </label>
          <input
            id="sessionName"
            type="text"
            placeholder="Sprint Planning"
            className="w-full rounded-xl border border-black/10 bg-white/60 px-4 py-3 outline-none ring-0 transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-300 dark:border-white/10 dark:bg-white/5 dark:focus:border-indigo-500"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={submitting}
          />
        </div>

        {/* Voting system (placeholder for now) */}
        <div className="space-y-2">
          <label className="block text-sm font-medium">Voting system</label>
          <div className="rounded-xl border border-black/10 bg-white/60 px-4 py-3 text-sm text-gray-700 dark:border-white/10 dark:bg-white/5 dark:text-white/80">
            Fibonacci (0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, ?, ☕)
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex w-full items-center justify-center rounded-xl bg-indigo-600 py-3 text-base font-semibold text-white shadow-sm transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-indigo-500"
        >
          {submitting ? "Creating…" : "Create session"}
        </button>
      </form>
    </div>
  );
}