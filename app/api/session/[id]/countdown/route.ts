import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/primsa";
import { pusherServer } from "../../../../../lib/pusher-server";

export const runtime = "nodejs";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  try {
    const { userId } = (await req.json().catch(() => ({}))) as { userId?: string };
    if (!userId) return NextResponse.json({ error: "bad request" }, { status: 400 });

    // Validate membership in session for security
    const exists = await prisma.session.findFirst({
      where: { id, users: { some: { id: userId } } },
      select: { id: true },
    });
    if (!exists) return NextResponse.json({ error: "forbidden" }, { status: 403 });

    // Broadcast a standard server event for reliability
    await pusherServer.trigger(`presence-session-${id}`, "countdown", { by: userId });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("countdown broadcast failed", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}

