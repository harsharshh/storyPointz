"use client";

export default function RoomShell({ sessionId, sessionName, user }) {
  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{sessionName}</h1>
        <div className="text-sm text-gray-500 dark:text-white/60">Session ID: {sessionId}</div>
      </header>
      <section className="grid gap-6 md:grid-cols-3">
        <div className="rounded-2xl border border-black/10 bg-white/90 p-4 dark:border-white/10 dark:bg-white/5">
          <h2 className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">Stories</h2>
          <p className="text-sm text-gray-600 dark:text-white/60">(Coming soon)</p>
        </div>
        <div className="rounded-2xl border border-black/10 bg-white/90 p-4 md:col-span-2 dark:border-white/10 dark:bg-white/5">
          <h2 className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">Voting</h2>
          <p className="text-sm text-gray-600 dark:text-white/60">Welcome, {user?.name}</p>
        </div>
      </section>
    </div>
  );
}

