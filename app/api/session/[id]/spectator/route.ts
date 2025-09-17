import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/primsa";
import { pusherServer } from "../../../../../lib/pusher-server";

// In-memory spectator registry per session (best-effort for refresh sync)
// Note: This resets on server restarts and may not be shared across instances.
// It complements Pusher broadcasts for robust UX without DB schema changes.
declare global {
  var __spz_spec_store: Map<string, Set<string>> | undefined;
}
const spectatorStore: Map<string, Set<string>> = global.__spz_spec_store || new Map<string, Set<string>>();
global.__spz_spec_store = spectatorStore;

export const runtime = "nodejs";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  try {
    const set = spectatorStore.get(id);
    const list = set ? Array.from(set) : [];
    return NextResponse.json({ spectators: list });
  } catch {
    return NextResponse.json({ spectators: [] });
  }
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  try {
    const { userId, spectator } = (await req.json().catch(() => ({}))) as { userId?: string; spectator?: boolean };
    if (!userId || typeof spectator !== 'boolean') return NextResponse.json({ error: "bad request" }, { status: 400 });

    // Validate user belongs to session
    const exists = await prisma.session.findFirst({ where: { id, users: { some: { id: userId } } }, select: { id: true } });
    if (!exists) return NextResponse.json({ error: "forbidden" }, { status: 403 });

    // Update in-memory store
    const set = spectatorStore.get(id) || new Set<string>();
    if (spectator) set.add(userId); else set.delete(userId);
    spectatorStore.set(id, set);

    await pusherServer.trigger(`presence-session-${id}`, 'spectator', { userId, spectator });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('spectator broadcast failed', e);
    return NextResponse.json({ error: 'server error' }, { status: 500 });
  }
}
