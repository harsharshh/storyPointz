"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { TextPlugin } from "gsap/TextPlugin";
import { useGSAP } from "@gsap/react";

export default function BrandLoader() {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useGSAP(() => {
    gsap.registerPlugin(TextPlugin);
    const svg = svgRef.current;
    if (!svg) return;

    // Theme-aware gradient colors
    const isDark = document.documentElement.classList.contains("dark");
    const g1 = isDark ? "#818cf8" : "#6366f1"; // indigo
    const g2 = isDark ? "#34d399" : "#22c55e"; // emerald
    const stop1 = svg.querySelector("#spz-grad-stop-1") as SVGStopElement | null;
    const stop2 = svg.querySelector("#spz-grad-stop-2") as SVGStopElement | null;
    stop1?.setAttribute("stop-color", g1);
    stop2?.setAttribute("stop-color", g2);

    const ring = svg.querySelector("#spz-ring") as SVGCircleElement | null;
    const textPath = svg.querySelector("#spz-textPath") as SVGTextPathElement | null;
    const grad = svg.querySelector("#spz-grad") as SVGLinearGradientElement | null;

    // Orbiting text
    if (textPath) {
      gsap.to(textPath, { attr: { startOffset: "100%" }, duration: 5.5, ease: "none", repeat: -1 });
    }

    // Ring dash + rotate
    if (ring) {
      gsap.set(ring, { strokeDasharray: 14, strokeDashoffset: 0 });
      gsap.to(ring, { strokeDashoffset: -160, duration: 2.2, ease: "none", repeat: -1 });
      gsap.to(ring, { rotate: 360, transformOrigin: "center", duration: 12, ease: "none", repeat: -1 });
    }

    // Gradient breathing
    if (grad) {
      gsap.to(grad, { attr: { gradientTransform: "rotate(25)" }, duration: 2.3, yoyo: true, repeat: -1, ease: "sine.inOut" });
    }

    // Center brand typing with caret and micro-animations
    const brandTxt = document.getElementById("spz-brand-html-txt");
    const caret = document.getElementById("spz-brand-caret");
    const subline = document.getElementById("spz-brand-sub");

    if (brandTxt) {
      const typeTl = gsap.timeline({ repeat: -1, repeatDelay: 0.6 });
      typeTl
        .set(brandTxt, { text: "" })
        .to(brandTxt, { duration: 1.4, text: "StoryPointz", ease: "none" })
        .to(brandTxt, { duration: 0.5, text: "StoryPointz" });
      gsap.to(brandTxt, { y: -2, duration: 1.8, repeat: -1, yoyo: true, ease: "sine.inOut" });
      gsap.to(brandTxt, { letterSpacing: "0.02em", duration: 2.6, repeat: -1, yoyo: true, ease: "sine.inOut" });
      gsap.to(brandTxt, { scale: 1.015, transformOrigin: "50% 50%", duration: 3.2, repeat: -1, yoyo: true, ease: "sine.inOut" });
    }
    if (caret) {
      gsap.to(caret, { opacity: 0.2, duration: 0.55, repeat: -1, yoyo: true, ease: "sine.inOut" });
    }
    if (subline) {
      const msgs = ["Preparing your room…", "Syncing players…", "Warming up presence…", "Loading deck…"];
      let i = 0;
      const cycle = () => {
        gsap.to(subline, {
          duration: 0.8,
          text: msgs[i % msgs.length],
          ease: "none",
          onComplete: () => {
            i++;
            gsap.delayedCall(1.2, cycle);
          },
        });
      };
      cycle();
    }
  }, { scope: svgRef });

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-white/80 backdrop-blur-sm dark:bg-[#0b0d12]/80">
      <div className="relative flex flex-col items-center gap-6">
        <svg ref={svgRef} width="260" height="260" viewBox="0 0 260 260" className="text-gray-800 dark:text-white">
          <defs>
            <linearGradient id="spz-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop id="spz-grad-stop-1" offset="0%" stopColor="#6366f1" />
              <stop id="spz-grad-stop-2" offset="100%" stopColor="#22c55e" />
            </linearGradient>
            <path id="spz-path" d="M130,30 a100,100 0 1,1 0,200 a100,100 0 1,1 0,-200" />
          </defs>
        </svg>

        {/* HTML brand text typed with TextPlugin (gradient fill) */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 select-none">
          <span
            id="spz-brand-html-txt"
            className="bg-gradient-to-r from-indigo-600 to-emerald-500 bg-clip-text text-transparent dark:from-indigo-400 dark:to-emerald-400 text-[40px] font-extrabold leading-none tracking-tight"
          />
        </div>
      </div>
    </div>
  );
}
