"use client";

import React from "react";
import { createPortal } from "react-dom";

// Planning poker numeric options for setting story points quickly
const NUMERIC_OPTIONS = [0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89] as const;

type Story = { id: string; key: string; title: string; avg?: number | null };
type StoryAvgDetail = { sessionId: string; storyId: string; avg?: number | null };
type ActiveStoryEventDetail = { sessionId: string; storyId: string; origin?: 'drawer' | 'auto' | 'sync' };

// Helper: map any average to the immediate higher (ceiling) option in NUMERIC_OPTIONS
const ceilOptionFor = (avg?: number | null) => {
  if (typeof avg !== 'number' || Number.isNaN(avg)) return null;
  for (const n of NUMERIC_OPTIONS) {
    if (avg <= n) return n;
  }
  return NUMERIC_OPTIONS[NUMERIC_OPTIONS.length - 1];
};

type StoriesDrawerProps = {
  open: boolean;
  onClose: () => void;
  sessionId?: string;
};

export default function StoriesDrawer({ open, onClose, sessionId }: StoriesDrawerProps) {
  const [stories, setStories] = React.useState<Story[]>([]);
  React.useEffect(() => {
    if (!open || !sessionId) return;
    (async () => {
      try {
        const res = await fetch(`/api/session/${encodeURIComponent(sessionId)}/stories`, { cache: 'no-store' });
        if (!res.ok) throw new Error('failed');
        const data = await res.json();
        setStories((data.stories || []) as Story[]);
      } catch {
        setStories([]);
      }
    })();
  }, [open, sessionId]);

  return (
    <aside
      className={[
        'fixed right-0 top-0 z-[61] h-full w-[92vw] max-w-md overflow-y-auto border-l border-black/10 p-4 shadow-2xl transition-transform duration-300',
        'bg-gradient-to-br from-indigo-100 via-emerald-50 to-white dark:border-white/10',
        'dark:bg-[radial-gradient(60%_40%_at_50%_0%,rgba(109,93,246,0.35),transparent_70%),radial-gradient(40%_40%_at_100%_60%,rgba(34,197,94,0.25),transparent_70%),linear-gradient(to_bottom,#0B0B10,rgba(11,11,16,0.85))]',
        open ? 'translate-x-0' : 'translate-x-full'
      ].join(' ')}
      aria-hidden={!open}
    >
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-xl font-extrabold text-gray-900 dark:text-white">Stories</h3>
          <p className="text-xs text-gray-500 dark:text-white/60">1 Story</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="cursor-pointer inline-grid h-9 w-9 place-items-center rounded-lg border border-black/10 text-gray-700 dark:border-white/10 dark:text-white" aria-label="Close" onClick={onClose}>
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>
      </div>

      {/* Stories list */}
      <StoriesList sessionId={sessionId} initial={stories} />
    </aside>
  );
}

// very small in-memory cache for session stories
const storiesCache = new Map<string, Story[]>();

function StoriesList({ sessionId, initial }: { sessionId?: string; initial: Story[] }) {
  const [stories, setStories] = React.useState(initial);
  const [adding, setAdding] = React.useState(false);
  const [draft, setDraft] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [userSelectedActive, setUserSelectedActive] = React.useState(false);
  const [awaitingResult, setAwaitingResult] = React.useState(false);
  const previousSessionRef = React.useRef<string | undefined>(undefined);

  React.useEffect(() => {
    if (typeof window === 'undefined') {
      previousSessionRef.current = sessionId || undefined;
      return;
    }
    const prev = previousSessionRef.current;
    if (prev && prev !== sessionId) {
      storiesCache.delete(prev);
      try { localStorage.removeItem(`spz_active_story_${prev}`); } catch {}
    }
    previousSessionRef.current = sessionId || undefined;
  }, [sessionId]);
  React.useEffect(() => {
    setStories(initial);
  }, [initial, sessionId]);

  

  // seed from cache instantly, then fetch fresh
  React.useEffect(() => {
    if (!sessionId) {
      setStories(initial);
      return;
    }
    const cached = storiesCache.get(sessionId);
    if (cached && cached.length) setStories(cached);
    // show loader while refreshing
    setLoading(true);
    (async () => {
      try {
        const res = await fetch(`/api/session/${encodeURIComponent(sessionId)}/stories`, { cache: 'no-store' });
        const data = await res.json();
        const next = (data.stories || []) as Story[];
        setStories(next);
        storiesCache.set(sessionId, next);
      } catch {}
      finally { setLoading(false); }
    })();
  }, [sessionId, initial]);

  // initialize active story when drawer opens
  React.useEffect(() => {
    if (!sessionId) return;
    const key = `spz_active_story_${sessionId}`;
    const stored = typeof window !== 'undefined' ? localStorage.getItem(key) : null;
    const activeExists = activeId ? stories.some(story => story.id === activeId) : false;

    if (stories.length === 1) {
      const loneStory = stories[0];
      if (!activeExists || activeId !== loneStory.id) {
        setActiveId(loneStory.id);
        try { localStorage.setItem(key, loneStory.id); } catch {}
      window.dispatchEvent(new CustomEvent<ActiveStoryEventDetail>('spz:active-story', { detail: { sessionId, storyId: loneStory.id, origin: 'auto' } }));
      }
      setUserSelectedActive(false);
      setAwaitingResult(typeof loneStory.avg === 'number' ? false : true);
      return;
    }

    if (stories.length === 0) {
      if (activeId !== null) setActiveId(null);
      if (stored) {
        try { localStorage.removeItem(key); } catch {}
      }
      if (userSelectedActive) setUserSelectedActive(false);
      if (awaitingResult) setAwaitingResult(false);
      return;
    }

    // Multiple stories: require explicit user choice unless already selected
    if (!userSelectedActive) {
      if (activeId !== null) setActiveId(null);
      if (stored) {
        try { localStorage.removeItem(key); } catch {}
      }
      if (awaitingResult) setAwaitingResult(false);
      return;
    }

    if (!activeExists) {
      if (activeId !== null) setActiveId(null);
      if (stored) {
        try { localStorage.removeItem(key); } catch {}
      }
      setUserSelectedActive(false);
      if (awaitingResult) setAwaitingResult(false);
    }
  }, [sessionId, stories, activeId, userSelectedActive, awaitingResult]);

  // Listen for story average update events to update avg on the fly
  React.useEffect(() => {
    if (!sessionId) return;
    const onStoryAvg: EventListener = (event) => {
      const detail = (event as CustomEvent<StoryAvgDetail>).detail;
      if (!detail || detail.sessionId !== sessionId) return;
      const { storyId, avg } = detail;
      if (!storyId) return;
      setStories(prev => {
        const next = prev.map(s => s.id === storyId ? { ...s, avg: (typeof avg === 'number' ? avg : null) } : s);
        // keep tiny cache in sync so closing/reopening drawer reflects immediately
        try { storiesCache.set(sessionId, next); } catch {}
        return next;
      });
      if (storyId === activeId && typeof avg === 'number') {
        setAwaitingResult(false);
      }
    };
    window.addEventListener('spz:story-avg', onStoryAvg);
    return () => window.removeEventListener('spz:story-avg', onStoryAvg);
  }, [sessionId, activeId]);

  function selectActive(id: string){
    if (!sessionId) return;
    setActiveId(id);
    setUserSelectedActive(true);
    setAwaitingResult(true);
    const key = `spz_active_story_${sessionId}`;
    try { localStorage.setItem(key, id); } catch {}
    window.dispatchEvent(new CustomEvent<ActiveStoryEventDetail>('spz:active-story', { detail: { sessionId, storyId: id, origin: 'drawer' } }));
  }

  return (
    <div className="space-y-3">
      {stories.length === 0 ? (
        <div className="text-sm text-gray-600 dark:text-white/70">No stories yet.</div>
      ) : (
        stories.map((s) => (
          <StoryCard
            key={s.id}
            story={s}
            sessionId={sessionId}
            onUpdated={(updatedStory) => {
              setStories((prev) => {
                const next = prev.map(p => p.id === updatedStory.id ? updatedStory : p);
                if (sessionId) {
                  try { storiesCache.set(sessionId, next); } catch {}
                }
                return next;
              });
              if (updatedStory.id === activeId && typeof updatedStory.avg === 'number') {
                setAwaitingResult(false);
              }
            }}
            onDeleted={(id) => {
              let removedStory: Story | undefined;
              let removedIndex = -1;
              setStories((prev)=> {
                const nextList: Story[] = [];
                prev.forEach((p, idx) => {
                  if (p.id === id) {
                    removedStory = p;
                    removedIndex = idx;
                  } else {
                    nextList.push(p);
                  }
                });
                if (sessionId) {
                  try { storiesCache.set(sessionId, nextList); } catch {}
                }
                return nextList;
              });
              const wasActive = id === activeId;
              const prevUserSelected = userSelectedActive;
              const prevAwaiting = awaitingResult;
              if (wasActive) {
                setActiveId(null);
                setUserSelectedActive(false);
                setAwaitingResult(false);
                if (sessionId) {
                  const key = `spz_active_story_${sessionId}`;
                  try { localStorage.removeItem(key); } catch {}
                }
              }

              return () => {
                if (!removedStory) return;
                setStories((prev) => {
                  const restored = [...prev];
                  if (removedIndex < 0 || removedIndex > restored.length) {
                    restored.push(removedStory!);
                  } else {
                    restored.splice(removedIndex, 0, removedStory!);
                  }
                  if (sessionId) {
                    try { storiesCache.set(sessionId, restored); } catch {}
                  }
                  return restored;
                });
                if (wasActive) {
                  setActiveId(removedStory.id);
                  setUserSelectedActive(prevUserSelected);
                  setAwaitingResult(prevAwaiting);
                  if (sessionId) {
                    try { localStorage.setItem(`spz_active_story_${sessionId}`, removedStory.id); } catch {}
                  }
                }
              };
            }}
            isActive={activeId === s.id}
            awaitingResult={awaitingResult && activeId === s.id}
            onSelectActive={() => selectActive(s.id)}
          />
        ))
      )}
      {loading && (
        <div className="rounded-2xl border border-black/10 bg-gray-100 p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
          <div className="h-4 w-24 animate-pulse rounded bg-gray-300/80 dark:bg-white/10" />
          <div className="mt-3 h-3 w-40 animate-pulse rounded bg-gray-300/70 dark:bg-white/10" />
          <div className="mt-4 h-9 w-32 animate-pulse rounded-xl bg-gray-300/80 dark:bg-white/10" />
        </div>
      )}
      {!adding ? (
        <button onClick={() => setAdding(true)} className="cursor-pointer mt-2 inline-flex w-full items-center justify-start gap-2 rounded-2xl border border-black/10 bg-white/70 px-4 py-3 text-sm font-semibold text-gray-900 backdrop-blur hover:bg-white/90 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-gray-900">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
          Add another story
        </button>
      ) : (
        <div className="mt-2 space-y-3 rounded-2xl border border-black/10 bg-white/80 p-3 backdrop-blur dark:border-white/10 dark:bg-white/10">
          <textarea
            autoFocus
            rows={3}
            placeholder="Enter a title for the issue"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="w-full resize-none rounded-xl border border-black/10 bg-gray-100 px-3 py-2 text-sm text-gray-900 outline-none ring-0 placeholder:text-gray-400 dark:border-white/10 dark:bg-white/5 dark:text-white"
          />
          <div className="flex items-center justify-end gap-2">
            <button onClick={() => { setAdding(false); setDraft(''); }} className="rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-bold text-indigo-600 hover:bg-white/90 dark:border-white/10 dark:bg-white/10 dark:text-indigo-400">Cancel</button>
            <button
              onClick={async () => {
                if (!sessionId) return;
                const title = draft.trim() || 'Untitled';
                try {
                  setSaving(true);
                  const res = await fetch(`/api/session/${encodeURIComponent(sessionId)}/stories`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title }),
                  });
                  if (res.ok) {
                    const data = await res.json();
                    setStories((prev) => {
                      const nextStory = data.story as Story;
                      const nextList = [...prev, nextStory];
                      if (sessionId) storiesCache.set(sessionId, nextList);
                      return nextList;
                    });
                    setAdding(false); setDraft('');
                  }
                } catch {}
                finally { setSaving(false); }
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-sm font-extrabold text-white transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60 dark:bg-indigo-500"
              disabled={saving}
            >
              {saving && (
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
              )}
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

type StoryCardProps = {
  story: Story;
  sessionId?: string;
  onUpdated: (story: Story) => void;
  onDeleted: (id: string) => (() => void) | void;
  isActive?: boolean;
  awaitingResult?: boolean;
  onSelectActive?: () => void;
};

function StoryCard({ story, sessionId, onUpdated, onDeleted, isActive, awaitingResult = false, onSelectActive }: StoryCardProps) {
  const [menu, setMenu] = React.useState(false);
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(story.title);
  const [saving, setSaving] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [avgOpen, setAvgOpen] = React.useState(false);
  const popRef = React.useRef<HTMLDivElement | null>(null);
  const btnRef = React.useRef<HTMLButtonElement | null>(null);
  const [popPos, setPopPos] = React.useState<{top:number; left:number; width:number}>({top:0,left:0,width:224});
  const selectedOpt = ceilOptionFor(story.avg ?? null);
  const hasPoints = typeof story.avg === 'number';
  const isAwaiting = Boolean(isActive && awaitingResult);

  const handleSelectActive = () => {
    if (!onSelectActive) return;
    onSelectActive();
  };

  const buttonLabel = (() => {
    if (isAwaiting) {
      return 'Voting now...';
    }
    if (isActive) {
      return hasPoints ? 'Vote again' : 'Voting now...';
    }
    return hasPoints ? 'Vote again' : 'Vote this story';
  })();

  const disableVotingButton = isAwaiting;

  React.useEffect(() => {
    if (!avgOpen) return;
    function onDocClick(e: MouseEvent) {
      const t = e.target as Node | null;
      if (popRef.current && !popRef.current.contains(t) && btnRef.current && !btnRef.current.contains(t)) {
        setAvgOpen(false);
      }
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setAvgOpen(false);
    }
    function place() {
      if (!btnRef.current) return;
      const r = btnRef.current.getBoundingClientRect();
      const width = 224; // w-56
      const gap = 8;
      const left = Math.max(8, Math.min(window.innerWidth - width - 8, r.right - width));
      const top = Math.min(window.innerHeight - 8, r.bottom + gap);
      setPopPos({ top, left, width });
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onEsc);
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, [avgOpen]);

  async function setPoints(newAvg: number){
    if (!sessionId) return;
    try {
      // Optimistic UI update
      onUpdated({ ...story, avg: newAvg });
      const res = await fetch(`/api/session/${encodeURIComponent(sessionId)}/stories`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storyId: story.id, avg: newAvg }),
      });
      if (res.ok) {
        const data = await res.json();
        onUpdated((data.story as Story) ?? { ...story, avg: newAvg });
      }
    } finally {
      setAvgOpen(false);
    }
  }

  return (
    <div className="relative z-10 rounded-2xl border border-black/10 bg-white/70 p-4 text-gray-900 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-gray-900 hover:bg-white/60">
      <div className="mb-2 flex items-center justify-between text-sm font-semibold opacity-80">
        <span className="text-gray-700 dark:text-white/80">{story.key}</span>
        <div className="relative">
          <button onClick={()=> setMenu((v)=>!v)} className="cursor-pointer inline-grid h-8 w-8 place-items-center rounded-lg border border-black/10 text-gray-700 hover:bg-black/5 dark:border-white/10 dark:text-white/80 dark:hover:bg-white/10" title="Menu">•••</button>
          {menu && (
            <div className="absolute right-0 z-10 mt-1 w-44 overflow-hidden rounded-xl border border-black/10 bg-white shadow-lg dark:border-white/10 dark:bg-[#111217]">
              <button onClick={()=> { setEditing(true); setMenu(false); }} className="block w-full px-3 py-2 text-left text-sm text-gray-800 hover:bg-black/5 dark:text-white/90 dark:hover:bg-white/10">Edit story</button>
              <button
                onClick={async () => {
                  if (!sessionId || deleting) return;
                  setDeleting(true);
                  let rollback: (() => void) | void;
                  try {
                    rollback = onDeleted(story.id);
                    const res = await fetch(`/api/session/${encodeURIComponent(sessionId)}/stories`, {
                      method: 'DELETE',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ storyId: story.id }),
                    });
                    if (!res.ok) {
                      if (res.status === 404) {
                        rollback = undefined;
                        return;
                      }
                      throw new Error('delete failed');
                    }
                  } catch {
                    rollback?.();
                  } finally {
                    setDeleting(false);
                    setMenu(false);
                  }
                }}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-white/10"
              >
                <span>Delete story</span>
                {deleting && <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" /></svg>}
              </button>
            </div>
          )}
        </div>
      </div>

      {!editing ? (
        <>
          <div className="mb-3 text-sm">{story.title}</div>
          <div className="flex items-center justify-between">
            <button
              onClick={disableVotingButton ? undefined : handleSelectActive}
              disabled={disableVotingButton}
              className={[
                'cursor-pointer rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-indigo-500',
                disableVotingButton ? 'pointer-events-none' : 'hover:opacity-90',
              ].join(' ')}
            >
              {buttonLabel}
            </button>
            <div className="flex items-center gap-2">
              {/* points quick-set popover trigger */}
              <div className="relative">
                {typeof story.avg === 'number' ? (
                  <button
                    ref={btnRef}
                    onClick={() => setAvgOpen(v => !v)}
                    className="cursor-pointer inline-grid h-12 w-14 place-items-center rounded-lg border border-black/10 text-gray-700 hover:bg-black/5 dark:border-white/10 dark:text-white/80 dark:hover:bg-white/10"
                    title="Set points"
                  >
                    {selectedOpt ?? '-'}
                  </button>
                ) : (
                  <button
                    ref={btnRef}
                    onClick={() => setAvgOpen(v => !v)}
                    className="cursor-pointer inline-grid h-12 w-14 place-items-center rounded-lg border border-black/10 text-gray-700 hover:bg-black/5 dark:border-white/10 dark:text-white/80 dark:hover:bg-white/10"
                    title="Set points"
                  >
                    {selectedOpt ?? '-'}
                  </button>
                )}
                {avgOpen && typeof window !== 'undefined' && createPortal(
                  <div
                    ref={popRef}
                    className="fixed z-[9999] w-56 rounded-xl border border-black/10 bg-white p-2 shadow-2xl backdrop-blur supports-[backdrop-filter]:bg-white/80 dark:border-white/10 dark:bg-[#111217]"
                    style={{ top: popPos.top, left: popPos.left }}
                  >
                    <div className="mb-1 px-1 text-xs font-semibold text-gray-500 dark:text-white/60">Set points</div>
                    <div className="grid grid-cols-5 gap-2">
                      {NUMERIC_OPTIONS.map((n) => {
                        const active = selectedOpt === n;
                        return (
                          <button
                            key={`avg_${n}`}
                            onClick={() => setPoints(n)}
                            className={[
                              "cursor-pointer h-9 rounded-lg border text-sm font-semibold transition",
                              active
                                ? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300"
                                : "border-black/10 hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10 text-gray-800 dark:text-white/80",
                            ].join(' ')}
                          >
                            {n}
                          </button>
                        );
                      })}
                    </div>
                  </div>,
                  document.body
                )}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="space-y-3">
          <textarea
            autoFocus
            rows={3}
            value={draft}
            onChange={(e)=> setDraft(e.target.value)}
            className="w-full resize-none rounded-xl border border-black/10 bg-gray-100 px-3 py-2 text-sm text-gray-900 outline-none ring-0 placeholder:text-gray-400 dark:border-white/10 dark:bg-white/5 dark:text-white"
          />
          <div className="flex items-center justify-end gap-2">
            <button onClick={()=> { setEditing(false); setDraft(story.title); }} className="cursor-pointer rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-bold text-indigo-600 hover:bg-white/90 dark:border-white/10 dark:bg-white/10 dark:text-indigo-400">Cancel</button>
            <button
              onClick={async ()=> {
                if (!sessionId) return;
                try {
                  setSaving(true);
                  const res = await fetch(`/api/session/${encodeURIComponent(sessionId)}/stories`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ storyId: story.id, title: draft.trim() || 'Untitled' }),
                  });
                  if (res.ok){
                    const data = await res.json();
                    onUpdated(data.story as Story);
                    setEditing(false);
                  }
                } finally { setSaving(false); }
              }}
              disabled={saving}
              className="cursor-pointer inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-sm font-extrabold text-white transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60 dark:bg-indigo-500"
            >
              {saving && (<svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" /></svg>)}
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
