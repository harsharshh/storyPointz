import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/primsa';
import { pusherServer } from "../../../lib/pusher-server";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';


export async function GET(req: Request) {
  try {
    const userId = req.headers.get('x-spz-user-id');
    if (!userId) return NextResponse.json({ error: 'Missing x-spz-user-id' }, { status: 400 });
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, email: true } });
    if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ user });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('user GET failed:', message);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const userId = req.headers.get('x-spz-user-id');
    if (!userId) return NextResponse.json({ error: 'Missing x-spz-user-id' }, { status: 400 });
    const { name } = await req.json();
    const nextName = String(name ?? '').trim();
    if (!nextName) return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    const user = await prisma.user.update({ where: { id: userId }, data: { name: nextName }, select: { id: true, name: true } });
    try {
      if (pusherServer) {
        // Find all sessions where this user participates
        const sessions = await prisma.session.findMany({
          where: { users: { some: { id: userId } } },
          select: { id: true },
        });
        // Broadcast name change to each session presence channel
        await Promise.all(
          sessions.map((s) =>
            pusherServer.trigger(`presence-session-${s.id}`, 'user:name', {
              userId,
              name: nextName,
            })
          )
        );
        // Also broadcast on a user-scoped public channel so header/chips update globally
        // Broadcast vote (no persistence yet)
        await pusherServer.trigger(`public-user-${userId}`, "vote-cast", { 
          userId, 
          name: nextName,
         });
        return NextResponse.json({ ok: true });
      }
    } catch (err) {
      console.error('pusher broadcast failed', err);
    }
    return NextResponse.json({ user });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('user PATCH failed:', message);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}