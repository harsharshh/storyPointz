'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import gsap from 'gsap';

type Props = {
  values: string[]; // pool of values to pick from
  seed: string; // stable seed for layout
  count?: number; // how many to render
  isDark?: boolean; // adjust opacity
  className?: string; // extra classes on wrapper
  gradFor: (v: string) => [string, string]; // gradient per value
  animationType?: 'floating' | 'parallax';
  // Parallax speed profile: 'slow' (default) or 'fast'
  speed?: 'slow' | 'fast';
};

function seededRng(seedKey: string) {
  const s = String(seedKey || 'seed');
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = ((h ^ s.charCodeAt(i)) * 16777619) >>> 0;
  return () => (h = (h * 1664525 + 1013904223) >>> 0) / 0xffffffff;
}

export default function FloatingNumbers({ values, seed, count = 18, isDark = false, className = '', gradFor, animationType = 'parallax', speed = 'slow' }: Props) {
  const floatsRef = useRef<Array<SVGSVGElement | null>>([]);

  type Item = { value: string; x: number; y: number; scale: number; rot: number; opacity: number; depth?: number };
  const items: Item[] = useMemo(() => {
    const rng = seededRng(seed);
    const out: Item[] = [];

    if (animationType === 'parallax') {
      // Arrange in vertical columns, straight (no rotation), different depths
      const cols = Math.min(8, Math.max(4, Math.ceil(count / 3)));
      const spanX = 100;
      const marginX = 8;
      const cellW = (spanX - 2 * marginX) / cols;
      for (let i = 0; i < count; i++) {
        const col = i % cols;
        const cx = marginX + col * cellW + cellW * 0.5;
        const cy = Math.floor(rng() * 100);
        const value = values[Math.floor(rng() * values.length)];
        const depth = 0.6 + (col / cols) * 0.9; // slower on left, faster on right
        const scale = 0.8 + rng() * 0.6;
        const opacity = isDark ? 0.035 + rng() * 0.028 : 0.056 + rng() * 0.042;
        out.push({ value, x: cx, y: cy, scale, rot: 0, opacity, depth });
      }
    } else {
      // Floating scattered grid
      const cols = 6;
      const rows = 3;
      const spanX = 100;
      const spanY = 100;
      const marginX = 6;
      const marginY = 8;
      const cellW = (spanX - 2 * marginX) / cols;
      const cellH = (spanY - 2 * marginY) / rows;
      let idx = 0;
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          if (idx >= count) break;
          const jx = rng() - 0.5;
          const jy = rng() - 0.5;
          let cx = marginX + col * cellW + cellW * (0.5 + jx * 0.6);
          cx += spanX * 0.05 * rng();
          const cy = marginY + row * cellH + cellH * (0.5 + jy * 0.6);
          const value = values[Math.floor(rng() * values.length)];
          const scale = 0.7 + rng() * 0.9;
          const rot = Math.floor(rng() * 46) - 23;
          const opacity = isDark ? 0.035 + rng() * 0.028 : 0.056 + rng() * 0.042;
          out.push({ value, x: cx, y: cy, scale, rot, opacity });
          idx++;
        }
      }
      while (out.length < count) {
        const value = values[Math.floor(rng() * values.length)];
        const x = Math.floor(rng() * 100);
        const y = Math.floor(rng() * 100);
        const scale = 0.7 + rng() * 0.9;
        const rot = Math.floor(rng() * 46) - 23;
        const opacity = isDark ? 0.035 + rng() * 0.028 : 0.056 + rng() * 0.042;
        out.push({ value, x, y, scale, rot, opacity });
      }
    }
    return out;
  }, [values, seed, count, isDark, animationType]);

  useEffect(() => {
    const nodes = floatsRef.current.filter(Boolean) as SVGSVGElement[];
    if (!nodes.length) return;
    const tl = gsap.timeline();
    if (animationType === 'parallax') {
      nodes.forEach((el, idx) => {
        const depth = items[idx]?.depth || 1;
        const depthClamp = Math.max(0.2, Math.min(1.5, depth));
        const base = 12 / depthClamp; // deeper = faster
        const speedScale = speed === 'fast' ? 0.35 : 1; // fast = much quicker
        const dur = base * speedScale;
        // Ensure the very first frame starts at the top to avoid a flash/glitch
        gsap.set(el, { y: -140, rotation: 0, force3D: true });
        tl.add(
          gsap.to(el, {
            y: 180,
            duration: dur,
            ease: 'none',
            repeat: -1,
            onRepeat: () => { gsap.set(el, { y: -140 }); },
          }),
          0
        );
      });
    } else {
      nodes.forEach((el, idx) => {
        const dur = 6 + (idx % 5) * 0.7;
        const dx = idx % 2 ? 10 : -10;
        tl.add(
          gsap.to(el, {
            y: idx % 2 ? -18 : 18,
            x: `+=${dx}`,
            rotation: `+=${idx % 2 ? 3 : -3}`,
            duration: dur,
            yoyo: true,
            repeat: -1,
            ease: 'sine.inOut',
          }),
          0
        );
      });
    }
    return () => { tl.kill(); };
  }, [items, animationType, speed]);

  // Reset refs array on re-render length change
  floatsRef.current = new Array(items.length).fill(null);

  return (
    <div className={`pointer-events-none absolute inset-0 ${className}`}>
      {items.map((item, i) => {
        const [g1, g2] = gradFor(item.value);
        const gid = `float_grad_${i}`;
        return (
          <svg
            key={`float_${i}_${item.value}`}
            ref={(el) => { floatsRef.current[i] = el; }}
            className="absolute"
            style={{
              left: `${item.x}%`,
              top: `${item.y}%`,
              opacity: Math.min(0.25, Math.max(0.06, item.opacity * (isDark ? 0.75 : 1.15))),
              transform: `translate(-50%, -50%) scale(${item.scale}) rotate(${item.rot}deg)`,
              willChange: 'transform, opacity',
            }}
            width="96"
            height="96"
            viewBox="0 0 64 64"
            aria-hidden
          >
            <defs>
              <linearGradient id={gid} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={g1} />
                <stop offset="100%" stopColor={g2} />
              </linearGradient>
              <filter id={`${gid}_glow`} x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="1.4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <text
              x="32" y="40" textAnchor="middle" fontSize="28" fontWeight="800" fill={`url(#${gid})`}
              filter={`url(#${gid}_glow)`}
            >
              {item.value}
            </text>
          </svg>
        );
      })}
    </div>
  );
}
