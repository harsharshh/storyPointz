import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/primsa";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  try {
    const rows = await prisma.story.findMany({
      where: { sessionId: id },
      orderBy: { id: 'asc' },
      select: { id: true, key: true, title: true, votes: { select: { value: true } } },
    });
    const stories = rows.map((s) => {
      const nums = (s.votes || [])
        .map((v) => {
          const n = parseFloat(v.value);
          return Number.isFinite(n) ? n : null;
        })
        .filter((n): n is number => n !== null);
      const avg = nums.length ? Number((nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2)) : null;
      return { id: s.id, key: s.key, title: s.title, avg };
    });
    return NextResponse.json({ stories });
  } catch (e) {
    console.error("list stories failed", e);
    return NextResponse.json({ error: "Failed to list stories" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  try {
    const { title } = (await req.json().catch(() => ({}))) as { title?: string };
    const count = await prisma.story.count({ where: { sessionId: id } });
    const story = await prisma.story.create({
      data: {
        key: `S-${count + 1}`,
        title: (title || "Untitled").toString().trim() || "Untitled",
        sessionId: id,
      },
      select: { id: true, key: true, title: true },
    });
    return NextResponse.json({ story: { ...story, avg: null } });
  } catch (e) {
    console.error("create story failed", e);
    return NextResponse.json({ error: "Failed to create story" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id: sessionId } = await ctx.params;
  try {
    const { storyId, title } = (await req.json().catch(() => ({}))) as { storyId?: string; title?: string };
    if (!storyId) return NextResponse.json({ error: "bad request" }, { status: 400 });

    // Ensure the story belongs to this session
    const story = await prisma.story.findFirst({ where: { id: storyId, sessionId }, select: { id: true } });
    if (!story) return NextResponse.json({ error: "not found" }, { status: 404 });

    const updated = await prisma.story.update({
      where: { id: storyId },
      data: { title: (title || "Untitled").toString().trim() || "Untitled" },
      select: { id: true, key: true, title: true },
    });
    return NextResponse.json({ story: { ...updated, avg: null } });
  } catch (e) {
    console.error("update story failed", e);
    return NextResponse.json({ error: "Failed to update story" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id: sessionId } = await ctx.params;
  try {
    const { storyId } = (await req.json().catch(() => ({}))) as { storyId?: string };
    if (!storyId) return NextResponse.json({ error: "bad request" }, { status: 400 });

    // ensure story belongs to session
    const story = await prisma.story.findFirst({ where: { id: storyId, sessionId }, select: { id: true } });
    if (!story) {
      return NextResponse.json({ ok: true, missing: true });
    }

    await prisma.vote.deleteMany({ where: { storyId } });
    await prisma.story.delete({ where: { id: storyId } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("delete story failed", e);
    return NextResponse.json({ error: "Failed to delete story" }, { status: 500 });
  }
}
