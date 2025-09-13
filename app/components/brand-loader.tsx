"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";

export default function BrandLoader() {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useGSAP(() => {
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

    const textMain = svg.querySelector("#spz-brand-text") as SVGTextElement | null;
    const textPath = svg.querySelector("#spz-textPath") as SVGTextPathElement | null;
    const ring = svg.querySelector("#spz-ring") as SVGCircleElement | null;
    const grad = svg.querySelector("#spz-grad") as SVGLinearGradientElement | null;

    const tl = gsap.timeline({ defaults: { ease: "power2.out" } });
    if (textMain) {
      tl.fromTo(
        textMain,
        { opacity: 0, y: 8, attr: { "letter-spacing": "0.08em" } },
        { opacity: 1, y: 0, duration: 0.8, attr: { "letter-spacing": "0em" } }
      );
      // subtle pulsing glow via stroke opacity
      gsap.to(textMain, {
        duration: 1.6,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
        attr: { "stroke-opacity": 0.22 },
      });
      // continuous gentle float + micro letter-spacing breathe
      gsap.to(textMain, {
        y: -2,
        duration: 1.8,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
      gsap.to(textMain, {
        duration: 2.6,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
        attr: { "letter-spacing": "0.02em" },
      });
      gsap.to(textMain, {
        duration: 3.2,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
        scale: 1.015,
        transformOrigin: "50% 50%",
      });
    }
    if (textPath) {
      gsap.to(textPath, { attr: { startOffset: "100%" }, duration: 6, ease: "none", repeat: -1 });
    }
    if (ring) {
      gsap.to(ring, { rotate: 360, transformOrigin: "center", duration: 10, ease: "none", repeat: -1 });
    }
    if (grad) {
      // Gently swing the gradient angle
      gsap.to(grad, {
        attr: { gradientTransform: "rotate(25)" },
        duration: 2.2,
        yoyo: true,
        repeat: -1,
        ease: "sine.inOut",
      });
    }
  }, { scope: svgRef });

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-white/80 backdrop-blur-sm dark:bg-[#0b0d12]/80">
      <div className="flex flex-col items-center gap-6">
        <svg ref={svgRef} width="260" height="260" viewBox="0 0 260 260" className="text-gray-800 dark:text-white">
          <defs>
            <linearGradient id="spz-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop id="spz-grad-stop-1" offset="0%" stopColor="#6366f1" />
              <stop id="spz-grad-stop-2" offset="100%" stopColor="#22c55e" />
            </linearGradient>
            <path id="spz-path" d="M130,30 a100,100 0 1,1 0,200 a100,100 0 1,1 0,-200" />
          </defs>


          {/* Brand text in center */}
          <text
            id="spz-brand-text"
            x="130"
            y="140"
            textAnchor="middle"
            fontWeight="800"
            fontSize="40"
            fill="url(#spz-grad)"
            stroke="currentColor"
            strokeOpacity="0.16"
            strokeWidth="1.5"
          >
            StoryPointz
          </text>
        </svg>
      </div>
    </div>
  );
}
