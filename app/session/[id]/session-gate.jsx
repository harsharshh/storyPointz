

"use client";

import { useEffect, useRef, useState } from "react";
import RoomShell from "./room-shell";

export default function SessionGate({ sessionId, sessionName }) {
  const [user, setUser] = useState(null);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const modalRef = useRef(null);

  // Read user from localStorage (if present) and skip modal
  useEffect(() => {
    try {
      const raw = localStorage.getItem("spz_user");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.id && parsed.name) {
          setUser(parsed);
          setLoading(false);
          return;
        }
      }
    } catch (_) {}
    setLoading(false);
  }, []);

  async function handleJoin(e) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/session/${encodeURIComponent(sessionId)}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const payload = { id: data.userId, name: trimmed };
      localStorage.setItem("spz_user", JSON.stringify(payload));
      setUser(payload);
    } catch (err) {
      console.error("join failed", err);
      alert("Could not join session. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // If user exists (from storage or just joined), render basic room shell
  if (!loading && user) return <RoomShell sessionId={sessionId} sessionName={sessionName} user={user} />;

  // Otherwise show the gate modal asking for name
  return (
    <div className="mx-auto max-w-xl">
      {/* overlay */}
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" />
      <div ref={modalRef} className="fixed inset-0 z-50 grid place-items-center p-4">
        <div className="w-full max-w-md overflow-hidden rounded-2xl border border-black/10 bg-white shadow-2xl dark:border-white/10 dark:bg-[#0f1115]">
          <div className="border-b border-black/5 p-5 dark:border-white/10">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Join session</h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-white/60">{sessionName}</p>
          </div>
          <form onSubmit={handleJoin} className="space-y-4 p-5">
            <div className="space-y-2">
              <label htmlFor="spz-name" className="block text-sm font-medium text-gray-800 dark:text-white/90">Your name</label>
              <input
                id="spz-name"
                type="text"
                className="w-full rounded-xl border border-black/10 bg-white/90 px-4 py-3 text-gray-900 placeholder:text-gray-400 outline-none ring-0 transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-300 dark:border-white/10 dark:bg-white/10 dark:text-white dark:placeholder:text-white/50 dark:focus:border-indigo-500"
                placeholder="Guest user"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={submitting}
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-base font-semibold text-white shadow-sm transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-indigo-500"
            >
              {submitting && (
                <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
              )}
              {submitting ? "Joining…" : "Join session"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
