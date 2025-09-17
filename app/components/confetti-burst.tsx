'use client';

import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';

export type ConfettiOptions = {
  count?: number;
  colors?: string[];
  sizeRange?: [number, number];
  distanceRange?: [number, number];
  duration?: number; // seconds
};

export function burstConfetti(host: HTMLElement, opts: ConfettiOptions = {}) {
  const {
    count = 36,
    colors = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#a855f7'],
    sizeRange = [4, 10],
    distanceRange = [80, 240],
    duration = 1.2,
  } = opts;

  for (let i = 0; i < count; i++) {
    const s = document.createElement('span');
    s.className = 'spz-confetti pointer-events-none absolute rounded-full';
    const size = sizeRange[0] + Math.random() * (sizeRange[1] - sizeRange[0]);
    s.style.width = `${size}px`;
    s.style.height = `${size}px`;
    s.style.background = colors[Math.floor(Math.random() * colors.length)];
    s.style.left = '50%';
    s.style.top = '50%';
    s.style.willChange = 'transform, opacity';
    host.appendChild(s);

    const angle = Math.random() * Math.PI * 2;
    const distance = distanceRange[0] + Math.random() * (distanceRange[1] - distanceRange[0]);
    const dx = Math.cos(angle) * distance;
    const dy = Math.sin(angle) * distance;

    gsap.to(s, {
      x: dx,
      y: dy,
      rotate: Math.random() * 720 - 360,
      opacity: 0,
      duration,
      ease: 'power2.out',
      onComplete: () => s.remove(),
    });
  }
}

export default function ConfettiBurst({ trigger, options }: { trigger?: number | string | boolean; options?: ConfettiOptions }) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!trigger) return;
    const host = ref.current?.parentElement || ref.current || document.body;
    if (host) burstConfetti(host, options);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger]);
  return <div ref={ref} style={{ display: 'none' }} aria-hidden />;
}

