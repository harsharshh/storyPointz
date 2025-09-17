"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import Header from "./header";

export default function NewGame() {
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const root = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const el = root.current;
    if (!el) return;
    gsap.fromTo(
      el.querySelectorAll("form, h1, label, input, button, div"),
      { autoAlpha: 0, y: 20 },
      {
        autoAlpha: 1,
        y: 0,
        duration: 0.6,
        ease: "power2.out",
        stagger: 0.08,
      }
    );
  }, { scope: root });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please enter a session name.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      router.push(`/session/${encodeURIComponent(data.sessionId)}`);
    } catch {
      setError("Could not create session. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div ref={root} className="w-full max-w-2xl mx-auto text-gray-900 dark:text-white">
      <Header/>
      <form onSubmit={onSubmit} className="space-y-6">
        <div className="space-y-2">
          <label htmlFor="sessionName" className="block text-sm font-medium text-gray-800 dark:text-white/90">
            Session&apos;s name
          </label>
          <input
            id="sessionName"
            type="text"
            placeholder="Sprint Planning"
            className="w-full rounded-xl border border-black/10 bg-white/90 px-4 py-3 text-gray-900 placeholder:text-gray-400 outline-none ring-0 transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-300 dark:border-white/10 dark:bg-white/10 dark:text-white dark:placeholder:text-white/50 dark:focus:border-indigo-500"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={submitting}
          />
        </div>

        {/* Voting system (placeholder for now) */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-800 dark:text-white/90">Voting system</label>
          <div className="rounded-xl border border-black/10 bg-white/90 px-4 py-3 text-sm text-gray-800 dark:border-white/10 dark:bg-white/10 dark:text-white/85">
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
          {submitting ? (
            <span className="flex items-center gap-2">
              <svg
                className="h-5 w-5 animate-spin text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                />
              </svg>
              Creating…
            </span>
          ) : (
            "Create session"
          )}
        </button>
      </form>
    </div>
  );
}
