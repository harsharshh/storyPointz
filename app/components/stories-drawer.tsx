"use client";

import React from "react";

type StoriesDrawerProps = {
  open: boolean;
  onClose: () => void;
  sessionId?: string;
};

export default function StoriesDrawer({ open, onClose, sessionId }: StoriesDrawerProps) {
  const [stories, setStories] = React.useState<Array<{ id: string; key: string; title: string }>>([]);
  React.useEffect(() => {
    if (!open || !sessionId) return;
    (async () => {
      try {
        const res = await fetch(`/api/session/${encodeURIComponent(sessionId)}/stories`, { cache: 'no-store' });
        if (!res.ok) throw new Error('failed');
        const data = await res.json();
        setStories(data.stories || []);
      } catch {
        setStories([]);
      }
    })();
  }, [open, sessionId]);
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70]">
      
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <aside className="absolute right-0 top-0 z-[71] h-full w-[92vw] max-w-md overflow-y-auto border-l border-black/10 bg-gradient-to-br from-indigo-100 via-emerald-50 to-white p-4 shadow-2xl dark:border-white/10 
      dark:bg-[radial-gradient(60%_40%_at_50%_0%,rgba(109,93,246,0.35),transparent_70%),radial-gradient(40%_40%_at_100%_60%,rgba(34,197,94,0.25),transparent_70%),linear-gradient(to_bottom,#0B0B10,rgba(11,11,16,0.85))]">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-extrabold text-gray-900 dark:text-white">Stories</h3>
            <p className="text-xs text-gray-500 dark:text-white/60">1 Story</p>
          </div>
          <div className="flex items-center gap-2">
            
            <button className="cursor-pointer  inline-grid h-9 w-9 place-items-center rounded-lg border border-black/10 text-gray-700 dark:border-white/10 dark:text-white" aria-label="Close" onClick={onClose}>
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>
        </div>

        {/* Stories list */}
        <StoriesList sessionId={sessionId} initial={stories} />
      </aside>
    </div>
  );
}

// very small in-memory cache for session stories
const storiesCache = new Map<string, Array<{ id: string; key: string; title: string; avg?: number | null }>>();

function StoriesList({ sessionId, initial }: { sessionId?: string; initial: Array<{ id: string; key: string; title: string; avg?: number|null }>}){
  const [stories, setStories] = React.useState(initial);
  const [adding, setAdding] = React.useState(false);
  const [draft, setDraft] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [activeId, setActiveId] = React.useState<string | null>(null);

  // seed from cache instantly, then fetch fresh
  React.useEffect(() => {
    if (!sessionId) return;
    const cached = storiesCache.get(sessionId);
    if (cached && cached.length) setStories(cached);
    // show loader while refreshing
    setLoading(true);
    (async () => {
      try {
        const res = await fetch(`/api/session/${encodeURIComponent(sessionId)}/stories`, { cache: 'no-store' });
        const data = await res.json();
        const next = data.stories || [];
        setStories(next);
        storiesCache.set(sessionId, next);
      } catch {}
      finally { setLoading(false); }
    })();
  }, [sessionId]);

  // initialize active story from localStorage or single-story auto activate
  React.useEffect(() => {
    if (!sessionId) return;
    const key = `spz_active_story_${sessionId}`;
    const stored = typeof window !== 'undefined' ? localStorage.getItem(key) : null;
    if (stored) {
      setActiveId(stored);
    } else if (stories.length === 1) {
      setActiveId(stories[0].id);
      try { localStorage.setItem(key, stories[0].id); } catch {}
      window.dispatchEvent(new CustomEvent('spz:active-story', { detail: { sessionId, storyId: stories[0].id } }));
    }
  }, [sessionId, stories]);

  function selectActive(id: string){
    if (!sessionId) return;
    setActiveId(id);
    const key = `spz_active_story_${sessionId}`;
    try { localStorage.setItem(key, id); } catch {}
    window.dispatchEvent(new CustomEvent('spz:active-story', { detail: { sessionId, storyId: id } }));
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
            onUpdated={(ns) => setStories((prev)=> prev.map(p=> p.id===ns.id? ns : p))}
            onDeleted={(id) => setStories((prev)=> prev.filter(p=> p.id !== id))}
            isActive={activeId === s.id}
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
        <button onClick={() => setAdding(true)} className="cursor-pointer mt-2 inline-flex w-full items-center justify-start gap-2 rounded-2xl border border-black/10 bg-white/70 px-4 py-3 text-sm font-semibold text-gray-900 backdrop-blur hover:bg-white/90 dark:border-white/10 dark:bg-white/10 dark:text-white ">
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
                    setStories((prev) => [...prev, data.story]);
                    if (sessionId) storiesCache.set(sessionId, [...stories, data.story]);
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

function StoryCard({ story, sessionId, onUpdated, onDeleted, isActive, onSelectActive }:{ story:{ id:string; key:string; title:string, avg?: number }, sessionId?: string, onUpdated:(s:{id:string;key:string;title:string})=>void, onDeleted:(id:string)=>void, isActive?: boolean, onSelectActive?: ()=>void}){
  const [menu, setMenu] = React.useState(false);
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(story.title);
  const [saving, setSaving] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  return (
    <div className="rounded-2xl border border-black/10 bg-white/70 p-4 text-gray-900 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5 dark:text-white">
      <div className="mb-2 flex items-center justify-between text-sm font-semibold opacity-80">
        <span className="text-gray-700 dark:text-white/80">{story.key}</span>
        <div className="relative">
          <button onClick={()=> setMenu((v)=>!v)} className="cursor-pointer inline-grid h-8 w-8 place-items-center rounded-lg border border-black/10 text-gray-700 hover:bg-black/5 dark:border-white/10 dark:text-white/80 dark:hover:bg-white/10" title="Menu">•••</button>
          {menu && (
            <div className="absolute right-0 z-10 mt-1 w-44 overflow-hidden rounded-xl border border-black/10 bg-white shadow-lg dark:border-white/10 dark:bg-[#111217]">
              <button onClick={()=> { setEditing(true); setMenu(false); }} className="block w-full px-3 py-2 text-left text-sm text-gray-800 hover:bg-black/5 dark:text-white/90 dark:hover:bg-white/10">Edit story</button>
              <button
                onClick={async ()=> {
                  if (!sessionId || deleting) return;
                  setDeleting(true);
                  try {
                    const res = await fetch(`/api/session/${encodeURIComponent(sessionId)}/stories`, {
                      method: 'DELETE',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ storyId: story.id }),
                    });
                    if (res.ok){ onDeleted(story.id); }
                  } finally { setDeleting(false); setMenu(false); }
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
            {isActive ? (
              <button className="cursor-pointer rounded-xl bg-indigo-600 px-4 py-2 text-sm font-extrabold text-white shadow-sm ring-1 ring-indigo-500/30 dark:bg-indigo-500">{typeof story.avg === 'number' ? 'Vote done' : 'Voting now...'}</button>
            ) : (
              <button onClick={onSelectActive} className="cursor-pointer rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-indigo-500">
                {typeof story.avg === 'number' ? 'Vote again' : 'Vote this story'}
              </button>
            )}
            <div className="flex items-center gap-2">
              {typeof story.avg === 'number' && (
                <button className="cursor-pointer inline-grid h-8 w-8 place-items-center rounded-lg border border-black/10 text-gray-700 hover:bg-black/5 dark:border-white/10 dark:text-white/80 dark:hover:bg-white/10">{story.avg || '-'}</button>
              )}
              
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
                    onUpdated(data.story);
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
