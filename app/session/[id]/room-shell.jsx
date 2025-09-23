/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import gsap from "gsap";
import Header from "../../components/header";
import FloatingNumbers from "../../components/floating-numbers";
import ConfettiBurst from "../../components/confetti-burst";
import { useTheme } from "../../components/theme-provider";

export default function RoomShell({ sessionId, sessionName, user, enableFloatNumbers = true }) {
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
  // Read theme from ThemeProvider rather than DOM class observers
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [members, setMembers] = useState([]);
  const [votes, setVotes] = useState({});
  const [revealed, setRevealed] = useState(false);
  const [spectators, setSpectators] = useState({}); // { [userId]: true }
  const spectatorsRef = useRef({});
  useEffect(() => { spectatorsRef.current = spectators; }, [spectators]);
  const isSelfSpectator = Boolean(user?.id && spectators[user.id]);
  const [revealTick, setRevealTick] = useState(0);
  const revealedRef = useRef(false);
  useEffect(() => { revealedRef.current = revealed; }, [revealed]);
  useEffect(() => {
    if (revealed) setRevealTick((v) => v + 1);
  }, [revealed]);
  const [activeStoryId, setActiveStoryId] = useState(null);
  // Edit popover state for admin editing votes
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null); // userId being edited
  const [editInitial, setEditInitial] = useState(null);
  const [editSaving, setEditSaving] = useState(false);
  const activeStoryRef = useRef(null);
  const boardRef = useRef(null);
  const patternRef = useRef(null);
  const spectatorEyeRef = useRef(null);
  // Scramble text refs for results
  const avgRef = useRef(null);
  const agrPctRef = useRef(null);
  // ---- Results math (exclude spectators and non-numeric like '?' or '☕') ----
  // Reveal countdown (3s) state/refs
  const [countdown, setCountdown] = useState(0); // 0 = idle, >0 running
  const [countText, setCountText] = useState("3");
  const countdownRef = useRef(null);
  const countdownTlRef = useRef(null);
  const countdownStateRef = useRef(0);
  useEffect(() => { countdownStateRef.current = countdown; }, [countdown]);

  // Reset round locally and notify peers helper
  const resetRoundLocal = () => {
    setRevealed(false);
    setVotes({});
    const prev = lastSelected.current;
    if (prev) { try { quickLift.current[prev]?.(0); } catch {} }
    lastSelected.current = null;
    setSelected(null);
    setCountdown(0);
    setCountText("3");
    countdownTlRef.current?.kill?.();
    countdownStateRef.current = 0;
  };
  const showFloats = Boolean(enableFloatNumbers);
  useEffect(() => { activeStoryRef.current = activeStoryId; }, [activeStoryId]);

  // Spectator eye blink animation
  useEffect(() => {
    if (!isSelfSpectator) return; // only animate when self is spectator
    const eye = spectatorEyeRef.current;
    if (!eye) return;
    // Animate the eyelid group by scaling Y to mimic blinking
    const lid = eye.querySelector('[data-part="lid"]');
    const pupil = eye.querySelector('[data-part="pupil"]');
    const tl = gsap.timeline({ repeat: -1, defaults: { ease: 'sine.inOut' } });
    tl.to(lid, { scaleY: 0.05, transformOrigin: '50% 50%', duration: 0.16 }, 1.6)
      .to(lid, { scaleY: 1, transformOrigin: '50% 50%', duration: 0.18 })
      .to(pupil, { y: -0.6, duration: 0.8 }, 0.2)
      .to(pupil, { y: 0.6, duration: 0.8 }, 1.0)
      .to(pupil, { y: 0, duration: 0.6 }, 1.8);
    return () => tl.kill();
  }, [isSelfSpectator]);


  // Initialize spectator mode from localStorage (self) and announce
  useEffect(() => {
    if (!user?.id || !sessionId) return;
    try {
      const raw = localStorage.getItem(`spz_spectator_self_${sessionId}`);
      if (raw === 'true' || raw === 'false') {
        const flag = raw === 'true';
        setSpectators((prev) => ({ ...prev, [user.id]: flag }));
        // let peers know our initial state
        try { channelRef.current?.trigger?.('client-spectator', { userId: user.id, spectator: flag }); } catch {}
        try { fetch(`/api/session/${encodeURIComponent(sessionId)}/spectator`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user.id, spectator: flag }) }); } catch {}
      }
    } catch {}
  }, [user?.id, sessionId]);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1400);
    return () => clearTimeout(t);
  }, [copied]);

  // Listen for spectator toggle from user-menu and broadcast
  useEffect(() => {
    const onSpec = (e) => {
      const flag = !!e?.detail?.spectator;
      if (!user?.id) return;
      setSpectators((prev) => ({ ...prev, [user.id]: flag }));
      // If turning spectator on during an active round (not revealed), clear own vote everywhere
      if (flag && !revealedRef.current) {
        const prevSel = lastSelected.current;
        if (prevSel) { try { quickLift.current[prevSel]?.(0); } catch {} }
        lastSelected.current = null;
        setSelected(null);
        setVotes((p) => { const n = { ...p }; delete n[user.id]; return n; });
        try { channelRef.current?.trigger?.('client-clear-my-vote', { userId: user.id }); } catch {}
        // server fallback to broadcast a clear
        try { fetch(`/api/session/${encodeURIComponent(sessionId)}/vote`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(buildVoteBody(user.id, "")) }); } catch {}
      }
      try { channelRef.current?.trigger?.('client-spectator', { userId: user.id, spectator: flag }); } catch {}
      // server fallback for reliability
      try { fetch(`/api/session/${encodeURIComponent(sessionId)}/spectator`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user.id, spectator: flag }) }); } catch {}
    };
    window.addEventListener('spz:set-spectator', onSpec);
    return () => window.removeEventListener('spz:set-spectator', onSpec);
  }, [user?.id, sessionId]);

  // Mask overlays are static; no animation needed
  // Helper: build vote payload so we only attach storyId when an active story exists
  const buildVoteBody = (userId, value) => {
    const body = { userId, value };
    const sid = activeStoryRef.current; // ref stays fresh across renders
    if (sid) body.storyId = sid;
    return body;
  };

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
        // Fetch current spectator list from server best-effort store
        fetch(`/api/session/${encodeURIComponent(sessionId)}/spectator`, { cache: 'no-store' })
          .then(r => r.json()).then((d) => {
            const arr = Array.isArray(d?.spectators) ? d.spectators : [];
            if (arr.length) setSpectators((prev) => {
              const next = { ...prev };
              arr.forEach((uid) => { next[uid] = true; });
              return next;
            });
          }).catch(()=>{});
        // Ask others for current state (e.g., revealed) using client events
        try { channel.trigger && channel.trigger('client-sync-request', { from: user.id }); } catch {}
        // Clear any stale vote for myself across peers (e.g., after refresh)
        try { channel.trigger && channel.trigger('client-clear-my-vote', { userId: user.id }); } catch {}
        // Ask others to share their spectator state (for refreshed/new client).
        // Defer slightly to ensure our local event bindings are ready.
        try {
          setTimeout(() => { channel.trigger && channel.trigger('client-spectator-sync', { from: user.id }); }, 150);
          setTimeout(() => { channel.trigger && channel.trigger('client-spectator-sync', { from: user.id }); }, 700);
        } catch {}
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
                body: JSON.stringify(buildVoteBody(user?.id, val)),
              });
            } catch {}
          })();
        }
        // Also share our spectator state so newcomer reflects it
        const spec = Boolean(user?.id && spectatorsRef.current[user.id]);
        if (spec) {
          try { channelRef.current?.trigger?.('client-spectator', { userId: user?.id, spectator: true }); } catch {}
          try { fetch(`/api/session/${encodeURIComponent(sessionId)}/spectator`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user?.id, spectator: true }) }); } catch {}
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
      // When someone requests spectator sync, respond with our current state if any
      channel.bind('client-spectator-sync', (payload) => {
        try {
          const selfId = user?.id;
          if (!selfId) return;
          const spec = Boolean(spectatorsRef.current[selfId]);
          if (spec) {
            channel.trigger && channel.trigger('client-spectator', { userId: selfId, spectator: true });
            fetch(`/api/session/${encodeURIComponent(sessionId)}/spectator`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: selfId, spectator: true })
            }).catch(() => {});
          }
        } catch {}
      });
      const onResetRound = (payload = {}) => {
        resetRoundLocal();
        if (Object.prototype.hasOwnProperty.call(payload, 'storyId')) {
          setActiveStoryId(payload.storyId || null);
        }
      };
      channel.bind('client-reset-round', onResetRound);
      channel.bind('reset-round', onResetRound);
      // Broadcast + listen for a realtime countdown start.
      const onCountdown = () => {
        // Start the 3s countdown on all clients if not already counting and not revealed
        if (!revealedRef.current && countdownStateRef.current === 0) {
          setCountText('3');
          setCountdown(3);
        }
      };
      channel.bind('client-countdown', onCountdown);
      channel.bind('countdown', onCountdown);
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
      // When any user updates their display name, reflect it in the seating
      channel.bind('user:name', (payload) => {
        try {
          const uid = payload?.userId;
          const newName = typeof payload?.name === 'string' ? payload.name : null;
          if (!uid || !newName) return;
          setMembers((prev) => prev.map((m) => (m.id === uid ? { ...m, name: newName } : m)));
        } catch {}
      });
      channel.bind("user-joined", (payload) => {
        // Optional extra join animation hook
      });
      channel.bind("vote-cast", (payload) => {
        if (payload && payload.userId && typeof payload.value === "string") {
          setVotes((prev) => ({ ...prev, [payload.userId]: payload.value }));
        }
      });
      channel.bind('story-avg', (payload) => {
        if (!payload || !payload.storyId) return;
        const avgValue = typeof payload.avg === 'number' ? payload.avg : null;
        const manualFlag = payload?.manual === true;
        try {
          window.dispatchEvent(new CustomEvent('spz:story-avg', { detail: { sessionId, storyId: payload.storyId, avg: avgValue, manual: manualFlag } }));
        } catch {}
      });
      // Handle admin edit events (realtime vote edit by admin)
      const onAdminEdit = (payload) => {
        if (!payload || !payload.userId) return;
        if (typeof payload.value !== 'string') return;
        setVotes((prev) => ({ ...prev, [payload.userId]: payload.value }));
      };
      channel.bind('client-admin-edit', onAdminEdit);
      channel.bind('admin-edit', onAdminEdit);
      const onSpectator = (payload) => {
        if (!payload || !payload.userId) return;
        const flag = Boolean(payload.spectator);
        setSpectators((prev) => ({ ...prev, [payload.userId]: flag }));
        // If a user becomes spectator before reveal, remove their vote locally
        if (flag && !revealedRef.current) {
          setVotes((prev) => {
            const n = { ...prev };
            delete n[payload.userId];
            return n;
          });
        }
      };
      channel.bind('client-spectator', onSpectator);
      channel.bind('spectator', onSpectator);
      channel.bind("reveal", () => {
        setRevealed(true);
      });
    })();
    return () => {
      try { channel && channel.unbind && channel.unbind('user:name'); } catch {}
      try { channel && pusher?.unsubscribe?.(`presence-session-${sessionId}`); } catch {}
      try { pusher?.disconnect?.(); } catch {}
      try { channelRef.current = null; } catch {}
    };
  }, [user?.id, user?.name, sessionId, pusherKey, pusherCluster]);

  // Listen for global user name updates in this tab so if user updates their own name (via user menu)
  // the RoomShell reflects it immediately even if Pusher is slow or unauthenticated in this tab.
  useEffect(() => {
    const onLocalName = (e) => {
      const newName = e?.detail?.name;
      if (typeof newName !== 'string') return;
      const selfId = user?.id;
      if (!selfId) return;
      setMembers((prev) => prev.map((m) => (m.id === selfId ? { ...m, name: newName } : m)));
    };
    window.addEventListener('spz:user-name-updated', onLocalName);
    return () => window.removeEventListener('spz:user-name-updated', onLocalName);
  }, [user?.id]);

  // active story wiring
  useEffect(() => {
    const key = `spz_active_story_${sessionId}`;
    try { const v = localStorage.getItem(key); if (v) setActiveStoryId(v); } catch {}
    const onActive = (e) => {
      const detail = e?.detail || {};
      if (detail.sessionId !== sessionId) return;
      const nextStoryId = detail.storyId || null;
      const origin = detail.origin || 'drawer';
      setActiveStoryId(nextStoryId);
      if (origin === 'drawer') {
        resetRoundLocal();
        try { channelRef.current?.trigger?.('client-reset-round', { storyId: nextStoryId }); } catch {}
        try {
          fetch(`/api/session/${encodeURIComponent(sessionId)}/reset`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user?.id }),
          });
        } catch {}
      } else if (origin === 'auto') {
        resetRoundLocal();
      }
    };
    window.addEventListener('spz:active-story', onActive);
    return () => window.removeEventListener('spz:active-story', onActive);
  }, [sessionId, isDark]);

  // Animate SVG pattern on the board (dense thread drift)
  useEffect(() => {
    const svg = patternRef.current;
    if (!svg) return;
    const pat = svg.querySelector('pattern');
    if (!pat) return;
    // Animate the pattern transform subtly (dense thread drift)
    const tl = gsap.fromTo(
      pat,
      { attr: { patternTransform: 'rotate(45) translate(0 0)' } },
      {
        attr: { patternTransform: 'rotate(45) translate(0 16)' },
        duration: 6,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      }
    );
    return () => { tl?.kill?.(); };
  }, []);

  // Countdown GSAP timeline (top-level hook)
  useEffect(() => {
    // kill previous timeline
    countdownTlRef.current?.kill?.();

    // Clear any stale inline styles that GSAP may have left
    const elNode = countdownRef.current;
    if (elNode) {
      try {
        elNode.style.opacity = '';
        elNode.style.transform = '';
      } catch {}
    }

    if (countdown === 0) return; // idle
    const el = countdownRef.current;
    if (!el) return;

    const tl = gsap.timeline({
      defaults: { ease: 'power2.out' },
      onComplete: async () => {
        // Immediately mark as revealed locally so the button swaps to "Vote again"
        setRevealed(true);
        setCountdown(0);
        await revealAll(); // notify server/peers
        // Safety: clear any inline styles applied during the countdown
        try {
          const node = countdownRef.current;
          if (node) { node.style.opacity = ''; node.style.transform = ''; }
        } catch {}
      },
    });

    const show = (n) => {
      tl.add(() => {
        setCountText(String(n));
        if (el) {
          // choose a bright random HSL color
          const hue = Math.floor(Math.random() * 360);
          el.style.color = `hsl(${hue}, 95%, 55%)`;
        }
      });
      tl.fromTo(el, { scale: 0.7, opacity: 0 }, { scale: 1.3, opacity: 1, duration: 0.4, ease: 'back.out(2)' });
      tl.to(el, { scale: 0.9, opacity: 0, duration: 0.6, ease: 'power2.in' });
    };

    show(3); show(2); show(1);

    countdownTlRef.current = tl;
    // Ensure styles are cleared if the timeline is killed before completion
    const killHandler = () => {
      try {
        const node = countdownRef.current;
        if (node) { node.style.opacity = ''; node.style.transform = ''; }
      } catch {}
    };
    tl.eventCallback('onKill', killHandler);
    return () => { tl.kill(); killHandler(); };
  }, [countdown]);

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
        let serverAvg = null;
        try {
          const res = await fetch(`/api/session/${encodeURIComponent(sessionId)}/reveal-save`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
          });
          if (res?.ok) {
            // if API returns the updated story, use it
            const data = await res.json().catch(() => null);
            if (data && data.story && typeof data.story.avg === 'number') {
              serverAvg = data.story.avg;
            }
          }
        } catch {}
        // Fallback to local computed average if server didn't return one
        const updatedAvg = (typeof serverAvg === 'number') ? serverAvg : (typeof averageVote === 'number' ? averageVote : null);
        try {
          // Notify any open drawers to update this story's average immediately (no refresh needed)
          window.dispatchEvent(new CustomEvent('spz:story-avg', {
            detail: { sessionId, storyId: activeStoryId, avg: updatedAvg, manual: false }
          }));
        } catch {}
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

  // ---- Results math (exclude spectators and non-numeric like '?' or '☕') ----
  const eligibleVotes = useMemo(() => {
    const entries = Object.entries(votes || {}).filter(([uid, val]) => {
      if (!val) return false;
      if (spectators[uid]) return false; // exclude spectators
      return numericValues.includes(String(val));
    });
    return entries.map(([, val]) => Number(String(val)));
  }, [votes, spectators]);

  const averageVote = useMemo(() => {
    if (!eligibleVotes.length) return null;
    const sum = eligibleVotes.reduce((a, b) => a + b, 0);
    return +(sum / eligibleVotes.length).toFixed(1);
  }, [eligibleVotes]);

  const perCardCounts = useMemo(() => {
    const m = new Map();
    eligibleVotes.forEach((n) => m.set(n, (m.get(n) || 0) + 1));
    return numericValues
      .map((v) => Number(v))
      .filter((n) => m.has(n))
      .map((n) => ({ n, c: m.get(n) }));
  }, [eligibleVotes]);

  const agreement = useMemo(() => {
    const total = eligibleVotes.length;
    if (!total) return { pct: 0, top: null };
    const freq = new Map();
    let top = null, topC = 0;
    eligibleVotes.forEach((n) => {
      const c = (freq.get(n) || 0) + 1;
      freq.set(n, c);
      if (c > topC) { topC = c; top = n; }
    });
    const pct = Math.round((topC / total) * 100);
    return { pct, top };
  }, [eligibleVotes]);

  // Scramble Average & Agreement while saving an edit; slow down before showing final
  useEffect(() => {
    // --- Pulse GSAP timeline for pie ring (MiniPie) during scramble ---
    let piePulseTl = null;
    let pieEl = null;
    // Pulse the parent of agrPctRef (which is the <div> wrapping MiniPie and the %)
    if (agrPctRef.current) {
      // Find the parent node that contains the MiniPie SVG and % text.
      // We pulse the parent <div> (className="flex items-center gap-3")
      pieEl = agrPctRef.current.parentNode;
    }
    // Cleanup pulse timeline helper
    const killPiePulse = () => {
      if (piePulseTl) { piePulseTl.kill(); piePulseTl = null; }
      if (pieEl) gsap.set(pieEl, { scale: 1 });
    };

    // --- Scramble logic with max 2 digits for agreement (votes are max 2-digit) ---
    const targets = [
      { ref: avgRef, final: averageVote == null ? '—' : String(averageVote), suffix: '', charset: '0123456789.' },
      { ref: agrPctRef, final: `${Math.max(0, Math.min(100, agreement.pct || 0))}%`, suffix: '%', charset: '0123456789' },
    ];

    // Helper: scramble up to 2 chars for agreement pct, up to 2 for avg
    const writeRandom = (el, final, charset, suffix) => {
      if (!el) return;
      // Only allow max 2 chars for scramble (since votes are at most 2 digits)
      let base = String(final).replace('%', '');
      let len = Math.max(1, Math.min(2, base.length));
      let out = '';
      for (let i = 0; i < len; i++) out += charset[Math.floor(Math.random() * charset.length)];
      if (suffix && final.endsWith(suffix)) out += suffix;
      el.textContent = out;
    };

    let rafId = null;
    let stopTicker = false;

    if (editSaving) {
      // Pulse the pie ring (MiniPie) parent
      if (pieEl) {
        killPiePulse();
        piePulseTl = gsap.timeline({ repeat: -1, defaults: { ease: "power1.inOut" } });
        piePulseTl.to(pieEl, { scale: 1.08, duration: 0.18 })
                  .to(pieEl, { scale: 1, duration: 0.18 });
      }
      const tick = () => {
        if (stopTicker) return;
        targets.forEach((t) => writeRandom(t.ref.current, t.final, t.charset, t.suffix));
        rafId = requestAnimationFrame(tick);
      };
      rafId = requestAnimationFrame(tick);
      return () => {
        stopTicker = true;
        if (rafId) cancelAnimationFrame(rafId);
        killPiePulse();
      };
    }

    // When editSaving is false, stop pulsing and ease scale back to 1
    if (pieEl) {
      killPiePulse();
      gsap.to(pieEl, { scale: 1, duration: 0.24, ease: "power2.out" });
    }

    let steps = 12; // ~0.6s at 50ms
    const interval = 50;
    const id = setInterval(() => {
      targets.forEach((t) => writeRandom(t.ref.current, t.final, t.charset, t.suffix));
      steps -= 1;
      if (steps <= 0) {
        clearInterval(id);
        targets.forEach((t) => { const el = t.ref.current; if (el) el.textContent = t.final; });
      }
    }, interval);
    return () => {
      clearInterval(id);
      killPiePulse();
    };
  }, [editSaving, averageVote, agreement.pct]);

  // Tiny pie for agreement visual
  // Supports a masked mode that animates a decoy fill so users can't guess before reveal.
  const MiniPie = ({ pct = 0, masked = false }) => {
    const clamped = Math.max(0, Math.min(100, pct));
    const R = 18;
    const C = 2 * Math.PI * R;
    const arcRef = useRef(null);
    const tlRef = useRef(null);

    // Map agreement 0→100 to hue 0 (red) → 120 (green)
    const hueFor = (p) => Math.round((Math.max(0, Math.min(100, p)) / 100) * 120);

    // Initialize track instantly
    useEffect(() => {
      const arc = arcRef.current;
      if (!arc) return;
      // kill any prior timeline
      tlRef.current?.kill?.();

      if (masked) {
        // Decoy animation: oscillate between two low/medium fills, jittering hue a bit.
        const startPct = 12 + Math.random() * 10;   // 12–22%
        const endPct   = 28 + Math.random() * 12;   // 28–40%
        const state = { p: startPct };
        const update = () => {
          const dash = (state.p / 100) * C;
          arc.setAttribute('stroke-dasharray', `${dash} ${C - dash}`);
          const hue = hueFor(20 + (state.p - startPct)); // small hue drift
          arc.setAttribute('stroke', `hsl(${hue} 90% 50%)`);
        };
        update();
        const tl = gsap.timeline({ repeat: -1, yoyo: true, defaults: { ease: 'sine.inOut' } });
        tl.to(state, { p: endPct, duration: 1.2, onUpdate: update })
          .to(state, { p: startPct, duration: 1.2, onUpdate: update });
        tlRef.current = tl;
        return () => tl.kill();
      }

      // Unmasked (revealed): smoothly animate to the true percentage
      const state = { p: 0 };
      const dashTo = (p) => {
        const dash = (p / 100) * C;
        arc.setAttribute('stroke-dasharray', `${dash} ${C - dash}`);
        arc.setAttribute('stroke', `hsl(${hueFor(p)} 90% 50%)`);
      };
      // Always start from 0 so the fill grows visibly
      state.p = 0;
      dashTo(0);
      const tl = gsap.to(state, { p: clamped, duration: 0.45, ease: 'power2.out', onUpdate: () => dashTo(state.p) });
      tlRef.current = tl;
      return () => tl.kill();
    }, [masked, clamped]);

    return (
      <svg viewBox="0 0 48 48" className="h-10 w-10">
        {/* base track */}
        <circle cx="24" cy="24" r={R} stroke="currentColor" strokeOpacity="0.15" strokeWidth="6" fill="none" />
        {/* active arc (animated) */}
        <circle
          ref={arcRef}
          cx="24"
          cy="24"
          r={R}
          stroke={`hsl(${hueFor(clamped)} 90% 50%)`}
          strokeWidth="6"
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`0 ${C}`}
          transform="rotate(-90 24 24)"
        />
      </svg>
    );
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

  // Floating SVG numbers moved to separate component

  const hasAnyVotes = Object.values(votes || {}).some((val) => typeof val === 'string' && val !== '');
  const noVotesYet = !hasAnyVotes && !selected && !revealed;

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

  // animation handled inside FloatingNumbers component

  return (
    <div className="relative h-[100dvh] overflow-hidden overscroll-none">
      <Header userName={(members.find((m) => m.id === user?.id)?.name) || user?.name} sessionName={sessionName} sessionId={sessionId} />

      {/* Stage */}
      <div className="mx-auto max-w-6xl px-6">
        <div className="relative flex h-[calc(100dvh-56px-160px)] flex-col items-center justify-center gap-8 pt-6 sm:h-[calc(100dvh-64px-160px)] sm:pt-8 overflow-hidden">
          {/* Invite helper (hide when more than one participant) */}
          {/* Invite helper (hide when more than one participant) */}
          {members.length <= 1 && (
            <div className="text-center">
              <div className="mt-6 flex w-full items-center justify-center">
              <div className="inline-flex items-center gap-2  px-3 py-1.5 text-xs text-gray-700  dark:text-white/80">              
                <span>Feeling lonely?</span>
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              </div>
              <button
                onClick={copyInviteLink}
                className="cursor-pointer mt-1 text-base font-semibold text-indigo-600 hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-indigo-400"
              >
                {copied ? "Invite link copied!" : "Invite players"}
              </button>
            </div>
          )}

          {/* Compute seating */}
          {(() => {
            const selfId = user?.id;
            const self = members.find((m) => m.id === selfId) || (selfId ? { id: selfId, name: user?.name } : null);
            // If local storage already has a newer name for self, prefer it until presence sync fills in
            try {
              if (self && (!self.name || self.name === 'Guest user')) {
                const raw = localStorage.getItem('spz_user');
                const parsed = raw ? JSON.parse(raw) : null;
                const localName = parsed?.name;
                if (typeof localName === 'string' && localName.trim()) self.name = localName.trim();
              }
            } catch {}
            const others = members.filter((m) => m.id !== selfId);
            const left = others[0] ? [others[0]] : [];
            const right = others[1] ? [others[1]] : [];
            const rest = others.slice(2);
            const top = rest.slice(0, Math.ceil(rest.length / 2));
            const bottom = [self, ...rest.slice(Math.ceil(rest.length / 2))].filter(Boolean);

            const openEdit = (uid, current) => {
              setEditTarget(uid);
              setEditInitial(current || votes[uid] || null);
              setEditOpen(true);
            };

            const Seat = ({ id, name, isSelf, dashed }) => {
              const votedVal = votes[id];
              const hasVoted = Boolean(votedVal);
              const isRevealed = revealed;
              const selfShown = isSelf ? selected : null;
              const valueToShow = isRevealed ? votedVal : selfShown;
              const isSpectator = Boolean(spectators[id]);
              const maskRef = useRef(null);
              const valueRef = useRef(null);
              const cardRootRef = useRef(null);

              // Track whether this seat has already run its first-time reveal animation this round
              const didRevealRef = useRef(false);

              // Creamy-smooth reveal on first reveal only; skip fade-in during edits/recalc
              useEffect(() => {
                const maskEl = maskRef.current;
                const valEl = valueRef.current;
                const cardEl = cardRootRef.current;

                const ctx = gsap.context(() => {
                  // Reset when not revealed or no vote; also reset the first-reveal flag
                  if (!isRevealed || !hasVoted) {
                    didRevealRef.current = false;
                    if (maskEl) gsap.set(maskEl, { opacity: (hasVoted && !isSelf) ? 1 : 0, filter: 'blur(0px)' });
                    if (valEl) gsap.set(valEl, { opacity: (isSelf && valueToShow && !isRevealed) ? 1 : 0, y: 0, scale: 1 });
                    if (cardEl) gsap.set(cardEl, { scale: 1 });
                    return;
                  }

                  // Already revealed: if we're editing/saving or we've already animated once, just ensure visible state without any fade-in
                  if (isRevealed && hasVoted && (editSaving || didRevealRef.current)) {
                    if (maskEl) gsap.set(maskEl, { opacity: 0, filter: 'blur(0px)' });
                    if (valEl) gsap.set(valEl, { opacity: 1, y: 0, scale: 1 });
                    if (cardEl) gsap.set(cardEl, { scale: 1 });
                    return;
                  }

                  // First-time reveal animation (only once per round per seat)
                  if (hasVoted) {
                    const tl = gsap.timeline({ defaults: { overwrite: true } });
                    if (!isSelf && maskEl) {
                      tl.to(maskEl, {
                        opacity: 0,
                        filter: 'blur(1.5px)',
                        duration: 0.42,
                        ease: 'power2.out',
                        force3D: true,
                      }, 0);
                    }
                    if (valEl) {
                      tl.fromTo(valEl,
                        { opacity: 0, y: 8, scale: 0.985, willChange: 'transform,opacity' },
                        { opacity: 1, y: 0, scale: 1, duration: 0.50, ease: 'power3.out', force3D: true },
                        0.18
                      );
                    }
                    if (cardEl) {
                      tl.fromTo(cardEl,
                        { scale: 0.998 },
                        { scale: 1, duration: 0.50, ease: 'sine.out' },
                        0
                      );
                    }
                    tl.add(() => { didRevealRef.current = true; });
                    return () => tl.kill();
                  }
                });
                return () => ctx.revert();
              }, [isRevealed, hasVoted, isSelf, valueToShow, editSaving]);

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
              const borderClass = (isMasked || isSpectator)
                ? "border-transparent"
                : (valueToShow || hasVoted)
                  ? "border-indigo-600"
                  : "border-black/10 dark:border-white/10";

              return (
                <div className="relative flex flex-col items-center gap-2">
                  <div className="relative isolate">
                    {isSelf && isRevealed && hasVoted && (
                      <button
                        type="button"
                        disabled={editSaving}
                        className="cursor-pointer absolute -top-3 -left-3 z-40 grid h-7 w-7 place-items-center rounded-full bg-indigo-500 text-white shadow ring-2 ring-white will-change-transform dark:ring-[#0f1115]"
                        title="Edit vote"
                        aria-label="Edit vote"
                        onClick={() => { if (!editSaving) openEdit(id, votedVal); }}
                      >
                      {editSaving ? (
                        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-90" d="M4 12a8 8 0 0 1 8-8" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 20h9" />
                          <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4Z" />
                        </svg>
                      )}
                      </button>
                    )}
                    <div
                      ref={cardRootRef}
                      className={[baseCard, borderClass].join(" ")}
                    >
                      {/* Spectator badge overlay */}
                      {isSpectator && (
                        <div className="pointer-events-none absolute -inset-[2px] z-30 grid place-items-center rounded-[0.9rem] bg-white-900/25 backdrop-blur-[2px] dark:bg-black/30">
                          <span className="relative grid h-8 w-8 place-items-center rounded-full bg-white/80 shadow-[0_6px_20px_rgba(0,0,0,0.25)] ring-2 ring-white/40 dark:bg-white/10 dark:ring-white/20">
                            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                          </span>
                        </div>
                      )}
                      {/* Base content stack: avatar / self value (pre-reveal) / mask / revealed value */}
                      {/* Avatar when not voted and not locally selecting (optimistic) */}
                      {(!hasVoted && !(isSelf && valueToShow)) && (
                        <div className="grid h-full w-full place-items-center">
                          {renderAvatar()}
                        </div>
                      )}

                      {/* Self value before reveal */}
                      {(isSelf && valueToShow && !isRevealed) && (
                        <div className="pointer-events-none grid h-full w-full place-items-center transform-gpu">
                          {renderGlyph(valueToShow)}
                        </div>
                      )}

                      {/* Mask overlay for others (voted, unrevealed) */}
                      {(hasVoted && !isSelf && !isRevealed) && (
                        <div
                          ref={maskRef}
                          className="absolute inset-0 rounded-xl transform-gpu"
                          style={textureStyleFor(id)}
                        />
                      )}

                      {/* Revealed value (fades in) */}
                      {(hasVoted && isRevealed) && (
                        <div ref={valueRef} className="pointer-events-none absolute inset-0 grid place-items-center transform-gpu" style={{ opacity: 0 }}>
                          {renderGlyph(votedVal)}
                        </div>
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
                  <div
                    ref={boardRef}
                    className="relative w-full overflow-hidden rounded-3xl border border-black/10 bg-white/90 p-10 text-center text-gray-800 shadow-sm dark:border-white/10 dark:bg-gray-900/90 dark:text-white"
                  >
                    {/* Dense, threaded SVG pattern (animated) */}
                    <svg
                      ref={patternRef}
                      className="w-full pointer-events-none absolute inset-0 z-0 opacity-50 dark:opacity-25 text-gray-700/50 dark:text-white/40"
                      aria-hidden
                    >
                      <defs>
                        <pattern id="spzDense" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                          <rect width="16" height="16" fill="none"/>
                          <path d="M0 8 H16 M8 0 V16" stroke="currentColor" strokeWidth="0.6" opacity="0.35"/>
                        </pattern>
                      </defs>
                      <rect x="0" y="0" width="100%" height="100%" fill="url(#spzDense)" />
                    </svg>

                    {/* Floating SVG numbers background (inside board, above pattern) */}
                    {showFloats && (
                      <FloatingNumbers
                        values={numericValues}
                        seed={`floats_${sessionId}`}
                        count={18}
                        isDark={isDark}
                        gradFor={gradFor}
                        animationType="parallax"
                        speed={countdown > 0 ? 'fast' : 'slow'}
                        className="z-10"
                      />
                    )}

                    {/* Confetti when revealed */}
                    <ConfettiBurst trigger={revealTick} options={{ count: 48 }} />

                    {noVotesYet ? (
                      <div key="mode_pick" className="relative z-10 flex items-center justify-center">
                        <div className="rounded-xl px-4 py-2 text-lg font-semibold text-gray-700 dark:text-white/80">
                          Pick your cards!
                        </div>
                      </div>
                    ) : countdown > 0 ? (
                      <div key="mode_countdown" className="relative z-10 flex items-center justify-center">
                        <div
                          ref={countdownRef}
                          className="select-none rounded-2xl px-6 py-3 text-4xl font-black tracking-tight text-gray-900 opacity-0 dark:text-white"
                        >
                          {countText}
                        </div>
                      </div>
                    ) : revealed ? (
                      <div key="mode_revealed" className="relative z-10 flex items-center justify-center">
                        <button
                          onClick={() => {
                            resetRoundLocal();
                            try { channelRef.current?.trigger?.('client-reset-round', {}); } catch {}
                            // Server fallback to ensure all clients receive the reset
                            try {
                              fetch(`/api/session/${encodeURIComponent(sessionId)}/reset`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ userId: user?.id }),
                              });
                            } catch {}
                          }}
                          className="group relative inline-flex items-center gap-2 rounded-2xl px-6 py-3 text-sm font-bold text-gray-900 transition focus:outline-none disabled:opacity-60 dark:text-white"
                        >
                          <span className="absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-500 via-cyan-400 to-emerald-400 opacity-90 [mask:linear-gradient(#000_0_0)_content-box,linear-gradient(#000_0_0)] [mask-composite:exclude] p-[2px]" />
                          <span className="relative">
                            <span className="inline-flex items-center gap-2">
                              <svg
                                viewBox="0 0 48 48"
                                className="h-4 w-4"
                                fill="none"
                                aria-hidden
                              >
                                {/* Dark arc (top‑left), navy */}
                                <path
                                  d="M6 28a18 18 0 0 1 28-12"
                                  stroke="#f8f8f8ff"
                                  strokeWidth="6"
                                  strokeLinecap="round"
                                />
                                {/* Dark arrowhead */}
                                <path
                                  d="M6 28 l-5 -0.5 l3.2 3.2"
                                  fill="#ffffffff"
                                  stroke="#ffffffff"
                                  strokeWidth="2"
                                  strokeLinejoin="round"
                                />

                                {/* Light arc (bottom‑right), gray */}
                                <path
                                  d="M42 20a18 18 0 0 1-28 12"
                                  stroke="#ffffffff"
                                  strokeWidth="6"
                                  strokeLinecap="round"
                                />
                                {/* Light arrowhead */}
                                <path
                                  d="M42 20 l3.6 3.6 l-5.2 0.6"
                                  fill="#ffffffff"
                                  stroke="#ffffffff"
                                  strokeWidth="2"
                                  strokeLinejoin="round"
                                />
                              </svg>
                              <span>Vote again</span>
                            </span>
                          </span>
                        </button>
                      </div>
                    ) : (
                      <div key="mode_vote" className="relative z-10 flex items-center justify-center">
                        <button
                          onClick={() => {
                            if (countdownStateRef.current > 0 || revealedRef.current) return;
                            try { channelRef.current?.trigger?.('client-countdown', { by: user?.id }); } catch {}
                            // Server fallback to ensure all clients receive the event
                            try { fetch(`/api/session/${encodeURIComponent(sessionId)}/countdown`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user?.id }) }); } catch {}
                            setCountText('3');
                            setCountdown(3);
                          }}
                          disabled={countdown > 0}
                          className="cursor-pointer group relative inline-flex items-center gap-2 rounded-2xl px-6 py-3 text-sm font-bold text-gray-900 transition focus:outline-none disabled:opacity-60 dark:text-white"
                        >
                          <span className=" absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-500 via-cyan-400 to-emerald-400 opacity-90 [mask:linear-gradient(#000_0_0)_content-box,linear-gradient(#000_0_0)] [mask-composite:exclude] p-[2px]" />
                          <span className="relative">
                            <span className="inline-flex items-center gap-2">
                              <svg
                                viewBox="0 0 24 24"
                                className="h-4 w-4 flex-none opacity-80 transition group-hover:opacity-100"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                aria-hidden
                              >
                                <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" />
                                <circle cx="12" cy="12" r="3" />
                              </svg>
                              <span>Reveal Cards</span>
                            </span>
                          </span>
                        </button>
                      </div>
                    )}
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

      {/* Edit vote popover */}
      {editOpen && (
        <div
          className="fixed inset-0 z-[100] grid place-items-center bg-black/30 backdrop-blur-sm dark:bg-black/50"
          onClick={() => setEditOpen(false)}
        >
          <div
            className="relative w-[min(92vw,700px)] rounded-3xl border border-black/10 bg-white p-6 shadow-xl dark:border-white/10 dark:bg-gray-900"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setEditOpen(false)}
              className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full text-gray-500 hover:bg-black/5 hover:text-gray-700 focus:outline-none dark:text-white/70 dark:hover:bg-white/10"
              aria-label="Close"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
            <div className="mb-4 text-lg font-bold text-gray-900 dark:text-white">Edit vote</div>

            <div className="grid grid-cols-4 gap-6 sm:grid-cols-6">
              {values.map((v) => {
                const isSel = String(editInitial) === String(v);
                const isCoffee = v === '☕';
                const isUnknown = v === '?';
                const [g1, g2] = gradFor(v);
                return (
                  <button
                    key={`edit_${v}`}
                    type="button"
                    onClick={async () => {
                      // Optimistic local apply
                      if (editTarget) {
                        setVotes((prev) => ({ ...(prev || {}), [editTarget]: String(v) }));
                      }
                      setEditSaving(true);
                      setEditOpen(false);
                      // Broadcast + persist
                      try { channelRef.current?.trigger?.('client-admin-edit', { userId: editTarget, value: String(v) }); } catch {}
                      try {
                        await fetch(`/api/session/${encodeURIComponent(sessionId)}/vote`, {
                          method: 'POST', headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify(buildVoteBody(editTarget, String(v)))
                        });
                      } catch {}
                      setEditSaving(false);
                    }}
                    className={[
                      'group relative grid h-14 w-14 place-items-center rounded-2xl border-2 bg-white text-sm font-bold shadow-sm transition cursor-pointer dark:bg-gray-900',
                      isSel
                        ? 'border-indigo-500 ring-2 ring-indigo-400/40'
                        : 'border-black/10 dark:border-white/10 hover:shadow-md hover:border-indigo-300 hover:scale-[1.03]'
                    ].join(' ')}
                    aria-label={isCoffee ? 'Coffee' : isUnknown ? 'Unknown' : `Set to ${v}`}
                  >
                    {isCoffee ? (
                      <svg viewBox="0 0 64 64" className="h-7 w-7" aria-hidden>
                        <defs>
                          <linearGradient id={`edit_mug_${v}`} x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor={g1} />
                            <stop offset="100%" stopColor={g2} />
                          </linearGradient>
                        </defs>
                        <g fill={`url(#edit_mug_${v})`}>
                          <rect x="12" y="26" rx="4" ry="4" width="28" height="18" />
                          <path d="M42 30h6a6 6 0 0 1 0 12h-6v-4h6a2 2 0 0 0 0-4h-6z" />
                        </g>
                        <g stroke={`url(#edit_mug_${v})`} strokeWidth="2" fill="none">
                          <path d="M22 18c0 3-3 3-3 6 0 2 2 3 2 5" />
                          <path d="M28 18c0 3-3 3-3 6 0 2 2 3 2 5" />
                        </g>
                      </svg>
                    ) : (
                      <span
                        className="text-[18px] font-extrabold leading-none bg-clip-text text-transparent"
                        style={{ backgroundImage: `linear-gradient(135deg, ${g1}, ${g2})` }}
                      >
                        {isUnknown ? '?' : v}
                      </span>
                    )}
                    {isSel && (
                      <span className="pointer-events-none absolute inset-0 rounded-2xl bg-indigo-500/5" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {editSaving && (
        <div className="fixed top-3 left-1/2 z-[110] -translate-x-1/2">
          <div className="flex items-center gap-2 rounded-xl bg-white/90 px-3 py-1.5 text-xs font-semibold text-gray-800 shadow dark:bg-gray-900/90 dark:text-white">
            <svg className="h-4 w-4 animate-spin text-indigo-600 dark:text-indigo-400" viewBox="0 0 24 24" fill="none" aria-hidden>
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-90" d="M4 12a8 8 0 0 1 8-8" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
            </svg>
            Updating…
          </div>
        </div>
      )}

      {/* Bottom area: results when revealed; else cards or spectator banner (persisted) */}
      {revealed ? (
        <div className="pointer-events-auto fixed inset-x-0 bottom-0 z-30">
          <div className="mx-auto max-w-6xl px-6 pb-6">
            <div className="flex flex-col gap-6 p-5 ">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-3" style={{ width: '50%', alignSelf: 'center' }}>
                <div className="block items-center gap-3 text-center">
                  <div className="text-sm font-semibold text-gray-700 dark:text-white/80">Average:</div>
                  {(() => {
                    // Compute the nearest numeric card for the current average
                    if (averageVote == null) {
                      // fallback to plain text when no average
                      // Use scramble ref
                      return <div className="text-5xl font-black text-gray-900 dark:text-white p-3">
                        <span
                          ref={avgRef}
                          
                        >
                          {'-'}
                        </span>
                      </div>;
                    }
                    // Find the closest value in numericValues
                    // Convert all to numbers for comparison
                    const avg = Number(averageVote);
                    const nums = numericValues.map(Number);
                    let closest = nums[0];
                    let minDiff = Math.abs(avg - nums[0]);
                    for (let i = 1; i < nums.length; ++i) {
                      const diff = Math.abs(avg - nums[i]);
                      if (
                        diff < minDiff ||
                        (diff === minDiff && nums[i] > closest) // Prefer higher if tie
                      ) {
                        closest = nums[i];
                        minDiff = diff;
                      }
                    }
                    const [g1, g2] = gradFor(String(closest));
                    return (
                      <div className="text-5xl font-black text-gray-900 dark:text-white p-3">
                        <span
                          ref={avgRef}
                          className="bg-clip-text text-transparent"
                          style={{ backgroundImage: `linear-gradient(135deg, ${g1}, ${g2})` }}
                        >
                          {averageVote}
                        </span>
                      </div>
                    );
                  })()}
                </div>
                <div className="block items-center gap-3 text-center">
                  <div className="text-sm font-semibold text-gray-700 dark:text-white/80">Agreement:</div>
                  <div className="flex items-center gap-3 justify-center p-3">
                    <MiniPie pct={agreement.pct} masked={false} />
                    <div style={{width: '3rem'}} className="text-lg font-bold text-gray-900 dark:text-white"><span ref={agrPctRef}>{agreement.pct}%</span></div>
                  </div>
                </div>
                <div className="block items-center gap-3 text-center">
                  <div className="text-sm font-semibold text-gray-700 dark:text-white/80 p-3">Voters:</div>
                  {(() => {
                    // Compute percentage and color
                    const votePct = members.length ? (eligibleVotes.length / members.length) * 100 : 0;
                    // Map 0% → red (hue 0), 50% → orange (hue 30), 100% → blue (hue 210)
                    // Interpolate hues: red (0), orange (30), blue (210)
                    let hue;
                    if (votePct <= 50) {
                      // red to orange
                      // 0% = 0, 50% = 30
                      hue = 0 + (30 * (votePct / 50));
                    } else {
                      // orange to blue
                      // 50% = 30, 100% = 210
                      hue = 30 + (180 * ((votePct - 50) / 50));
                    }
                    hue = Math.round(Math.max(0, Math.min(210, hue)));
                    return (
                      <div
                        className="text-lg font-bold"
                        style={{ color: `hsl(${hue}, 90%, 50%)` }}
                      >
                        {eligibleVotes.length}
                      </div>
                    );
                  })()}
                </div>
              </div>
              <div className="flex flex-wrap items-end gap-4 justify-center">
                {perCardCounts.length === 0 && (
                  <div className="text-sm text-gray-600 dark:text-white/70">No numeric votes yet.</div>
                )}
                {perCardCounts.map(({ n, c }) => {
                  const [g1, g2] = gradFor(String(n));
                  return (
                    <div key={`res_${n}`} className="flex flex-col items-center">
                      <div className="grid h-16 w-12 place-items-center rounded-xl border-2 border-black/10 bg-white text-sm font-extrabold dark:border-white/10 dark:bg-gray-900">
                        <span className="bg-clip-text text-transparent" style={{ backgroundImage: `linear-gradient(135deg, ${g1}, ${g2})` }}>{n}</span>
                      </div>
                      <div className="mt-1 text-xs text-gray-600 dark:text-white/70">{c} Vote{c>1?'s':''}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : isSelfSpectator ? (
        <div className="pointer-events-auto fixed inset-x-0 bottom-0 z-30">
          <div className="mx-auto max-w-2xl px-6 pb-6">
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-black/10 bg-white/80 p-4 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-white/5">
              <div className="flex items-center gap-3">
                <svg ref={spectatorEyeRef} viewBox="0 0 64 32" className="h-10 w-14 text-gray-800 dark:text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <g data-part="lid" transform="scale(1,1)"><path d="M2 16s10-14 30-14 30 14 30 14-10 14-30 14S2 16 2 16Z" fill="currentColor" opacity="0.06" /><path d="M2 16s10-14 30-14 30 14 30 14-10 14-30 14S2 16 2 16Z" /></g>
                  <circle data-part="pupil" cx="32" cy="16" r="4" fill="currentColor" />
                </svg>
                <div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">You are in spectator mode</div>
                  <div className="text-xs text-gray-600 dark:text-white/70">You can watch the round but can’t vote.</div>
                </div>
              </div>
              <button onClick={() => { window.dispatchEvent(new CustomEvent('spz:set-spectator', { detail: { spectator: false } })); try { channelRef.current?.trigger?.('client-spectator', { userId: user?.id, spectator: false }); } catch {} try { fetch(`/api/session/${encodeURIComponent(sessionId)}/spectator`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user?.id, spectator: false }) }); } catch {} }} className="cursor-pointer group relative inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-bold text-gray-900 transition focus:outline-none dark:text-white">
                <span className="absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-500 via-cyan-400 to-emerald-400 opacity-90 [mask:linear-gradient(#000_0_0)_content-box,linear-gradient(#000_0_0)] [mask-composite:exclude] p-[2px]" />
                <span className="relative">Deactivate</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* existing bottom card rail UI unchanged */
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30">
          <div className="mx-auto max-w-6xl px-6 pb-6">
            <div className="pointer-events-auto rounded-2xl  p-4 backdrop-blur-md">
              <div className="m-4 flex items-center justify-center gap-2 text-xs font-medium text-gray-600 dark:text-white/60">      
                <span>Choose your card</span>
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3 p-3">
                {values.map((v) => {
                  const isSel = selected === v;
                  const isCoffee = v === "☕";
                  const isUnknown = v === "?";
                  const [g1, g2] = gradFor(v);

                  return (
                    <button
                      key={`rail_${v}`}
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
                        // Prevent toggling during countdown or after reveal
                        if (countdown > 0 || revealedRef.current) return;
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
                              body: JSON.stringify({ userId: user?.id, value: "", storyId: activeStoryRef.current }),
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
                        // Optimistically reflect my vote locally to avoid avatar/number overlap
                        setVotes((prev) => ({ ...(prev || {}), [user?.id]: v }));
                        lastSelected.current = v;
                        const qt = quickLift.current[v];
                        if (qt) qt(-10);

                        try {
                          await fetch(`/api/session/${encodeURIComponent(sessionId)}/vote`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ userId: user?.id, value: v, storyId: activeStoryRef.current }),                          
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
                      
                      aria-label={isCoffee ? "Coffee break" : isUnknown ? "Vote unknown" : `Vote ${v}`}
                      style={{
                        // Keep surface white; gradients only on the glyphs
                        WebkitTapHighlightColor: "transparent",
                      }
                    }
                    >
                      {/* symbol */}
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
      )}

      
    </div>
  );
}
