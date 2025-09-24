'use client';

import { useEffect, useRef, useState } from 'react';
import { useTheme } from './theme-provider';

type SessionSummary = { id: string; name: string };

type TriggerVariant = 'avatar' | 'chip' | 'icon';

export default function UserMenu({ userName = 'Guest user', variant = 'avatar', sessionId, onNameUpdated }: { userName?: string; variant?: TriggerVariant; sessionId?: string; onNameUpdated?: (name: string) => void }) {
  const [open, setOpen] = useState(false);
  const [spectator, setSpectator] = useState(false);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const { preference, setTheme, useSystem: setSystemPref } = useTheme();

  const [displayName, setDisplayName] = useState(userName || 'Guest user');
  const [editNameOpen, setEditNameOpen] = useState(false);
  const [nameInput, setNameInput] = useState(userName || 'Guest user');
  const [nameSaving, setNameSaving] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  const [showSessions, setShowSessions] = useState(false);
  const [sessions, setSessions] = useState<SessionSummary[] | null>(null);
  const [sessLoading, setSessLoading] = useState(false);
  const [sessError, setSessError] = useState<string | null>(null);
  const [sessionsMode, setSessionsMode] = useState<'team' | 'mine'>('team');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const copyTimerRef = useRef<number | null>(null);
  useEffect(() => {
    return () => {
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);
        copyTimerRef.current = null;
      }
    };
  }, []);

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

  // Initialize spectator toggle from localStorage per-session
  useEffect(() => {
    if (!sessionId) return;
    try {
      const raw = localStorage.getItem(`spz_spectator_self_${sessionId}`);
      if (raw === 'true') setSpectator(true);
      if (raw === 'false') setSpectator(false);
    } catch {}
  }, [sessionId]);

  // Keep local switch in sync when other parts of the app toggle spectator
  useEffect(() => {
    const onExternal = (e: Event) => {
      const detail = (e as CustomEvent)?.detail as { spectator?: boolean } | undefined;
      if (typeof detail?.spectator === 'boolean') {
        setSpectator(detail.spectator);
        try {
          if (sessionId) localStorage.setItem(`spz_spectator_self_${sessionId}`, String(detail.spectator));
        } catch {}
      }
    };
    window.addEventListener('spz:set-spectator', onExternal as EventListener);
    return () => window.removeEventListener('spz:set-spectator', onExternal as EventListener);
  }, [sessionId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowSessions(false);
    };
    if (showSessions) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [showSessions]);

  useEffect(() => {
    setDisplayName(userName || 'Guest user');
    if (!editNameOpen) setNameInput(userName || 'Guest user');
  }, [userName, editNameOpen]);

  const sessionUrl = (id: string) => `${window.location.origin}/session/${id}`;

  const openEditName = () => {
    setNameError(null);
    setNameInput(displayName);
    setEditNameOpen(true);
  };

  const closeEditName = () => {
    if (nameSaving) return;
    setEditNameOpen(false);
    setNameError(null);
  };

  const readStoredUser = () => {
    try {
      const raw = localStorage.getItem('spz_user');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed as { id?: string; name?: string };
    } catch {}
    return null;
  };

  async function saveName() {
    const trimmed = nameInput.trim();
    if (!trimmed) {
      setNameError('Please enter a name');
      return;
    }
    if (!sessionId) {
      setNameError('Missing session context. Refresh and try again.');
      return;
    }

    const nextName = trimmed;
    setNameSaving(true);
    setNameError(null);

    try {
      const stored = readStoredUser();
      const payload: Record<string, unknown> = { name: nextName };
      if (stored?.id) payload.userId = stored.id;

      const res = await fetch(`/api/session/${encodeURIComponent(sessionId)}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json().catch(() => ({}));
      const userId = typeof data?.userId === 'string' ? data.userId : stored?.id;

      if (!userId) throw new Error('Could not confirm user id');

      try {
        localStorage.setItem('spz_user', JSON.stringify({ id: userId, name: nextName }));
      } catch {}

      setDisplayName(nextName);
      setEditNameOpen(false);
      onNameUpdated?.(nextName);
      try {
        window.dispatchEvent(new CustomEvent('spz:user-name-updated', { detail: { userId, name: nextName } }));
      } catch {}
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unable to save name';
      setNameError(message || 'Unable to save name');
    } finally {
      setNameSaving(false);
    }
  }

  async function fetchSessions(mode: 'team' | 'mine' = sessionsMode) {
    try {
      setSessError(null);
      setSessLoading(true);
      setSessions(null);

      let url = '/api/session';
      let headers: Record<string, string> | undefined = undefined;

      if (mode === 'mine') {
        url = '/api/session?scope=mine';
        let uid: string | null = null;
        try {
          const raw = localStorage.getItem('spz_user');
          if (raw) {
            const parsed = JSON.parse(raw);
            uid = String(parsed?.id ?? parsed?.userId ?? '').trim() || null;
          }
        } catch {}
        if (!uid) throw new Error('No user found in localStorage (spz_user)');
        headers = { 'x-user-id': uid };
      }

      const res = await fetch(url, { method: 'GET', headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const raw = Array.isArray(data?.sessions) ? data.sessions : [] as unknown[];
      const normalized: SessionSummary[] = (raw as Array<{ id?: unknown; name?: unknown }>)
        .map((r) => ({
          id: String(r.id ?? ''),
          name: typeof r.name === 'string' ? r.name : 'Untitled',
        }))
        .filter((r): r is SessionSummary => Boolean(r.id));
      setSessions(normalized);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setSessError(msg || 'Failed to load sessions');
    } finally {
      setSessLoading(false);
    }
  }

  function openSessionsModal(mode: 'team' | 'mine') {
    setSessionsMode(mode);
    setShowSessions(true);
    fetchSessions(mode);
  }

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
            {(displayName?.[0] || 'U').toUpperCase()}
          </span>
          <span className="max-w-[22vw] truncate">{displayName}</span>
          <svg viewBox="0 0 24 24" className="h-4 w-4 opacity-70" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
        </>
      ) : variant === 'avatar' ? (
        <span className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-indigo-500 to-emerald-500 text-white font-bold">
          {(displayName?.[0] || 'U').toUpperCase()}
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
              {displayName?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="truncate text-base font-semibold text-gray-900 dark:text-white">{displayName}</span>
                <button
                  type="button"
                  onClick={openEditName}
                  className="inline-grid h-7 w-7 shrink-0 place-items-center rounded-full border border-black/10 text-gray-600 transition hover:bg-black/5 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-white/10 dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white"
                  title="Edit name"
                  aria-label="Edit name"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4Z" />
                  </svg>
                </button>
              </div>
              <div className="text-sm text-gray-500 dark:text-white/60">Guest user</div>
            </div>
          </div>

          <div className="px-4 pb-3">
            <button
              className="w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-indigo-500"
              onClick={() => { setOpen(false); openSessionsModal('team'); }}
            >
              Team Sessions
            </button>
          </div>
          <div className="px-4 pb-3">
            <button
              className="w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-emerald-500"
              onClick={() => { setOpen(false); openSessionsModal('mine'); }}
            >
              My Sessions
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
                
                <span>Spectator mode</span>
              </button>
              <label className="relative inline-flex h-6 w-11 cursor-pointer items-center">
                <input
                  type="checkbox"
                  className="peer sr-only"
                  checked={spectator}
                  onChange={(e) => {
                    const next = e.target.checked;
                    setSpectator(next);
                    try { if (sessionId) localStorage.setItem(`spz_spectator_self_${sessionId}`, String(next)); } catch {}
                    try { window.dispatchEvent(new CustomEvent('spz:set-spectator', { detail: { spectator: next } })); } catch {}
                  }}
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

            <li className="px-4 py-2">
              <div className="flex items-center gap-2 text-gray-700 dark:text-white/80">
                <span className="text-sm font-medium">Appearance</span>
                <div className="ml-auto flex items-center gap-2">
                  {/* System (neutral) */}
                  <button
                    type="button"
                    onClick={() => { setSystemPref(); }}
                    aria-label="System theme"
                    title="System"
                    aria-pressed={preference === 'system'}
                    className={[
                      'h-8 w-8 shrink-0 rounded-full border transition',
                      'grid place-items-center',
                      preference === 'system'
                        ? 'border-indigo-500 bg-indigo-500/70 text-white dark:border-indigo-500 dark:bg-indigo-500/70 dark:text-white'
                        : 'border-black/10 text-gray-600 hover:bg-black/5 dark:border-white/10 dark:text-white/80 dark:hover:bg-white/10'
                    ].join(' ')}
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M7 20h10"/></svg>
                  </button>

                  {/* Light (orange) */}
                  <button
                    type="button"
                    onClick={() => { setTheme('light'); }}
                    aria-label="Light theme"
                    title="Light"
                    aria-pressed={preference === 'light'}
                    className={[
                      'h-8 w-8 shrink-0 rounded-full border transition focus:outline-none ',
                      'grid place-items-center',
                      preference === 'light'
                        ? 'border-orange-500 bg-orange-100 text-orange-600 dark:border-orange-400 dark:bg-orange-200/20 dark:text-orange-300'
                        : 'border-black/10 text-gray-600 hover:bg-black/5 dark:border-white/10 dark:text-white/80 dark:hover:bg-white/10'
                    ].join(' ')}
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2m10-10h-2M4 12H2m15.364-7.364l-1.414 1.414M8.05 16.95l-1.414 1.414m12.728 0l-1.414-1.414M8.05 7.05 6.636 5.636"/></svg>
                  </button>

                  {/* Dark (blue) */}
                  <button
                    type="button"
                    onClick={() => { setTheme('dark'); }}
                    aria-label="Dark theme"
                    title="Dark"
                    aria-pressed={preference === 'dark'}
                    className={[
                      'h-8 w-8 shrink-0 rounded-full border transition focus:outline-none ',
                      'grid place-items-center',
                      preference === 'dark'
                        ? 'border-blue-600 bg-blue-100 text-blue-700 dark:border-blue-400 dark:bg-blue-200/20 dark:text-blue-300'
                        : 'border-black/10 text-gray-600 hover:bg-black/5 dark:border-white/10 dark:text-white/80 dark:hover:bg-white/10'
                    ].join(' ')}
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                  </button>
                </div>
              </div>
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

      {showSessions && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowSessions(false)} />

          {/* Dialog */}
          <div role="dialog" aria-modal="true" className="relative z-[101] w-[min(92vw,720px)] max-h-[80vh] overflow-hidden rounded-2xl border border-black/10 bg-white shadow-2xl dark:border-white/10 dark:bg-[#111217]">
            {/* Header */}
            <div className="flex items-center justify-between gap-3 border-b border-black/5 px-5 py-4 dark:border-white/10">
            <div className="flex items-center gap-2">
              <svg viewBox="0 0 24 24" className="h-5 w-5 text-gray-700 dark:text-white/80" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 8h10M7 12h10M7 16h6"/></svg>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">{sessionsMode === 'mine' ? 'My Sessions' : 'Team Sessions'}</h2>
            </div>
              <div className="flex items-center gap-2">
                <button onClick={() => fetchSessions(sessionsMode)} className="inline-flex items-center gap-2 rounded-lg border border-black/10 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-white/10 dark:text-white/80 dark:hover:bg-white/10" disabled={sessLoading}>
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-9-9"/><path d="M21 3v9h-9"/></svg>
                  {sessLoading ? 'Refreshing…' : 'Refresh'}
                </button>
                <button onClick={() => setShowSessions(false)} className="rounded-lg p-2 text-gray-700 hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white dark:hover:bg-white/10" aria-label="Close">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="max-h-[60vh] overflow-auto px-5 py-4">
              {sessError && (
                <div className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">{sessError}</div>
              )}
              {sessLoading && !sessions && (
                <div className="py-8 text-center text-sm text-gray-600 opacity-80 dark:text-white/70">Loading your sessions…</div>
              )}
              {!sessLoading && sessions && sessions.length === 0 && (
                <div className="py-8 text-center text-sm text-gray-600 opacity-80 dark:text-white/70">No sessions found.</div>
              )}
              {sessions && sessions.length > 0 && (
                <ul className="divide-y divide-black/5 dark:divide-white/10">
                  {sessions.map((s) => {
                    const href = sessionUrl(s.id);
                    return (
                      <li key={s.id} className="flex flex-wrap items-center gap-3 py-3">
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium text-gray-900 dark:text-white">{s.name || 'Untitled session'}</div>
                          <div className="truncate text-xs text-gray-500 dark:text-white/60">{s.id}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            className="cursor-pointer rounded-lg border border-black/10 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-white/10 dark:text-white/80 dark:hover:bg-white/10"
                            onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(href);
                            setCopiedId(s.id);
                            if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
                            copyTimerRef.current = window.setTimeout(() => {
                              setCopiedId(null);
                              copyTimerRef.current = null;
                            }, 1500);
                          } catch {}
                            }}
                            title={copiedId === s.id ? 'Copied' : 'Copy link'}
                            aria-live="polite"
                          >
                            {copiedId === s.id ? 'Copied' : 'Copy link'}
                          </button>
                          <a
                            href={href}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 dark:bg-indigo-500"
                            title="Open session"
                          >
                            Open
                            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17 17 7"/><path d="M7 7h10v10"/></svg>
                          </a>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {editNameOpen && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeEditName} />
          <div className="relative z-[96] w-full max-w-md overflow-hidden rounded-2xl border border-black/10 bg-white shadow-2xl dark:border-white/10 dark:bg-[#111217]">
            <div className="flex items-center justify-between border-b border-black/5 px-5 py-4 dark:border-white/10">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Edit name</h2>
              <button
                type="button"
                onClick={closeEditName}
                className="inline-grid h-9 w-9 place-items-center rounded-lg border border-black/10 text-gray-700 hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-white/10 dark:text-white dark:hover:bg-white/10"
                aria-label="Close"
                disabled={nameSaving}
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="space-y-4 px-5 py-4">
              <div className="space-y-2">
                <label htmlFor="spz-edit-name" className="block text-sm font-medium text-gray-800 dark:text-white/90">Display name</label>
                <input
                  id="spz-edit-name"
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="w-full rounded-xl border border-black/10 bg-white/90 px-4 py-3 text-gray-900 placeholder:text-gray-400 outline-none ring-0 transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-300 dark:border-white/10 dark:bg-white/10 dark:text-white dark:placeholder:text-white/50 dark:focus:border-indigo-500"
                  placeholder="Guest user"
                  disabled={nameSaving}
                  autoFocus
                />
                {nameError && <p className="text-sm text-red-600 dark:text-red-400">{nameError}</p>}
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={closeEditName}
                  className="rounded-xl border border-black/10 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-white/10 dark:text-white dark:hover:bg-white/10"
                  disabled={nameSaving}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveName}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-indigo-500"
                  disabled={nameSaving}
                >
                  {nameSaving && (
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" d="M4 12a8 8 0 0 1 8-8" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                    </svg>
                  )}
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
