import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/primsa";
import { pusherServer } from "../../../../lib/pusher-server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type") || "";
    let body: Record<string, unknown> = {};
    if (contentType.includes("application/json")) {
      body = await req.json();
    } else {
      const form = await req.formData();
      body = {
        socket_id: form.get("socket_id"),
        channel_name: form.get("channel_name"),
      };
    }

    const socketId = String(body.socket_id || "").trim();
    const channelName = String(body.channel_name || "").trim();
    if (!socketId || !channelName) return NextResponse.json({ error: "bad request" }, { status: 400 });

    // Expect presence channel: presence-session-<id>
    const match = channelName.match(/^presence-session-(.+)$/);
    if (!match) return NextResponse.json({ error: "invalid channel" }, { status: 400 });
    const sessionId = match[1];

    // User identity from headers (sent by client)
    const userId = req.headers.get("x-spz-user-id") || "";
    const userName = req.headers.get("x-spz-user-name") || "Guest user";
    if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    // Validate membership: user must be connected to session in DB
    const session = await prisma.session.findFirst({
      where: { id: sessionId, users: { some: { id: userId } } },
      select: { id: true },
    });
    if (!session) return NextResponse.json({ error: "forbidden" }, { status: 403 });

    const presenceData: { user_id: string; user_info?: Record<string, unknown> } = {
      user_id: userId,
      user_info: { name: userName },
    };

    const auth = pusherServer.authenticate(socketId, channelName, presenceData);
    return NextResponse.json(auth);
  } catch (e) {
    console.error("pusher auth failed", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
