'use client';

import Link from 'next/link';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { useRef, useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import UserMenu from './user-menu';
import StoriesDrawer from './stories-drawer';

export default function Header({ userName, sessionName, sessionId, onUserNameChange }: { userName?: string; sessionName?: string; sessionId?: string; onUserNameChange?: (name: string) => void } = {}) {
  const logoRef = useRef<HTMLAnchorElement | null>(null);
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [storiesOpen, setStoriesOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileOpen(false);
        setInviteOpen(false);
        setStoriesOpen(false);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1400);
    return () => clearTimeout(t);
  }, [copied]);

  useGSAP(() => {
    // Subtle intro: fade + slight rise + letter spacing ease
    const el = logoRef.current;
    if (!el) return;
    const text = el.querySelector('[data-spz-word]');
    gsap.fromTo(
      el,
      { opacity: 0, y: 6 },
      { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' }
    );
    gsap.fromTo(
      text,
      { letterSpacing: '-0.02em' },
      { letterSpacing: '0em', duration: 0.8, ease: 'power2.out', delay: 0.1 }
    );
  }, []);

  return (
    <header className="fixed top-0 left-0 z-50 w-full">
      <div className="mx-auto flex h-14 max-w-8xl items-center justify-between px-4 sm:h-16 sm:px-6">
        {/* Top extreme left brand */}
        <div className="inline-flex items-center gap-3">
          <Link ref={logoRef} href="/" aria-label="StoryPointz home" className="inline-flex select-none items-center">
            <span
              data-spz-word
              className="text-lg font-extrabold tracking-tight sm:text-xl md:text-2xl text-transparent bg-clip-text 
                         bg-gradient-to-r from-indigo-600 via-emerald-500 to-indigo-600 
                         dark:from-indigo-400 dark:via-emerald-400 dark:to-indigo-400"
            >
              StoryPointz
            </span>
          </Link>
          {pathname !== '/' && pathname !== '/session/new' && sessionName && (
            <span
              title={sessionName}
              className="hidden sm:inline-flex max-w-[50vw] items-center truncate rounded-full px-4 py-1.5 text-sm font-semibold text-white shadow-sm ring-1 ring-indigo-500/30 bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-600 backdrop-blur dark:from-indigo-500 dark:via-indigo-400 dark:to-indigo-500"
            >
              {sessionName}
            </span>
          )}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-3">
          {pathname !== '/' && pathname !== '/session/new' && (
            <>
              {/* Desktop actions */}
              <div className="hidden items-center gap-3 sm:flex">
                <UserMenu userName={userName} variant="chip" sessionId={sessionId} onNameUpdated={onUserNameChange} />
                <button
                  type="button"
                  onClick={() => setInviteOpen(true)}
                  className="cursor-pointer inline-flex items-center gap-2 rounded-2xl border-2 border-indigo-500 px-4 py-2 text-sm font-bold text-indigo-600 transition hover:bg-indigo-50 dark:border-indigo-400 dark:text-indigo-300 dark:hover:bg-indigo-500/10"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M19 8v6M22 11h-6"/>
                  </svg>
                  Invite players
                </button>
                <div className="relative group">
                  <button
                    type="button"
                    className="cursor-pointer inline-grid h-9 w-9 place-items-center rounded-xl border-2 border-indigo-500 text-indigo-600 transition hover:bg-indigo-50 dark:border-indigo-400 dark:text-indigo-300 dark:hover:bg-indigo-500/10"
                    aria-label="Stories"
                    onClick={() => setStoriesOpen(true)}
                  >
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2"/>
                      <path d="M8 8h8M8 12h8M8 16h8"/>
                    </svg>
                  </button>
                  <span className="pointer-events-none absolute left-1/2 top-[44px] -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 dark:bg-white/10 dark:text-white">Stories</span>
                </div>
              </div>

              {/* Mobile hamburger */}
              <button
                type="button"
                className="sm:hidden inline-grid h-9 w-9 place-items-center rounded-xl border border-black/10 bg-white/70 text-gray-800 backdrop-blur dark:border-white/10 dark:bg-white/10 dark:text-white"
                aria-label="Open menu"
                onClick={() => setMobileOpen(true)}
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
              </button>

              {/* Mobile sidebar */}
              {mobileOpen && (
                <>
                  <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
                  <div className="fixed right-0 top-0 z-[61] h-full w-[82vw] max-w-sm overflow-y-auto border-l border-black/10 bg-white p-4 shadow-xl dark:border-white/10 dark:bg-[#111217]">
                    <div className="mb-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="grid h-10 w-10 place-items-center rounded-full bg-indigo-100 text-lg font-bold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">
                          {(userName?.[0] || 'U').toUpperCase()}
                        </span>
                        <div className="text-base font-semibold text-gray-900 dark:text-white truncate max-w-[50vw]">
                          {userName || 'Guest user'}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="inline-grid h-9 w-9 place-items-center rounded-lg border border-black/10 text-gray-700 dark:border-white/10 dark:text-white"
                        aria-label="Close"
                        onClick={() => setMobileOpen(false)}
                      >
                        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
                      </button>
                    </div>

                    <div className="space-y-3">
                      <button
                        type="button"
                        onClick={() => { window.dispatchEvent(new Event('spz:edit-name')); setMobileOpen(false); }}
                        className="w-full rounded-xl border border-black/10 bg-white/80 px-4 py-2.5 text-left text-sm font-semibold text-gray-800 transition hover:bg-white/90 dark:border-white/10 dark:bg-white/10 dark:text-white"
                      >
                        Edit name
                      </button>
                      <button
                        type="button"
                        onClick={() => { setInviteOpen(true); setMobileOpen(false); }}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-indigo-500 px-4 py-3 text-sm font-bold text-indigo-600 transition hover:bg-indigo-50 dark:border-indigo-400 dark:text-indigo-300 dark:hover:bg-indigo-500/10"
                      >
                        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"/>
                          <circle cx="9" cy="7" r="4"/>
                          <path d="M19 8v6M22 11h-6"/>
                        </svg>
                        Invite players
                      </button>
                      <button
                        type="button"
                        className="inline-flex h-11 w-11 items-center justify-center rounded-xl border-2 border-indigo-500 text-indigo-600 dark:border-indigo-400 dark:text-indigo-300"
                        title="Stories"
                        onClick={() => { setMobileOpen(false); setStoriesOpen(true); }}
                      >
                        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="4" width="7" height="16" rx="2"/>
                          <rect x="14" y="4" width="7" height="16" rx="2"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </>
          ) }
        </div>
      </div>

      {/* Invite players modal */}
      {inviteOpen && (
        <div className="fixed inset-0 z-[70] grid place-items-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setInviteOpen(false)} />
          <div className="relative z-[71] w-full max-w-lg overflow-hidden rounded-2xl border border-black/10 bg-white shadow-2xl dark:border-white/10 dark:bg-[#0f1115]">
            <div className="flex items-center justify-between border-b border-black/5 p-5 dark:border-white/10">
              <h3 className="text-xl font-extrabold text-gray-900 dark:text-white">Invite players</h3>
              <button
                type="button"
                className="inline-grid h-9 w-9 place-items-center rounded-lg border border-black/10 text-gray-700 dark:border-white/10 dark:text-white"
                aria-label="Close"
                onClick={() => setInviteOpen(false)}
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="space-y-4 p-5">
              <label className="block text-xs font-semibold text-gray-600 dark:text-white/60">Game&apos;s url</label>
              <div className="flex items-stretch gap-2">
                <input
                  readOnly
                  value={`${typeof window !== 'undefined' ? location.origin : ''}/session/${encodeURIComponent(sessionId || '')}`}
                  className="flex-1 rounded-xl border border-black/10 bg-white/90 px-4 py-3 text-gray-900 outline-none ring-0 dark:border-white/10 dark:bg-white/10 dark:text-white"
                />
              </div>

              <button
                type="button"
                className="mt-2 inline-flex w-full items-center justify-center rounded-xl bg-indigo-600 px-4 py-3 text-base font-extrabold text-white shadow-sm transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-indigo-500"
                onClick={async () => {
                  try {
                    const url = `${location.origin}/session/${encodeURIComponent(sessionId || '')}`;
                    await navigator.clipboard?.writeText?.(url);
                    setCopied(true);
                  } catch {}
                }}
              >
                {copied ? 'Copied!' : 'Copy Invitation Link' }
              </button>

              <button
                type="button"
                aria-disabled
                className="mx-auto block cursor-not-allowed text-sm font-bold text-indigo-600/70 underline-offset-2 dark:text-indigo-400/70"
                onClick={() => {}}
              >
                QR Code <span className="text-gray-500 dark:text-white/50 font-medium">(Coming soon)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <StoriesDrawer open={storiesOpen} onClose={() => setStoriesOpen(false)} sessionId={sessionId} />
    </header>
  );
}
