import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/primsa";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  try {
    const stories = await prisma.story.findMany({
      where: { sessionId: id },
      orderBy: { id: 'asc' },
      select: { id: true, key: true, title: true },
    });
    return NextResponse.json({ stories });
  } catch (e) {
    console.error("list stories failed", e);
    return NextResponse.json({ error: "Failed to list stories" }, { status: 500 });
  }
}
