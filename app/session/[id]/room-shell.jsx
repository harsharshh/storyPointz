"use client";

import { useEffect, useState } from "react";
import Header from "../../components/header";

export default function RoomShell({ sessionId, sessionName, user }) {
  const values = ["0", "1", "2", "3", "5", "8", "13", "21", "34", "55", "89", "?", "☕"];
  const [selected, setSelected] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1400);
    return () => clearTimeout(t);
  }, [copied]);

  async function copyInviteLink() {
    try {
      const url = `${location.origin}/session/${encodeURIComponent(sessionId)}`;
      await navigator.clipboard?.writeText?.(url);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="relative min-h-screen">
      <Header userName={user?.name} />

      {/* Stage */}
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex min-h-[70vh] flex-col items-center justify-center gap-8 pt-24 pb-44">
          {/* Lonely + Invite */}
          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-white/70">Feeling lonely? 🥱</p>
            <button
              onClick={copyInviteLink}
              className="mt-1 text-base font-semibold text-indigo-600 hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-indigo-400"
            >
              {copied ? "Invite link copied!" : "Invite players"}
            </button>
          </div>

          {/* Board bubble */}
          <div className="w-full max-w-xl rounded-3xl border bg-indigo-50/60 p-8 text-center text-gray-800 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-white">
            <div className="text-sm font-medium">Pick your cards!</div>
          </div>

          {/* You */}
          <div className="mt-2 flex flex-col items-center gap-2">
            <div className="h-16 w-12 rounded-md bg-gray-400/50 dark:bg-white/10" />
            <div className="text-sm font-semibold text-gray-900 dark:text-white">{user?.name}</div>
          </div>
        </div>
      </div>

      {/* Bottom cards rail */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30">
        <div className="mx-auto max-w-6xl px-6 pb-6">
          <div className="pointer-events-auto rounded-2xl border border-black/10 bg-white/80 p-4 backdrop-blur-md dark:border-white/10 dark:bg-[#0f1115]/80">
            <div className="mb-3 text-center text-sm text-gray-700 dark:text-white/80">Choose your card 👇</div>
            <div className="flex flex-wrap items-center justify-center gap-3">
              {values.map((v) => {
                const isSel = selected === v;
                const isCoffee = v === "☕";
                return (
                  <button
                    key={v}
                    onClick={() => setSelected(v)}
                    className={[
                      "aspect-[3/4] w-12 select-none rounded-xl border-2 bg-transparent text-sm font-semibold transition",
                      "hover:bg-indigo-600/10 dark:hover:bg-indigo-400/10",
                      isSel
                        ? "border-indigo-600 bg-indigo-600 text-white dark:border-indigo-500 dark:bg-indigo-500"
                        : "border-indigo-400 text-indigo-700 dark:border-indigo-400/70 dark:text-indigo-300",
                    ].join(" ")}
                    aria-pressed={isSel}
                    aria-label={isCoffee ? "Coffee break" : `Vote ${v}`}
                  >
                    {isCoffee ? "☕" : v}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom-left helper button */}
      <button
        type="button"
        className="fixed bottom-6 left-6 z-30 grid h-12 w-12 place-items-center rounded-full border border-black/10 bg-white/80 text-xl shadow backdrop-blur dark:border-white/10 dark:bg-[#0f1115]/80"
        aria-label="Assistant"
      >
        🤖
      </button>
    </div>
  );
}
