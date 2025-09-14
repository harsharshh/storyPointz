"use client";

import React from "react";

type StoriesDrawerProps = {
  open: boolean;
  onClose: () => void;
};

export default function StoriesDrawer({ open, onClose }: StoriesDrawerProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70]">
      
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <aside className="absolute right-0 top-0 z-[71] h-full w-[92vw] max-w-md overflow-y-auto border-l border-black/10 bg-gradient-to-br from-indigo-300 via-emerald-100 to-white p-4 shadow-2xl dark:border-white/10 
      dark:bg-[radial-gradient(60%_40%_at_50%_0%,rgba(109,93,246,0.35),transparent_70%),radial-gradient(40%_40%_at_100%_60%,rgba(34,197,94,0.25),transparent_70%),linear-gradient(to_bottom,#0B0B10,rgba(11,11,16,0.85))]">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-extrabold text-gray-900 dark:text-white">Stories</h3>
            <p className="text-xs text-gray-500 dark:text-white/60">1 Story</p>
          </div>
          <div className="flex items-center gap-2">
            
            <button className="inline-grid h-9 w-9 place-items-center rounded-lg border border-black/10 text-gray-700 dark:border-white/10 dark:text-white" aria-label="Close" onClick={onClose}>
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>
        </div>

        {/* Example story card */}
        <div className="space-y-3">
          <div className="rounded-2xl border border-black/10 bg-gray-100 p-4 text-gray-900 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-white">
            <div className="mb-2 flex items-center justify-between text-sm font-semibold opacity-80">
              <span>PP-1</span>
              <button className="inline-grid h-8 w-8 place-items-center rounded-lg border border-black/10 text-gray-700 hover:bg-black/5 dark:border-white/10 dark:text-white/80 dark:hover:bg-white/10" title="Menu">•••</button>
            </div>
            <div className="mb-3 text-sm">Test</div>
            <div className="flex items-center justify-between">
              <button className="rounded-xl bg-gray-700 px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-600">Vote this issue</button>
              <button className="inline-grid h-8 w-8 place-items-center rounded-lg border border-black/10 text-gray-700 hover:bg-black/5 dark:border-white/10 dark:text-white/80 dark:hover:bg-white/10">-</button>
            </div>
          </div>

          <button className="mt-2 inline-flex w-full items-center justify-start gap-2 rounded-2xl border border-black/10 bg-white/70 px-4 py-3 text-sm font-semibold text-gray-900 backdrop-blur hover:bg-white/90 dark:border-white/10 dark:bg-white/10 dark:text-white">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
            Add another issue
          </button>
        </div>
      </aside>
    </div>
  );
}

