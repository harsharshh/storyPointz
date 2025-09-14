'use client';

import { useEffect, useRef, useState } from 'react';
import { useTheme } from './theme-provider';

type TriggerVariant = 'avatar' | 'chip' | 'icon';

export default function UserMenu({ userName = 'Guest user', variant = 'avatar' }: { userName?: string; variant?: TriggerVariant }) {
  const [open, setOpen] = useState(false);
  const [spectator, setSpectator] = useState(false);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const { theme, preference, setTheme, useSystem: setSystemPref } = useTheme();

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!open) return;
      const t = e.target as Node;
      if (!panelRef.current?.contains(t) && !btnRef.current?.contains(t)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Allow external toggles (from header chip or seat pencil)
  useEffect(() => {
    const toggle = () => setOpen((v) => !v);
    const openEdit = () => setOpen(true);
    window.addEventListener('spz:toggle-user-menu', toggle as EventListener);
    window.addEventListener('spz:edit-name', openEdit as EventListener);
    return () => {
      window.removeEventListener('spz:toggle-user-menu', toggle as EventListener);
      window.removeEventListener('spz:edit-name', openEdit as EventListener);
    };
  }, []);

  const trigger = (
    <button
      ref={btnRef}
      type="button"
      aria-haspopup="menu"
      aria-expanded={open}
      aria-label="User menu"
      onClick={() => setOpen((v) => !v)}
      className={
        variant === 'chip'
          ? 'inline-flex items-center gap-2 rounded-full border border-indigo-500/50 bg-white/70 px-3 py-1.5 text-sm font-semibold text-gray-900 backdrop-blur transition hover:bg-white/90 dark:border-indigo-400/40 dark:bg-white/10 dark:text-white dark:hover:bg-gray-900 hover:cursor-pointer'
          : variant === 'avatar'
          ? 'inline-flex h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-white/70 backdrop-blur text-gray-700 transition hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-white/10 dark:bg-white/10 dark:text-white'
          : 'inline-flex h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-white/70 backdrop-blur text-gray-700 transition hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-white/10 dark:bg-white/10 dark:text-white'
      }
    >
      {variant === 'chip' ? (
        <>
          <span className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-indigo-500 to-emerald-500 text-white">
            {(userName?.[0] || 'U').toUpperCase()}
          </span>
          <span className="max-w-[22vw] truncate">{userName || 'Guest user'}</span>
          <svg viewBox="0 0 24 24" className="h-4 w-4 opacity-70" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
        </>
      ) : variant === 'avatar' ? (
        <span className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-indigo-500 to-emerald-500 text-white font-bold">
          {(userName?.[0] || 'U').toUpperCase()}
        </span>
      ) : (
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M20 21a8 8 0 0 0-16 0"/>
          <circle cx="12" cy="8" r="4"/>
        </svg>
      )}
    </button>
  );

  return (
    <div className="relative">
      {/* Trigger */}
      {trigger}

      {/* Panel */}
      {open && (
        <div
          ref={panelRef}
          role="menu"
          className="absolute right-0 mt-2 w-72 overflow-hidden rounded-2xl border border-black/10 bg-white/95 shadow-xl backdrop-blur-md dark:border-white/10 dark:bg-[#111217]/95"
        >
          {/* Header */}
          <div className="flex items-center gap-3 p-4">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-indigo-500 to-emerald-500 text-white font-bold">
              {userName?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="min-w-0">
              <div className="truncate text-base font-semibold text-gray-900 dark:text-white">{userName || 'Guest user'}</div>
              <div className="text-sm text-gray-500 dark:text-white/60">Guest user</div>
            </div>
          </div>

          <div className="px-4 pb-3">
            <button
              className="w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-indigo-500"
              onClick={() => setOpen(false)}
            >
              Edit Name
            </button>
          </div>

          <div className="border-t border-black/5 dark:border-white/10" />

          {/* Items */}
          <ul className="py-2 text-sm">
            {/* <MenuItem
              icon={<svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M8 6h13M8 12h13M8 18h13"/><rect x="3" y="4" width="4" height="4" rx="1"/><rect x="3" y="10" width="4" height="4" rx="1"/><rect x="3" y="16" width="4" height="4" rx="1"/></svg>}
              label="My games"
              badge="PRO"
              onClick={() => setOpen(false)}
            /> */}

            <li className="flex items-center justify-between px-4 py-2">
              <button className="flex items-center gap-3 text-left text-gray-700 hover:text-gray-900 dark:text-white/80 dark:hover:text-white">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                <span>Spectator mode</span>
              </button>
              <label className="relative inline-flex h-6 w-11 cursor-pointer items-center">
                <input
                  type="checkbox"
                  className="peer sr-only"
                  checked={spectator}
                  onChange={(e) => setSpectator(e.target.checked)}
                />
                {/* Track */}
                <span className="absolute inset-0 rounded-full bg-gray-300 transition-colors peer-checked:bg-indigo-600 dark:bg-white/20" />
                {/* Thumb */}
                <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
              </label>
            </li>

            {/* Appearance */}
            {/* <li className="px-4 py-2">
              <div className="mb-2 flex items-center gap-2 text-gray-700 dark:text-white/80">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2m10-10h-2M4 12H2m15.364-7.364l-1.414 1.414M8.05 16.95l-1.414 1.414m12.728 0l-1.414-1.414M8.05 7.05 6.636 5.636"/></svg>
                <span>Appearance</span>
                <span className="ml-auto text-xs text-gray-500 dark:text-white/50">{preference === 'system' ? 'System' : theme === 'dark' ? 'Dark' : 'Light'}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => { setSystemPref(); }}
                  className={[
                    'cursor-pointer rounded-lg border px-3 py-1.5 text-sm font-medium transition',
                    preference === 'system' ? 'border-indigo-500 text-indigo-600 dark:border-indigo-400 dark:text-indigo-300' : 'border-black/10 text-gray-700 hover:bg-black/5 dark:border-white/10 dark:text-white/80 dark:hover:bg-white/10'
                  ].join(' ')}
                  aria-pressed={preference === 'system'}
                >
                  System
                </button>
                <button
                  type="button"
                  onClick={() => { setTheme('light'); }}
                  className={[
                    'cursor-pointer rounded-lg border px-3 py-1.5 text-sm font-medium transition',
                    preference === 'light' ? 'border-indigo-500 text-indigo-600 dark:border-indigo-400 dark:text-indigo-300' : 'border-black/10 text-gray-700 hover:bg-black/5 dark:border-white/10 dark:text-white/80 dark:hover:bg-white/10'
                  ].join(' ')}
                  aria-pressed={preference === 'light'}
                >
                  Light
                </button>
                <button
                  type="button"
                  onClick={() => { setTheme('dark'); }}
                  className={[
                    'cursor-pointer rounded-lg border px-3 py-1.5 text-sm font-medium transition',
                    preference === 'dark' ? 'border-indigo-500 text-indigo-600 dark:border-indigo-400 dark:text-indigo-300' : 'border-black/10 text-gray-700 hover:bg-black/5 dark:border-white/10 dark:text-white/80 dark:hover:bg-white/10'
                  ].join(' ')}
                  aria-pressed={preference === 'dark'}
                >
                  Dark
                </button>
              </div>
            </li> */}

            <li className="flex items-center justify-between px-4 py-2">
              <button
                className="flex items-center gap-3 text-left text-gray-700 hover:text-gray-900 dark:text-white/80 dark:hover:text-white"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2m10-10h-2M4 12H2m15.364-7.364l-1.414 1.414M8.05 16.95l-1.414 1.414m12.728 0l-1.414-1.414M8.05 7.05 6.636 5.636"/></svg>
                <span>Appearance</span>
              </button>
              <span className="text-xs text-gray-500 dark:text-white/50">{'System'}</span>
            </li>

            {/* <MenuItem
              icon={<svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v4"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>}
              label="Login"
              onClick={() => setOpen(false)}
            />

            <MenuItem
              icon={<svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10 17l5-5-5-5"/><path d="M15 12H3"/><path d="M21 21V3"/></svg>}
              label="Sign up"
              onClick={() => setOpen(false)}
            />

            <MenuItem
              icon={<svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>}
              label="Sign out"
              onClick={() => setOpen(false)}
            /> */}
          </ul>
        </div>
      )}
    </div>
  );
}
