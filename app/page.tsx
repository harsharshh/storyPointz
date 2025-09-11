'use client';
import Image from "next/image";
import Link from "next/link";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { useRef } from "react";
import { useTheme } from "./component/theme-provider";

export default function Home() {
  const { theme, toggleTheme } = useTheme();
  const container = useRef<HTMLDivElement | null>(null);

  useGSAP(() => {
    gsap.from('[data-anim="hero"]', { y: 20, opacity: 0, duration: 0.6, stagger: 0.1, ease: 'power2.out' });
    gsap.from('[data-anim="card"]', { y: 14, opacity: 0, duration: 0.5, stagger: 0.08, ease: 'power2.out', delay: 0.2 });
  }, { scope: container });

  return (
    <div ref={container} className="min-h-screen">
      <main className="mx-auto max-w-6xl px-6 py-10 sm:py-16">
        {/* Top bar */}
        <header className="mb-8 flex items-center justify-between">
          <Link href="/" className="group inline-flex items-center gap-2 font-semibold">
            <span className="inline-grid place-items-center h-8 w-8 rounded-md bg-indigo-600 text-white group-hover:opacity-90 transition">SP</span>
            <span>StoryPointz</span>
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle onClick={toggleTheme} theme={theme} />
            
          </div>
        </header>
      </main>
    </div>
  );
}

function ThemeToggle({ onClick, theme }: { onClick: () => void; theme: 'light' | 'dark' }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-black/5 px-3 py-1 text-xs font-medium transition hover:bg-black/10 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? (
        <span className="inline-flex items-center gap-1">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Light
        </span>
      ) : (
        <span className="inline-flex items-center gap-1">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="2"/>
            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          Dark
        </span>
      )}
    </button>
  );
}

function FeatureCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div
      data-anim="card"
      className="rounded-2xl border border-black/10 bg-white/60 p-5 backdrop-blur transition hover:border-black/20 dark:border-white/10 dark:bg-white/5 dark:hover:border-white/20"
    >
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-gray-600 dark:text-white/70">{desc}</p>
    </div>
  );
}

function DemoRoomMock() {
  return (
    <div className="flex h-full w-full items-center justify-center rounded-md border border-black/10 bg-white text-xs text-gray-500 dark:border-white/10 dark:bg-black/20 dark:text-white/60">
      (Upcoming) Interactive room mock
    </div>
  );
}

export function ThemeSwitch() {
  const { theme, toggleTheme, setTheme, useSystem } = useTheme();
  return (
    <div className="mt-6 flex gap-2 text-sm">
      <button onClick={toggleTheme} className="rounded-md border px-3 py-1 hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10">Toggle ({theme})</button>
      <button onClick={() => setTheme('light')} className="rounded-md border px-3 py-1 hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10">Light</button>
      <button onClick={() => setTheme('dark')} className="rounded-md border px-3 py-1 hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10">Dark</button>
      <button onClick={useSystem} className="rounded-md border px-3 py-1 hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10">System</button>
    </div>
  );
}