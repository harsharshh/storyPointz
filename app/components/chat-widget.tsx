"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";

export type ChatWidgetMessage = {
  id: string;
  userId?: string;
  author: string;
  body: string;
  timestamp: string; // ISO string
};

type ChatWidgetProps = {
  open?: boolean;
  messages?: ChatWidgetMessage[];
  unreadCount?: number;
  onToggle?: (open: boolean) => void;
  onSubmit?: (message: string) => void;
};

function formatRelativeTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const diffSeconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffSeconds < 5) return "Just now";
  if (diffSeconds < 60) return `${diffSeconds}s`;
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return diffMinutes === 1 ? "1m" : `${diffMinutes}m`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return diffHours === 1 ? "1h" : `${diffHours}h`;
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function ChatWidget({
  open: controlledOpen,
  messages = [],
  unreadCount = 0,
  onToggle,
  onSubmit,
}: ChatWidgetProps = {}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = typeof controlledOpen === "boolean" ? controlledOpen : internalOpen;
  const [emojiOpen, setEmojiOpen] = useState(false);

  const setOpenState = useCallback(
    (next: boolean) => {
      if (typeof controlledOpen !== "boolean") {
        setInternalOpen(next);
      }
      onToggle?.(next);
    },
    [controlledOpen, onToggle]
  );

  const toggle = useCallback(() => {
    setOpenState(!open);
  }, [open, setOpenState]);

  const close = useCallback(() => setOpenState(false), [setOpenState]);

  const iconRef = useRef<HTMLSpanElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const previousUnreadRef = useRef(unreadCount);
  const emojiButtonRef = useRef<HTMLButtonElement | null>(null);
  const emojiPanelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = iconRef.current;
    if (!node) return;
    const tl = gsap.timeline({ repeat: -1, yoyo: true });
    tl.to(node, { scale: 1.15, duration: 0.9, ease: "power2.inOut" })
      .to(node, { scale: 0.92, duration: 0.9, ease: "power2.inOut" });
    return () => { tl.kill(); };
  }, []);

  useEffect(() => {
    if (!open && unreadCount > previousUnreadRef.current) {
      const node = iconRef.current;
      if (node) {
        gsap.fromTo(node, { scale: 1.35 }, { scale: 1, duration: 0.5, ease: "back.out(3)", overwrite: "auto" });
      }
    }
    previousUnreadRef.current = unreadCount;
  }, [unreadCount, open]);

  useEffect(() => {
    if (!open) return;
    const handler = (event: MouseEvent) => {
      const target = event.target as Node | null;
      const panel = panelRef.current;
      const button = buttonRef.current;
      if (!panel || !button) return;
      if (panel.contains(target) || button.contains(target)) return;
      close();
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [open, close]);

  useEffect(() => {
    if (!emojiOpen) return;
    const onClick = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (emojiPanelRef.current?.contains(target) || emojiButtonRef.current?.contains(target)) {
        return;
      }
      setEmojiOpen(false);
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [emojiOpen]);

  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (!panel) return;
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
    tl.fromTo(panel, { autoAlpha: 0, y: 12, scale: 0.96 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.24 });
    return () => {
      tl.kill();
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const appendEmoji = useCallback((emoji: string) => {
    const input = inputRef.current;
    if (!input) return;
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? input.value.length;
    const value = input.value;
    const nextValue = value.slice(0, start) + emoji + value.slice(end);
    input.value = nextValue;
    const cursor = start + emoji.length;
    requestAnimationFrame(() => {
      input.focus();
      input.setSelectionRange(cursor, cursor);
    });
  }, []);

  const renderedMessages = useMemo(() => {
    if (!messages.length) return null;
    return messages.map((msg) => (
      <div key={msg.id} className="rounded-2xl border border-black/5 bg-white/70 p-3 shadow-sm dark:border-white/10 dark:bg-white/5">
        <div className="flex items-center justify-between text-xs font-semibold text-gray-500 dark:text-white/50">
          <span>{msg.author || "Guest user"}</span>
          <span>{formatRelativeTime(msg.timestamp)}</span>
        </div>
        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{msg.body}</p>
      </div>
    ));
  }, [messages]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const input = inputRef.current;
    if (!input) return;
    const value = input.value.trim();
    if (!value) return;
    onSubmit?.(value);
    input.value = "";
    setEmojiOpen(false);
  };

  return (
    <div className="pointer-events-auto">
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        className="group relative inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-black/10 bg-white/90 shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-white/10 dark:bg-gray-900/90 dark:backdrop-blur"
        style={{ WebkitBackdropFilter: "blur(12px)", backdropFilter: "blur(12px)" }}
        aria-label={open ? "Close chat" : "Open chat"}
      >
        <span
          ref={iconRef}
          className="grid h-8 w-8 place-items-center text-indigo-600 transition group-hover:text-indigo-500 dark:text-indigo-300"
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden>
            <path d="M4 4h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-4.586a1 1 0 0 0-.707.293L11.414 20H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" />
          </svg>
        </span>
        {open ? (
          <span className="absolute -top-2 -right-2 inline-flex items-center justify-center rounded-full bg-emerald-500 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white shadow">
            Live
          </span>
        ) : unreadCount > 0 ? (
          <span className="absolute -top-2 -right-2 inline-flex min-h-[20px] min-w-[20px] items-center justify-center rounded-full bg-indigo-600 px-2 py-0.5 text-[11px] font-bold text-white shadow">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open && (
        <div
          ref={panelRef}
          className="absolute bottom-16 left-0 w-[min(320px,80vw)] origin-bottom-left overflow-hidden rounded-3xl border border-black/10 bg-white/95 shadow-2xl backdrop-blur dark:border-white/10 dark:bg-gray-900/95"
          style={{ WebkitBackdropFilter: "blur(16px)", backdropFilter: "blur(16px)" }}
        >
          <div className="flex items-center justify-between border-b border-black/5 px-4 py-3 dark:border-white/10">
            <div>
              <p className="text-sm font-bold text-gray-900 dark:text-white">Session chat</p>
              <p className="text-xs text-gray-500 dark:text-white/60">Visible to everyone in the room</p>
            </div>
            <button
              type="button"
              onClick={close}
              className="inline-grid h-8 w-8 place-items-center rounded-lg border border-black/10 text-gray-600 transition hover:bg-black/5 dark:border-white/10 dark:text-white dark:hover:bg-white/10"
              aria-label="Close chat"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="max-h-64 overflow-y-auto px-4 py-3 text-sm text-gray-800 dark:text-white">
            {renderedMessages ? (
              <div className="space-y-3">{renderedMessages}</div>
            ) : (
              <div className="rounded-2xl border border-dashed border-black/10 bg-white/60 px-4 py-6 text-center text-sm text-gray-500 dark:border-white/10 dark:bg-white/5 dark:text-white/60">
                No messages yet. Say hi to everyone!
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="border-t border-black/5 px-3 py-3 dark:border-white/10">
            <div className="relative flex items-center gap-2 rounded-2xl border border-black/10 bg-white/90 px-2 py-2 dark:border-white/10 dark:bg-white/10">
              <button
                ref={emojiButtonRef}
                type="button"
                onClick={() => setEmojiOpen((v) => !v)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-lg transition hover:bg-black/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:hover:bg-white/5"
                aria-label="Insert emoji"
              >
                ☺︎
              </button>
              <input
                ref={inputRef}
                type="text"
                name="chat_message"
                placeholder="Send a message to everyone"
                className="flex-1 border-0 bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none dark:text-white dark:placeholder:text-white/50"
              />
              <button
                type="submit"
                className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white transition hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m22 2-7 20-4-9-9-4Z" />
                  <path d="M22 2 11 13" />
                </svg>
              </button>

              {emojiOpen && (
                <div
                  ref={emojiPanelRef}
                  className="absolute bottom-14 left-0 z-10 w-48 rounded-2xl border border-black/10 bg-white/95 p-2 shadow-xl backdrop-blur dark:border-white/10 dark:bg-gray-900/95"
                  style={{ WebkitBackdropFilter: "blur(12px)", backdropFilter: "blur(12px)" }}
                >
                  <div className="grid grid-cols-6 gap-1 text-xl">
                    {['😀','😁','😂','🤣','😊','😍','🤔','🤩','😎','😴','👍','🙌','🔥','🚀','💡','🎯','✅','❤️'].map((emo) => (
                      <button
                        key={emo}
                        type="button"
                        onClick={() => {
                          appendEmoji(emo);
                          setEmojiOpen(false);
                        }}
                        className="grid h-8 w-8 place-items-center rounded-lg transition hover:bg-black/10 dark:hover:bg-white/10"
                        aria-label={`Insert ${emo}`}
                      >
                        {emo}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
