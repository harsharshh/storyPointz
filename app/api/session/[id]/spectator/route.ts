import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/primsa";
import { pusherServer } from "../../../../../lib/pusher-server";

export const runtime = "nodejs";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  try {
    const { userId, spectator } = (await req.json().catch(() => ({}))) as { userId?: string; spectator?: boolean };
    if (!userId || typeof spectator !== 'boolean') return NextResponse.json({ error: "bad request" }, { status: 400 });

    // Validate user belongs to session
    const exists = await prisma.session.findFirst({ where: { id, users: { some: { id: userId } } }, select: { id: true } });
    if (!exists) return NextResponse.json({ error: "forbidden" }, { status: 403 });

    await pusherServer.trigger(`presence-session-${id}`, 'spectator', { userId, spectator });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('spectator broadcast failed', e);
    return NextResponse.json({ error: 'server error' }, { status: 500 });
  }
}

