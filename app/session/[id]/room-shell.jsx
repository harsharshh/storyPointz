/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import gsap from "gsap";
import Header from "../../components/header";

export default function RoomShell({ sessionId, sessionName, user }) {
  const values = ["0", "1", "2", "3", "5", "8", "13", "21", "34", "55", "89", "?", "☕"];
  // GSAP card button refs
  const cardRefs = useRef({});
  const channelRef = useRef(null);
  const quickLift = useRef({});
  const lastSelected = useRef(null);
  const [selected, setSelected] = useState(null);
  const selectedRef = useRef(null);
  useEffect(() => { selectedRef.current = selected; }, [selected]);
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
  const revealedRef = useRef(false);
  useEffect(() => { revealedRef.current = revealed; }, [revealed]);
  const [activeStoryId, setActiveStoryId] = useState(null);
  const activeStoryRef = useRef(null);
  useEffect(() => { activeStoryRef.current = activeStoryId; }, [activeStoryId]);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1400);
    return () => clearTimeout(t);
  }, [copied]);

  // Mask overlays are static; no animation needed

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
      // expose channel for client-trigger events elsewhere (e.g., deselect)
      try { channelRef.current = channel; } catch {}
      channel.bind("pusher:subscription_succeeded", () => {
        const list = [];
        channel.members.each((m) => list.push({ id: m.id, name: m.info?.name }));
        setMembers(list);
        // Ask others for current state (e.g., revealed) using client events
        try { channel.trigger && channel.trigger('client-sync-request', { from: user.id }); } catch {}
        // Clear any stale vote for myself across peers (e.g., after refresh)
        try { channel.trigger && channel.trigger('client-clear-my-vote', { userId: user.id }); } catch {}
      });
      channel.bind("pusher:member_added", (m) => {
        setMembers((prev) => {
          if (prev.find((x) => x.id === m.id)) return prev;
          return [...prev, { id: m.id, name: m.info?.name }];
        });
        // When a new member joins, if we already voted (in this round), re-broadcast our vote
        // so the newcomer immediately sees vote status without waiting for future events.
        const val = selectedRef.current;
        const isRevealedNow = revealedRef.current;
        if (val && !isRevealedNow) {
          (async () => {
            try {
              await fetch(`/api/session/${encodeURIComponent(sessionId)}/vote`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: user?.id, value: val, storyId: activeStoryRef.current }),
              });
            } catch {}
          })();
        }
      });
      // If someone asks for sync, and we've already revealed, notify them to reveal
      channel.bind('client-sync-request', (payload) => {
        try {
          if (revealedRef.current) {
            channel.trigger && channel.trigger('client-reveal-now', { by: user.id });
          }
        } catch {}
      });
      // Newcomers listen for reveal-now and update state
      channel.bind('client-reveal-now', () => {
        setRevealed(true);
      });
      // When a peer refreshes/joins and asks to clear their prior vote, remove it from our local state
      channel.bind('client-clear-my-vote', (payload) => {
        const uid = payload?.userId;
        if (!uid) return;
        setVotes((prev) => { const n = { ...prev }; delete n[uid]; return n; });
      });
      channel.bind("pusher:member_removed", (m) => {
        setMembers((prev) => prev.filter((x) => x.id !== m.id));
        setVotes((prev) => { const n = { ...prev }; delete n[m.id]; return n; });
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
      try { channelRef.current = null; } catch {}
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

  // Stable, colorful avatar gradient per user
  const userGradFor = (key) => {
    const str = String(key || "guest");
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
    const idx = hash % coolWarmPairs.length;
    return coolWarmPairs[idx];
  };

  // --- Randomized woven texture per card (stable per user) ---
  const seededRng = (seedKey) => {
    const s = String(seedKey || "seed");
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) h = (h ^ s.charCodeAt(i)) * 16777619 >>> 0;
    return () => (h = (h * 1664525 + 1013904223) >>> 0) / 0xffffffff;
  };

  const textureStyleFor = (key) => {
    const rnd = seededRng(key);
    // Randomized base hues (cool to warm across full wheel)
    const h1 = Math.floor(rnd() * 360);
    const h2 = (h1 + 20 + Math.floor(rnd() * 80)) % 360;
    const c1 = `hsl(${h1} 85% 55%)`;
    const c2 = `hsl(${h2} 85% 45%)`;

    // Tile size & soft highlights vary slightly per card
    const size = 56 + Math.floor(rnd() * 10); // 56–66px
    const lightA = 0.18 + rnd() * 0.08; // brightness of light facets
    const darkA = 0.18 + rnd() * 0.10; // depth of dark facets

    return {
      // Argyle/diamond facets: two diagonals + inverse layers + base gradient
      backgroundImage: `
        linear-gradient(45deg, rgba(255,255,255,${lightA}) 25%, transparent 25%),
        linear-gradient(-45deg, rgba(255,255,255,${lightA}) 25%, transparent 25%),
        linear-gradient(45deg, transparent 75%, rgba(0,0,0,${darkA}) 75%),
        linear-gradient(-45deg, transparent 75%, rgba(0,0,0,${darkA}) 75%),
        linear-gradient(135deg, ${c1}, ${c2})
      `,
      backgroundSize: `${size}px ${size}px, ${size}px ${size}px, ${size}px ${size}px, ${size}px ${size}px, 100% 100%`,
      backgroundPosition: `0 0, 0 0, 0 0, 0 0, 50% 50%`,
      backgroundBlendMode: 'overlay, overlay, multiply, multiply, normal',
      WebkitBorderRadius: '0.75rem',
      borderRadius: '0.75rem',
      filter: 'saturate(1.05) contrast(1.06)',
      opacity: 0.98,
    };
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
              const votedVal = votes[id];
              const hasVoted = Boolean(votedVal);
              const isRevealed = revealed;
              const selfShown = isSelf ? selected : null;
              const valueToShow = isRevealed ? votedVal : selfShown;

              const renderGlyph = (v) => {
                if (!v) return null;
                const isCoffee = v === "☕";
                const isUnknown = v === "?";
                const [g1, g2] = gradFor(v);
                return isCoffee ? (
                  <svg viewBox="0 0 64 64" className="h-6 w-6" aria-hidden>
                    <defs>
                      <linearGradient id={`seat_mug_${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor={g1} />
                        <stop offset="100%" stopColor={g2} />
                      </linearGradient>
                    </defs>
                    <g fill={`url(#seat_mug_${id})`}>
                      <rect x="12" y="26" rx="4" ry="4" width="28" height="18" />
                      <path d="M42 30h6a6 6 0 0 1 0 12h-6v-4h6a2 2 0 0 0 0-4h-6z" />
                    </g>
                    <g stroke={`url(#seat_mug_${id})`} strokeWidth="2" fill="none">
                      <path d="M22 18c0 3-3 3-3 6 0 2 2 3 2 5" />
                      <path d="M28 18c0 3-3 3-3 6 0 2 2 3 2 5" />
                    </g>
                  </svg>
                ) : (
                  <span
                    className="text-[16px] font-extrabold leading-none bg-clip-text text-transparent"
                    style={{ backgroundImage: `linear-gradient(135deg, ${gradFor(v)[0]}, ${gradFor(v)[1]})` }}
                  >
                    {isUnknown ? '?' : v}
                  </span>
                );
              };

              const renderAvatar = () => {
                const key = id || name || "guest";
                const [g1, g2] = userGradFor(key);
                const gradId = `seat_av_${(id || name || 'g').toString().replace(/[^a-zA-Z0-9_-]/g,'')}`;
                return (
                  <svg viewBox="0 0 40 40" className="h-6 w-6" aria-hidden>
                    <defs>
                      <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor={g1} />
                        <stop offset="100%" stopColor={g2} />
                      </linearGradient>
                    </defs>
                    <circle cx="20" cy="20" r="18" fill={`url(#${gradId})`} />
                    <g fill="#fff">
                      <circle cx="20" cy="16" r="6" />
                      <path d="M8 32c3-6 9-8 12-8s9 2 12 8" fillOpacity=".9" />
                    </g>
                  </svg>
                );
              };

              // base card appearance similar to bottom rail
              const baseCard = [
                "relative z-10 grid place-items-center aspect-[3/4] w-12 select-none rounded-xl border-2 bg-white text-sm font-semibold shadow-sm overflow-hidden transition dark:bg-gray-900",
              ].join(" ");

              const isMasked = !isSelf && hasVoted && !isRevealed;
              const borderClass = isMasked
                ? "border-transparent"
                : valueToShow || hasVoted
                  ? "border-indigo-600"
                  : "border-black/10 dark:border-white/10";

              return (
                <div className="relative flex flex-col items-center gap-2">
                  <div className="relative isolate">
                    {isSelf && selected && (
                      <button
                        type="button"
                        className="absolute -top-3 -left-3 z-40 grid h-7 w-7 place-items-center rounded-full bg-indigo-500 text-white shadow ring-2 ring-white will-change-transform dark:ring-[#0f1115]"
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
                      className={[baseCard, borderClass].join(" ")}
                    >
                      {/* Empty state when no vote */}
                      {!valueToShow && !hasVoted && (
                        renderAvatar()
                      )}

                      {/* Shown value for self or after reveal */}
                      {valueToShow && (
                        <div className="pointer-events-none">
                          {renderGlyph(valueToShow)}
                        </div>
                      )}

                      {/* Other users: mask their value until reveal */}
                      {!isSelf && hasVoted && !isRevealed && (
                        <div
                          className="absolute inset-0 z-20 rounded-xl cursor-default"
                          style={textureStyleFor(id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      )}
                    </div>
                  </div>
                  <div className="max-w-[120px] truncate text-sm font-semibold text-gray-900 dark:text-white">{name || "Guest"}</div>
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
                    {right[0] ? <Seat id={right[0].id} name={right[0].name} /> : <div className="h-16" />}
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
                      if (qt && (!selected || selected !== v)) qt(-6);
                    }}
                    onMouseLeave={() => {
                      const qt = quickLift.current[v];
                      if (qt && (!selected || selected !== v)) qt(0);
                    }}
                    onClick={async () => {
                      // Prevent toggling after reveal
                      if (revealedRef.current) return;
                      const wasSelected = selected === v;

                      // If clicking the same selected card -> deselect
                      if (wasSelected) {
                        // Lower current card
                        const curQt = quickLift.current[v];
                        if (curQt) curQt(0);
                        lastSelected.current = null;
                        setSelected(null);
                        // Clear own vote locally and notify peers
                        setVotes((prev) => { const n = { ...prev }; if (user?.id) delete n[user.id]; return n; });
                        try { channelRef.current?.trigger?.('client-clear-my-vote', { userId: user?.id }); } catch {}
                        // Fallback broadcast via server event so all clients (even without client-event handlers) update
                        try {
                          await fetch(`/api/session/${encodeURIComponent(sessionId)}/vote`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ userId: user?.id, value: "", storyId: activeStoryId }),
                          });
                        } catch {}
                        return;
                      }

                      // Lower previously selected card if different
                      const prev = lastSelected.current;
                      if (prev && prev !== v) {
                        const prevQt = quickLift.current[prev];
                        if (prevQt) prevQt(0);
                      }

                      // Select and lift the new card
                      setSelected(v);
                      lastSelected.current = v;
                      const qt = quickLift.current[v];
                      if (qt) qt(-10);

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
