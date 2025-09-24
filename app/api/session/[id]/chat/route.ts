import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/primsa";
import { pusherServer } from "../../../../../lib/pusher-server";

export const runtime = "nodejs";

type IncomingMessage = {
  id?: string;
  userId?: string | null;
  author?: string;
  body?: string;
  timestamp?: string;
};

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  try {
    const { userId, message } = (await req.json().catch(() => ({}))) as { userId?: string; message?: IncomingMessage };
    if (!message || typeof message.id !== "string" || !message.id.trim()) {
      return NextResponse.json({ error: "bad request" }, { status: 400 });
    }

    if (!userId) {
      return NextResponse.json({ error: "bad request" }, { status: 400 });
    }

    const sessionMember = await prisma.session.findFirst({
      where: { id, users: { some: { id: userId } } },
      select: { id: true },
    });
    if (!sessionMember) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const payload = {
      id: message.id,
      userId: typeof message.userId === "string" ? message.userId : undefined,
      author: typeof message.author === "string" ? message.author : "Guest user",
      body: typeof message.body === "string" ? message.body : "",
      timestamp: typeof message.timestamp === "string" ? message.timestamp : new Date().toISOString(),
    };

    if (!payload.body.trim()) {
      return NextResponse.json({ error: "bad request" }, { status: 400 });
    }

    await pusherServer.trigger(`presence-session-${id}`, "chat-message", payload);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("chat broadcast failed", error);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
