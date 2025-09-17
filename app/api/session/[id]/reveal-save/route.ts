import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/primsa";

export const runtime = "nodejs";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id: sessionId } = await ctx.params;
  try {
    const { storyId, votes } = (await req.json().catch(() => ({}))) as { storyId?: string; votes?: Array<{ userId: string; value: string }> };
    if (!storyId || !Array.isArray(votes)) return NextResponse.json({ error: "bad request" }, { status: 400 });

    // verify story belongs to session
    const exists = await prisma.story.findFirst({ where: { id: storyId, sessionId }, select: { id: true } });
    if (!exists) return NextResponse.json({ error: "not found" }, { status: 404 });

    await Promise.allSettled(
      votes.map(v =>
        prisma.vote.upsert({
          where: { userId_storyId: { userId: v.userId, storyId } },
          update: { value: v.value },
          create: { userId: v.userId, storyId, value: v.value },
        })
      )
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("reveal save failed", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}

