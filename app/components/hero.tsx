'use client';

import Link from 'next/link';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { useRef } from 'react';

const palette: [string, string][] = [
    ['#6366f1', '#22c55e'], // indigo → emerald
    ['#06b6d4', '#a855f7'], // cyan → violet
    ['#f59e0b', '#ef4444'], // amber → red
    ['#10b981', '#3b82f6'], // emerald → blue
    ['#e879f9', '#22d3ee'], // fuchsia → sky
  ];

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

      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center justify-center gap-10 px-6 py-14 sm:py-20 md:grid-cols-2 min-h-screen">
        {/* Left content */}
        <div className="max-w-xl">
          

          <h1 id="hero-title" data-anim="hero-item" className="text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-6xl dark:text-white">
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
            
          </div>
        </div>

        {/* Right: animated deck visual */}
        <div className="relative hidden md:flex justify-center" aria-hidden>
          <HeroDeckVisual />
        </div>
      </div>
    </section>
  );
}

function HeroDeckVisual() {
  const root = useRef<HTMLDivElement | null>(null);
  useGSAP(() => {
    const listeners: Array<() => void> = [];
    const ctx = gsap.context(() => {
      const host = root.current as HTMLDivElement | null;
      const cards = gsap.utils.toArray<HTMLElement>('.spz-card');
      if (!host || !cards.length) return;

      // Final fan targets
      const angles = [-50, -25, 0, 25, 50];
      const radius = 200;
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
          autoAlpha: 0,
          scale: 0.96,
          filter: 'blur(10px)',
          willChange: 'transform, filter, opacity',
        });
      });

      // 2) Entrance: center-out soft appear with reduced blur (they're still stacked)
      gsap.to(cards, {
        autoAlpha: 1,
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

          // Animate coffee steam (if present)
      const steams = gsap.utils.toArray<SVGPathElement>('.spz-steam');
      if (steams.length) {
        gsap.fromTo(steams, { opacity: 0, y: 6 }, { opacity: 1, y: -6, duration: 1.6, ease: 'sine.inOut', repeat: -1, yoyo: true, stagger: 0.2, delay: 0.2 });
      }

    return () => { listeners.forEach((off) => off()); ctx.revert(); };
  }, { scope: root });

  const values = ['☕', '1', '2', '3', '5'];

  return (
    <div ref={root} className="relative w-full h-[480px] sm:h-[560px]">
      <div className="relative h-full w-full perspective-[1000px] [transform-style:preserve-3d] overflow-hidden">
        {/* Cards stage */}
        <div className="spz-stage relative h-full w-full transition-all">
          {values.map((v, i) => (
  <div
    key={i}
    className="spz-card absolute left-1/2 top-1/2 aspect-[3/4] w-32 select-none rounded-2xl border border-black/10 bg-white text-center shadow-lg dark:border-white/10 opacity-0 dark:bg-gray-900"
    style={{ ['--g1' as any]: palette[i % palette.length][0], ['--g2' as any]: palette[i % palette.length][1], transform: 'translate(-50%, -50%)' }}
    aria-label={v === '☕' ? 'Coffee break card' : `Value ${v}`}
  >
    {v === '☕' ? (
      <svg viewBox="0 0 120 140" className="h-full w-full" aria-hidden>
        <defs>
          <linearGradient id={`spz-grad-${i}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: 'var(--g1)' }} />
            <stop offset="100%" style={{ stopColor: 'var(--g2)' }} />
          </linearGradient>
        </defs>
        <g>
          {/* shadow */}
          <ellipse cx="60" cy="104" rx="38" ry="8" fill="rgba(0,0,0,0.08)" className="dark:fill-white/10"/>
          {/* cup body */}
          <rect x="34" y="54" width="52" height="38" rx="8" fill={`url(#spz-grad-${i})`} />
          {/* cup lip highlight */}
          <rect x="34" y="54" width="52" height="6" rx="3" fill="#fff" fillOpacity="0.2"/>
          {/* handle */}
          <path d="M86 60c10 0 16 8 12 16-3 6-9 8-18 8" fill="none" stroke={`url(#spz-grad-${i})`} strokeWidth="6" strokeLinecap="round"/>
          {/* steam */}
          <g stroke={`url(#spz-grad-${i})`} strokeWidth="3" strokeLinecap="round" fill="none">
            <path className="spz-steam" d="M48 48c0-8 8-8 8-16" />
            <path className="spz-steam" d="M60 48c0-8 8-8 8-16" />
            <path className="spz-steam" d="M72 48c0-8 8-8 8-16" />
          </g>
        </g>
      </svg>
    ) : (
      <svg viewBox="0 0 120 140" className="h-full w-full" aria-hidden>
        <defs>
          <linearGradient id={`spz-grad-${i}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: 'var(--g1)' }} />
            <stop offset="100%" style={{ stopColor: 'var(--g2)' }} />
          </linearGradient>
        </defs>
        <text
          x="60"
          y="80"
          textAnchor="middle"
          dominantBaseline="middle"
          fontFamily="ui-sans-serif, system-ui, -apple-system, Segoe UI"
          fontSize="82"
          fontWeight="800"
          fill={`url(#spz-grad-${i})`}
          stroke="currentColor"
          strokeOpacity="0.15"
          strokeWidth="1.5"
        >
          {v}
        </text>
      </svg>
    )}
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