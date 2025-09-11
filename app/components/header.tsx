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

        {/* (Right side reserved for future actions) */}
        <div className="flex items-center gap-2" />
      </div>
    </header>
  );
}