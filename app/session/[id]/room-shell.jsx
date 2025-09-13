"use client";

import { useEffect, useMemo, useState } from "react";
import Header from "../../components/header";

export default function RoomShell({ sessionId, sessionName, user }) {
  const values = ["0", "1", "2", "3", "5", "8", "13", "21", "34", "55", "89", "?", "☕"];
  const [selected, setSelected] = useState(null);
  const [copied, setCopied] = useState(false);
  const [members, setMembers] = useState([]);

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
    })();
    return () => {
      try { channel && pusher?.unsubscribe?.(`presence-session-${sessionId}`); } catch {}
      try { pusher?.disconnect?.(); } catch {}
    };
  }, [user?.id, user?.name, sessionId, pusherKey, pusherCluster]);

  return (
    <div className="relative min-h-screen">
      <Header userName={user?.name} />

      {/* Stage */}
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex min-h-[70vh] flex-col items-center justify-center gap-8 pt-24 pb-44">
          {/* Invite helper */}
          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-white/70">Feeling lonely? 🥱</p>
            <button
              onClick={copyInviteLink}
              className="mt-1 text-base font-semibold text-indigo-600 hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-indigo-400"
            >
              {copied ? "Invite link copied!" : "Invite players"}
            </button>
          </div>

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

            const Seat = ({ name, isSelf, value, dashed }) => (
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
                    isSelf && value
                      ? "border-2 border-indigo-500 text-indigo-600 grid place-items-center font-extrabold text-lg"
                      : "border-black/10 bg-gray-200/60 dark:border-white/10 dark:bg-white/10",
                  ].join(" ")}
                >
                  {isSelf && value ? value : null}
                </div>
                </div>
                <div className="text-sm font-semibold text-gray-900 dark:text-white max-w-[120px] truncate">{name || "Guest"}</div>
              </div>
            );

            return (
              <div className="grid w-full max-w-5xl grid-cols-12 items-center gap-4">
                {/* Top row */}
                <div className="col-span-12 flex items-center justify-center gap-6">
                  {top.map((m) => (
                    <Seat key={m.id} name={m.name} />
                  ))}
                </div>

                {/* Middle: left seat + board + right seat */}
                <div className="col-span-12 grid grid-cols-12 items-center">
                  <div className="col-span-2 flex justify-center">
                    {left[0] ? <Seat name={left[0].name} /> : <div className="h-16" />}
                  </div>
                  <div className="col-span-8">
                    <div className="relative w-full rounded-3xl border bg-indigo-50/60 p-10 text-center text-gray-800 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-white">
                      <button className="inline-flex items-center justify-center rounded-xl bg-gray-700 px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-600">
                        Start new voting
                      </button>
                      
                    </div>
                  </div>
                  <div className="col-span-2 flex justify-center">
                    {right[0] ? <Seat name={right[0].name} dashed /> : <div className="h-16" />}
                  </div>
                </div>

                {/* Bottom row (includes self) */}
                <div className="col-span-12 mt-2 flex items-center justify-center gap-6">
                  {bottom.map((m) => (
                    <Seat key={m.id || m.name} name={m.name} isSelf={m.id === selfId} value={m.id === selfId ? selected : undefined} />
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
          <div className="pointer-events-auto rounded-2xl border border-black/10 bg-white/80 p-4 backdrop-blur-md dark:border-white/10 dark:bg-[#0f1115]/80">
            <div className="mb-3 text-center text-sm text-gray-700 dark:text-white/80">Choose your card 👇</div>
            <div className="flex flex-wrap items-center justify-center gap-3">
              {values.map((v) => {
                const isSel = selected === v;
                const isCoffee = v === "☕";
                return (
                  <button
                    key={v}
                    onClick={() => setSelected(v)}
                    className={[
                      "aspect-[3/4] w-12 select-none rounded-xl border-2 bg-transparent text-sm font-semibold transition",
                      "hover:bg-indigo-600/10 dark:hover:bg-indigo-400/10",
                      isSel
                        ? "border-indigo-600 bg-indigo-600 text-white dark:border-indigo-500 dark:bg-indigo-500"
                        : "border-indigo-400 text-indigo-700 dark:border-indigo-400/70 dark:text-indigo-300",
                    ].join(" ")}
                    aria-pressed={isSel}
                    aria-label={isCoffee ? "Coffee break" : `Vote ${v}`}
                  >
                    {isCoffee ? "☕" : v}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom-left helper button */}
      <button
        type="button"
        className="fixed bottom-6 left-6 z-30 grid h-12 w-12 place-items-center rounded-full border border-black/10 bg-white/80 text-xl shadow backdrop-blur dark:border-white/10 dark:bg-[#0f1115]/80"
        aria-label="Assistant"
      >
        🤖
      </button>
    </div>
  );
}
