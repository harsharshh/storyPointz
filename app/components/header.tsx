'use client';

import Link from 'next/link';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { useRef } from 'react';

export default function Header() {
  const logoRef = useRef<HTMLAnchorElement | null>(null);

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

        {/* Right actions: Start session + user profile */}
        <div className="flex items-center gap-3">
          <Link
            href="/session/new"
            className="hidden sm:inline-flex h-9 items-center justify-center rounded-full bg-indigo-600 px-4 text-sm font-medium text-white shadow-sm transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-indigo-500"
          >
            Start a session
          </Link>

          {/* User profile (icon button) */}
          <button
            type="button"
            aria-label="User profile"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-white/70 backdrop-blur text-gray-700 transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-white/10 dark:bg-white/10 dark:text-white"
          >
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
          </button>
        </div>
      </div>
    </header>
  );
}