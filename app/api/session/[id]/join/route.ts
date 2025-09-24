// File: app/api/sessions/[id]/join/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/primsa";
import { pusherServer } from "../../../../../lib/pusher-server";

export const runtime = "nodejs";

export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  try {
    const body = (await _req.json().catch(() => ({} as Record<string, unknown>))) as
      | { name?: unknown; userId?: unknown }
      | Record<string, unknown>;
    const rawName = (body as { name?: unknown })?.name ?? "";
    const rawStr = typeof rawName === "string" ? rawName : String(rawName ?? "");
    const trimmed = rawStr.trim();
    const name = trimmed || "Guest user";
    const maybeUserId = (body as { userId?: unknown })?.userId;
    const userIdFromClient = typeof maybeUserId === "string" ? maybeUserId : undefined;

    let effectiveUserId: string | null = null;
    // If client has an existing userId, try to use it; otherwise create a new guest
    if (userIdFromClient) {
      const existing = await prisma.user.findUnique({ where: { id: userIdFromClient }, select: { id: true } });
      if (existing) {
        effectiveUserId = existing.id;
        // Best-effort update name
        await prisma.user.update({ where: { id: existing.id }, data: { name } }).catch(() => {});
      }
    }

    if (!effectiveUserId) {
      // Create a guest user with a unique email (since email is required and unique in your schema)
      const email = `guest_${Date.now()}_${Math.random().toString(36).slice(2)}@storypointz.local`;
      const created = await prisma.user.create({
        data: { name, email },
        select: { id: true },
      });
      effectiveUserId = created.id;
    }

    // Connect user to the session (implicit many-to-many)
    await prisma.session.update({
      where: { id },
      data: {
        users: { connect: { id: effectiveUserId } },
      },
    });

    // Notify channel about join (best-effort)
    const realtimePayload = { userId: effectiveUserId, name };
    try {
      await pusherServer.trigger(`presence-session-${id}`, "user-joined", { id: effectiveUserId, name });
    } catch {}
    try {
      await pusherServer.trigger(`presence-session-${id}`, "name-change", realtimePayload);
    } catch {}

    return NextResponse.json({ userId: effectiveUserId });
  } catch (e) {
    console.error("Join session failed:", e);
    return NextResponse.json({ error: "Failed to join" }, { status: 500 });
  }
}
