/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import gsap from "gsap";
import Header from "../../components/header";

export default function RoomShell({ sessionId, sessionName, user }) {
  const values = ["0", "1", "2", "3", "5", "8", "13", "21", "34", "55", "89", "?", "☕"];
  // GSAP card button refs
  const cardRefs = useRef({});
  const quickLift = useRef({});
  const lastSelected = useRef(null);
  const [selected, setSelected] = useState(null);
  useEffect(() => {
    // create smooth, fast tweeners per card using gsap.quickTo
    values.forEach((v) => {
      const el = cardRefs.current[v];
      if (!el) return;
      // only create once per element
      if (!quickLift.current[v] || quickLift.current[v]._el !== el) {
        const qt = gsap.quickTo(el, "y", { duration: 0.14, ease: "power3.out" });
        qt._el = el; // track the element
        quickLift.current[v] = qt;
      }
    });
  }, [values, selected]);
  const [copied, setCopied] = useState(false);
  const [members, setMembers] = useState([]);
  const [votes, setVotes] = useState({});
  const [revealed, setRevealed] = useState(false);
  const [activeStoryId, setActiveStoryId] = useState(null);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1400);
    return () => clearTimeout(t);
  }, [copied]);

  async function copyInviteLink() {
    try {
      const url = `${location.origin}/session/${encodeURIComponent(sessionId)}`;
      await navigator.clipboard?.writeText?.(url);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  // Realtime: subscribe to presence if configured
  const pusherKey = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const pusherCluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "mt1";
  useEffect(() => {
    if (!user?.id || !pusherKey) return;
    let pusher; let channel;
    (async () => {
      const Pusher = (await import("pusher-js")).default;
      pusher = new Pusher(pusherKey, {
        cluster: pusherCluster,
        authEndpoint: "/api/realtime/auth",
        auth: {
          headers: {
            "x-spz-user-id": user.id,
            "x-spz-user-name": user.name || "Guest user",
          },
        },
      });
      channel = pusher.subscribe(`presence-session-${sessionId}`);
      channel.bind("pusher:subscription_succeeded", () => {
        const list = [];
        channel.members.each((m) => list.push({ id: m.id, name: m.info?.name }));
        setMembers(list);
      });
      channel.bind("pusher:member_added", (m) => {
        setMembers((prev) => {
          if (prev.find((x) => x.id === m.id)) return prev;
          return [...prev, { id: m.id, name: m.info?.name }];
        });
      });
      channel.bind("pusher:member_removed", (m) => {
        setMembers((prev) => prev.filter((x) => x.id !== m.id));
      });
      channel.bind("user-joined", (payload) => {
        // Optional extra join animation hook
      });
      channel.bind("vote-cast", (payload) => {
        if (payload && payload.userId && typeof payload.value === "string") {
          setVotes((prev) => ({ ...prev, [payload.userId]: payload.value }));
        }
      });
      channel.bind("reveal", () => {
        setRevealed(true);
      });
    })();
    return () => {
      try { channel && pusher?.unsubscribe?.(`presence-session-${sessionId}`); } catch {}
      try { pusher?.disconnect?.(); } catch {}
    };
  }, [user?.id, user?.name, sessionId, pusherKey, pusherCluster]);

  // active story wiring
  useEffect(() => {
    const key = `spz_active_story_${sessionId}`;
    try { const v = localStorage.getItem(key); if (v) setActiveStoryId(v); } catch {}
    const onActive = (e) => {
      const d = e?.detail || {};
      if (d.sessionId === sessionId) setActiveStoryId(d.storyId || null);
    };
    window.addEventListener('spz:active-story', onActive);
    return () => window.removeEventListener('spz:active-story', onActive);
  }, [sessionId]);

  async function revealAll() {
    try {
      await fetch(`/api/session/${encodeURIComponent(sessionId)}/reveal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user?.id }),
      });
      // persist votes to active story if present
      if (activeStoryId) {
        const payload = { storyId: activeStoryId, votes: Object.entries(votes).map(([uid,val]) => ({ userId: uid, value: val })) };
        await fetch(`/api/session/${encodeURIComponent(sessionId)}/reveal-save`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
        });
      }
    } catch {}
  }

  // --- Gradients for numeric cards (cool → warm) ---
  const numericValues = ["0","1","2","3","5","8","13","21","34","55","89"];
  const coolWarmPairs = [
    ["#60A5FA", "#22D3EE"], // 0  (blue → cyan)
    ["#4F46E5", "#06B6D4"], // 1  (indigo → cyan)
    ["#14B8A6", "#34D399"], // 2  (teal → emerald)
    ["#10B981", "#A3E635"], // 3  (emerald → lime)
    ["#84CC16", "#F59E0B"], // 5  (lime → amber)
    ["#F59E0B", "#F97316"], // 8  (amber → orange)
    ["#F97316", "#EF4444"], // 13 (orange → red)
    ["#EF4444", "#F43F5E"], // 21 (red → rose)
    ["#F43F5E", "#FB7185"], // 34 (rose shades)
    ["#FB7185", "#A855F7"], // 55 (rose → violet)
    ["#A855F7", "#F59E0B"], // 89 (violet → amber for accent)
  ];
  const gradFor = (v) => {
    const idx = numericValues.indexOf(String(v));
    if (idx === -1) return ["#818CF8", "#22D3EE"]; // default (indigo → cyan)
    return coolWarmPairs[idx] || coolWarmPairs[coolWarmPairs.length - 1];
  };

  return (
    <div className="relative h-[100dvh] overflow-hidden overscroll-none">
      <Header userName={user?.name} sessionName={sessionName} sessionId={sessionId} />

      {/* Stage */}
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex h-[calc(100dvh-56px-160px)] flex-col items-center justify-center gap-8 pt-6 sm:h-[calc(100dvh-64px-160px)] sm:pt-8 overflow-hidden">
          {/* Invite helper (hide when more than one participant) */}
          {members.length <= 1 && (
            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-white/70">Feeling lonely? 🥱</p>
              <button
                onClick={copyInviteLink}
                className="mt-1 text-base font-semibold text-indigo-600 hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-indigo-400"
              >
                {copied ? "Invite link copied!" : "Invite players"}
              </button>
            </div>
          )}

          {/* Compute seating */}
          {(() => {
            const selfId = user?.id;
            const self = members.find((m) => m.id === selfId) || (selfId ? { id: selfId, name: user?.name } : null);
            const others = members.filter((m) => m.id !== selfId);
            const left = others[0] ? [others[0]] : [];
            const right = others[1] ? [others[1]] : [];
            const rest = others.slice(2);
            const top = rest.slice(0, Math.ceil(rest.length / 2));
            const bottom = [self, ...rest.slice(Math.ceil(rest.length / 2))].filter(Boolean);

            const Seat = ({ id, name, isSelf, dashed }) => {
              const hasVoted = Boolean(votes[id]);
              const shown = isSelf ? selected : revealed ? votes[id] : null;
              return (
                <div className="relative flex flex-col items-center gap-2">
                  <div className="relative">
                    {isSelf && (
                      <button
                        type="button"
                        className="absolute -top-3 -left-3 grid h-7 w-7 place-items-center rounded-full bg-indigo-500 text-white shadow ring-2 ring-white dark:ring-[#0f1115]"
                        title="Edit name"
                        aria-label="Edit name"
                        onClick={() => window.dispatchEvent(new CustomEvent('spz:edit-name'))}
                      >
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 20h9" />
                          <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4Z" />
                        </svg>
                      </button>
                    )}
                    <div
                      className={[
                        "aspect-[3/4] w-12 rounded-md border",
                        dashed ? "border-dashed" : "",
                        shown
                          ? "border-2 border-indigo-500 text-indigo-600 grid place-items-center font-extrabold text-lg"
                          : hasVoted
                          ? "border-2 border-indigo-500/70 bg-indigo-500/10 grid place-items-center"
                          : "border-black/10 bg-gray-200/60 dark:border-white/10 dark:bg-white/10",
                      ].join(" ")}
                      onClick={() => { if (!revealed) revealAll(); }}
                    >
                      {shown || (hasVoted ? (
                        <svg viewBox="0 0 24 24" className="h-5 w-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      ) : null)}
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-white max-w-[120px] truncate">{name || "Guest"}</div>
                </div>
              );
            };

            return (
              <div className="grid w-full max-w-5xl grid-cols-12 items-center gap-4">
                {/* Top row */}
                <div className="col-span-12 flex items-center justify-center gap-6">
                  {top.map((m) => (
                    <Seat key={m.id} id={m.id} name={m.name} />
                  ))}
                </div>

                {/* Middle: left seat + board + right seat */}
                <div className="col-span-12 grid grid-cols-12 items-center">
                  <div className="col-span-2 flex justify-center">
                    {left[0] ? <Seat id={left[0].id} name={left[0].name} /> : <div className="h-16" />}
                  </div>
                  <div className="col-span-8">
                    <div className="relative w-full rounded-3xl border bg-indigo-50/60 p-10 text-center text-gray-800 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-white">
                      <div className="inline-flex items-center gap-3">
                        <button
                          className="inline-flex items-center justify-center rounded-xl bg-gray-700 px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-600"
                          onClick={revealAll}
                        >
                          Reveal
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="col-span-2 flex justify-center">
                    {right[0] ? <Seat id={right[0].id} name={right[0].name} dashed /> : <div className="h-16" />}
                  </div>
                </div>

                {/* Bottom row (includes self) */}
                <div className="col-span-12 mt-2 flex items-center justify-center gap-6">
                  {bottom.map((m) => (
                    <Seat key={m.id || m.name} id={m.id} name={m.name} isSelf={m.id === selfId} />
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Bottom cards rail */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30">
        <div className="mx-auto max-w-6xl px-6 pb-6">
          <div className="pointer-events-auto rounded-2xl  p-4 backdrop-blur-md">
            <div className="mb-3 text-center text-sm text-gray-700 dark:text-white/80">Choose your card 👇</div>
            <div className="flex flex-wrap items-center justify-center gap-3">
              {values.map((v) => {
                const isSel = selected === v;
                const isCoffee = v === "☕";
                const isUnknown = v === "?";
                const [g1, g2] = gradFor(v);
                return (
                  <button
                    key={v}
                    ref={(el) => { if (el) cardRefs.current[v] = el; }}
                    onMouseEnter={() => {
                      const qt = quickLift.current[v];
                      if (qt && (!selected || selected !== v)) qt(-10);
                    }}
                    onMouseLeave={() => {
                      const qt = quickLift.current[v];
                      if (qt && (!selected || selected !== v)) qt(0);
                    }}
                    onClick={async () => {
                      // Lower previously selected card if different
                      const prev = lastSelected.current;
                      if (prev && prev !== v) {
                        const prevQt = quickLift.current[prev];
                        if (prevQt) prevQt(0);
                      }

                      // Mark new selection and lift it
                      setSelected(v);
                      lastSelected.current = v;
                      const qt = quickLift.current[v];
                      if (qt) qt(-18);

                      try {
                        await fetch(`/api/session/${encodeURIComponent(sessionId)}/vote`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ userId: user?.id, value: v, storyId: activeStoryId }),
                        });
                      } catch {}
                    }}
                    className={[
                      "cursor-pointer aspect-[3/4] w-12 select-none rounded-xl border-2 bg-white text-sm font-semibold shadow-sm will-change-transform transition dark:bg-gray-900",
                      "hover:shadow-md",
                      isSel
                        ? "border-indigo-600 ring-2 ring-indigo-400/50"
                        : "border-black/10 dark:border-white/10",
                    ].join(" ")}
                    aria-pressed={isSel}
                    aria-label={isCoffee ? "Coffee break" : isUnknown ? "Vote unknown" : `Vote ${v}`}
                    style={{
                      // Keep surface white; gradients only on the glyphs
                      WebkitTapHighlightColor: "transparent",
                    }}
                  >
                    <div className="grid h-full w-full place-items-center">
                      {isCoffee ? (
                        <svg viewBox="0 0 64 64" className="h-7 w-7" aria-hidden>
                          <defs>
                            <linearGradient id={`mug_${v}`} x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor={g1} />
                              <stop offset="100%" stopColor={g2} />
                            </linearGradient>
                          </defs>
                          <g fill={`url(#mug_${v})`}>
                            <rect x="12" y="26" rx="4" ry="4" width="28" height="18" />
                            <path d="M42 30h6a6 6 0 0 1 0 12h-6v-4h6a2 2 0 0 0 0-4h-6z" />
                          </g>
                          <g stroke={`url(#mug_${v})`} strokeWidth="2" fill="none">
                            <path d="M22 18c0 3-3 3-3 6 0 2 2 3 2 5" />
                            <path d="M28 18c0 3-3 3-3 6 0 2 2 3 2 5" />
                          </g>
                        </svg>
                      ) : (
                        <span
                          className="text-[18px] font-extrabold leading-none bg-clip-text text-transparent"
                          style={{
                            backgroundImage: `linear-gradient(135deg, ${g1}, ${g2})`,
                          }}
                        >
                          {v}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      
    </div>
  );
}
