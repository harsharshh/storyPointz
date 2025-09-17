import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/primsa";
import { pusherServer } from "../../../../../lib/pusher-server";

export const runtime = "nodejs";

const avgVoteUserId = '__story_avg__';
let avgUserEnsured = false;

async function ensureAvgUser() {
  if (avgUserEnsured) return;
  await prisma.user.upsert({
    where: { id: avgVoteUserId },
    update: {},
    create: {
      id: avgVoteUserId,
      email: 'story-avg@system.storypointz',
      name: 'Story Average',
    },
  });
  avgUserEnsured = true;
}

function mapStoryWithAvg(row: { id: string; key: string; title: string; votes: Array<{ value: string }> }) {
  const manual = row.votes.find(v => typeof v.value === 'string' && v.value.startsWith('avg:'));
  if (manual) {
    const parsed = Number.parseFloat(manual.value.slice(4));
    const avg = Number.isFinite(parsed) ? parsed : null;
    return { id: row.id, key: row.key, title: row.title, avg, manual: true };
  }

  const nums = (row.votes || [])
    .map((v) => {
      const n = parseFloat(v.value);
      return Number.isFinite(n) ? n : null;
    })
    .filter((n): n is number => n !== null);
  const avg = nums.length ? Number((nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2)) : null;
  return { id: row.id, key: row.key, title: row.title, avg, manual: false };
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  try {
    const rows = await prisma.story.findMany({
      where: { sessionId: id },
      orderBy: { id: 'asc' },
      select: { id: true, key: true, title: true, votes: { select: { value: true } } },
    });
    const stories = rows.map(mapStoryWithAvg);
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
    return NextResponse.json({ story: { ...story, avg: null, manual: false } });
  } catch (e) {
    console.error("create story failed", e);
    return NextResponse.json({ error: "Failed to create story" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id: sessionId } = await ctx.params;
  try {
    const { storyId, title, avg } = (await req.json().catch(() => ({}))) as { storyId?: string; title?: string; avg?: number };
    if (!storyId) return NextResponse.json({ error: "bad request" }, { status: 400 });

    // Ensure the story belongs to this session
    const story = await prisma.story.findFirst({ where: { id: storyId, sessionId }, select: { id: true } });
    if (!story) return NextResponse.json({ error: "not found" }, { status: 404 });

    const updateData: { title?: string } = {};
    if (typeof title === 'string') {
      updateData.title = (title || "Untitled").toString().trim() || "Untitled";
    }

    if (Object.keys(updateData).length) {
      await prisma.story.update({ where: { id: storyId }, data: updateData });
    }

    let avgValue: number | null = null;
    if (typeof avg === 'number' && Number.isFinite(avg)) {
      avgValue = Number(avg.toFixed(2));
      await ensureAvgUser();
      const value = `avg:${avgValue}`;
      await prisma.vote.upsert({
        where: { userId_storyId: { userId: avgVoteUserId, storyId } },
        update: { value },
        create: { userId: avgVoteUserId, storyId, value },
      });
    }

    const fresh = await prisma.story.findUnique({
      where: { id: storyId },
      select: { id: true, key: true, title: true, votes: { select: { value: true } } },
    });
    if (!fresh) return NextResponse.json({ error: "not found" }, { status: 404 });

    const payload = mapStoryWithAvg(fresh);

    if (typeof avgValue === 'number') {
      try {
        await pusherServer.trigger(`presence-session-${sessionId}`, 'story-avg', { storyId, avg: avgValue, manual: true });
      } catch (err) {
        console.error('pusher story-avg broadcast failed', err);
      }
    }

    return NextResponse.json({ story: payload });
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
