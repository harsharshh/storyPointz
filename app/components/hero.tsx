'use client';

import Link from 'next/link';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { useRef } from 'react';

export default function Hero() {
  const container = useRef<HTMLDivElement | null>(null);
  useGSAP(() => {
    const items = gsap.utils.toArray<HTMLElement>('[data-anim="hero-item"]');
    if (items.length) {
      gsap.from(items, { y: 24, opacity: 0, duration: 0.6, ease: 'power2.out', stagger: 0.08 });
    }
    const cards = gsap.utils.toArray<HTMLElement>('[data-anim="card-item"]');
    if (cards.length) {
      gsap.from(cards, { y: 16, opacity: 0, duration: 0.5, ease: 'power2.out', stagger: 0.05, delay: 0.2 });
    }
  }, { scope: container });

  return (
    <section
      ref={container}
      className="relative overflow-hidden min-h-screen flex items-center"
      data-anim="hero"
      aria-labelledby="hero-title"
    >
      {/* Background accents (switch with theme) */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        {/* Light mode gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-100 via-emerald-50 to-white dark:hidden" />
        {/* Dark mode gradient background */}
        <div className="absolute inset-0 hidden dark:block bg-[radial-gradient(60%_40%_at_50%_0%,rgba(109,93,246,0.35),transparent_70%),radial-gradient(40%_40%_at_100%_60%,rgba(34,197,94,0.25),transparent_70%),linear-gradient(to_bottom,#0B0B10,rgba(11,11,16,0.85))]" />
      </div>

      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-6 py-14 sm:py-20 md:grid-cols-2">
        {/* Left content */}
        <div className="max-w-xl">
          

          <h1 id="hero-title" data-anim="hero-item" className="text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-6xl">
            Plan smarter.
            <br />
            Estimate faster.
          </h1>

          <p data-anim="hero-item" className="mt-5 max-w-prose text-base text-gray-600 dark:text-white/80">
            Plan poker made easy—private votes, instant reveal, quick consensus.
          </p>

          {/* <ul className="mt-6 space-y-2 text-sm text-gray-600 dark:text-white/70">
            <li className="flex items-center gap-2"><Dot/> Real‑time rooms with private votes</li>
            <li className="flex items-center gap-2"><Dot/> Fibonacci / T‑shirt / custom decks</li>
            <li className="flex items-center gap-2"><Dot/> Consensus, average & notes history</li>
          </ul> */}

          <div data-anim="hero-item" className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/session/new"
              className="inline-flex h-11 items-center justify-center rounded-full bg-indigo-600 px-6 font-medium text-white shadow-sm transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-indigo-500"
            >
              Start a session
            </Link>
            <Link
              href="/how-it-works"
              className="inline-flex h-11 items-center justify-center rounded-full border border-black/15 bg-black/5 px-6 font-medium transition hover:bg-black/10 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10"
            >
              How it works
            </Link>
          </div>
        </div>

        {/* Right: animated deck visual */}
        <div className="relative flex justify-center" aria-hidden>
          <HeroDeckVisual />
        </div>
      </div>
    </section>
  );
}

function HeroDeckVisual() {
  const root = useRef<HTMLDivElement | null>(null);
  useGSAP(() => {
    let listeners: Array<() => void> = [];
    const ctx = gsap.context(() => {
      const host = root.current as HTMLDivElement | null;
      const cards = gsap.utils.toArray<HTMLElement>('.spz-card');
      if (!host || !cards.length) return;

      // Final fan targets
      const angles = [-50, -25, 0, 25, 50];
      const radius = 170;
      const targets = angles.map((deg) => {
        const a = (deg * Math.PI) / 180;
        const x = radius * Math.sin(a);
        const z = radius * (Math.cos(a) - 1);
        const ry = deg * 0.6;
        return { x, z, ry };
      });
      // Random rotateZ tilts for a playful fan (center stays mostly straight)
      const rotZ: number[] = angles.map((deg, i) => {
        if (i === Math.floor(angles.length / 2)) return 0; // keep center straight
        // bias outward cards to tilt a bit more
        const base = Math.min(10, Math.abs(deg) * 0.18);
        const r = gsap.utils.random(-base, base);
        return Math.abs(r) < 2 ? (r < 0 ? -2 : 2) : r; // ensure visible but subtle
      });

      // 1) Initial: stack all cards at center with strong blur
      cards.forEach((el) => {
        gsap.set(el, {
          xPercent: -50,
          yPercent: -50,
          x: 0,
          y: 0,
          z: 0,
          rotateY: 0,
          opacity: 0,
          scale: 0.96,
          filter: 'blur(10px)',
          willChange: 'transform, filter, opacity',
        });
      });

      // 2) Entrance: center-out soft appear with reduced blur (they're still stacked)
      gsap.to(cards, {
        opacity: 1,
        scale: 1,
        filter: 'blur(6px)',
        duration: 0.45,
        ease: 'power2.out',
        stagger: { each: 0.1, from: 'center' },
      });

      // 3) Auto-Reveal after a brief delay: spread to fan & clear blur, then confetti
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' }, delay: 0.8 });
      tl.to(cards, {
        x: (i) => targets[i].x,
        y: 0,
        z: (i) => targets[i].z,
        rotateY: (i) => targets[i].ry,
        rotate: (i) => rotZ[i],
        filter: 'blur(0px)',
        scale: 1.3,
        duration: 0.6,
        ease: 'power3.out',
        stagger: { each: 0.06, from: 'center' },
      }).to(cards, {
        scale: 1,
        duration: 0.4,
        ease: 'power2.out',
      }, '>-0.2')
      .add(() => {
        // Confetti burst (sparingly)
        const colors = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#a855f7'];
        const count = 36;
        for (let i = 0; i < count; i++) {
          const s = document.createElement('span');
          s.className = 'spz-confetti pointer-events-none absolute rounded-full';
          const size = 4 + Math.random() * 6;
          s.style.width = `${size}px`;
          s.style.height = `${size}px`;
          s.style.background = colors[Math.floor(Math.random() * colors.length)];
          s.style.left = '50%';
          s.style.top = '50%';
          host.appendChild(s);

          const angle = Math.random() * Math.PI * 2;
          const distance = 80 + Math.random() * 160;
          const dx = Math.cos(angle) * distance;
          const dy = Math.sin(angle) * distance;

          gsap.to(s, {
            x: dx,
            y: dy,
            rotate: Math.random() * 720 - 360,
            opacity: 0,
            duration: 1.2,
            ease: 'power2.out',
            onComplete: () => s.remove(),
          });
        }
      })
      .to(cards, {
        y: '+=3',
        duration: 2,
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true,
        stagger: 0.1,
      }, '>-0.2');
    }, root);

    return () => { listeners.forEach((off) => off()); ctx.revert(); };
  }, { scope: root });

  const values = ['☕', '1', '2', '3', '5'];

  return (
    <div ref={root} className="relative w-full h-[360px] sm:h-[420px]">
      <div className="relative h-full w-full perspective-[1000px] [transform-style:preserve-3d] overflow-hidden">
        {/* Cards stage */}
        <div className="spz-stage relative h-full w-full transition-all">
          {values.map((v, i) => (
            <div
              key={i}
              className="spz-card absolute left-1/2 top-1/2 aspect-[3/4] w-20 select-none rounded-xl border border-black/10 bg-white text-center text-base font-semibold text-gray-800 shadow-md dark:border-white/10 dark:bg-white/5 dark:text-white/80"
            >
              <div className="flex h-full items-center justify-center">{v}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Dot() {
  return <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />;
}