import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/primsa";
import { pusherServer } from "../../../../../lib/pusher-server";

export const runtime = "nodejs";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  try {
    const { userId, value } = (await req.json().catch(() => ({}))) as { userId?: string; value?: string };
    if (!userId || typeof value !== "string") {
      return NextResponse.json({ error: "bad request" }, { status: 400 });
    }
    // Validate that user belongs to the session
    const exists = await prisma.session.findFirst({
      where: { id, users: { some: { id: userId } } },
      select: { id: true },
    });
    if (!exists) return NextResponse.json({ error: "forbidden" }, { status: 403 });

    // Broadcast vote (no persistence yet)
    await pusherServer.trigger(`presence-session-${id}`, "vote-cast", { userId, value });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("vote failed", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}

