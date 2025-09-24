import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/primsa";
import { pusherServer } from "../../../../../lib/pusher-server";

export const runtime = "nodejs";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  try {
    const { userId, storyId, roundActive } = (await req.json().catch(() => ({}))) as {
      userId?: string;
      storyId?: string | null;
      roundActive?: boolean;
    };

    if (!userId) {
      return NextResponse.json({ error: "bad request" }, { status: 400 });
    }

    const exists = await prisma.session.findFirst({
      where: { id, users: { some: { id: userId } } },
      select: { id: true },
    });
    if (!exists) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const normalizedStoryId = typeof storyId === "string" && storyId.trim() ? storyId : null;
    const payload = {
      storyId: normalizedStoryId,
      roundActive: roundActive === true,
      by: userId,
    };

    await pusherServer.trigger(`presence-session-${id}`, "active-story", payload);

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("active story broadcast failed", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
