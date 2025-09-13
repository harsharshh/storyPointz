// File: app/api/sessions/[id]/join/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/primsa";

export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  try {
    const body = (await _req.json().catch(() => ({} as Record<string, unknown>))) as
      | { name?: unknown }
      | Record<string, unknown>;
    const rawName = (body as { name?: unknown })?.name ?? "";
    const rawStr = typeof rawName === "string" ? rawName : String(rawName ?? "");
    const trimmed = rawStr.trim();
    const name = trimmed || "Guest user";

    // Create a guest user with a unique email (since email is required and unique in your schema)
    const email = `guest_${Date.now()}_${Math.random().toString(36).slice(2)}@storypointz.local`;

    const user = await prisma.user.create({
      data: { name, email },
      select: { id: true },
    });

    // Connect user to the session (implicit many-to-many)
    await prisma.session.update({
      where: { id },
      data: {
        users: { connect: { id: user.id } },
      },
    });

    return NextResponse.json({ userId: user.id });
  } catch (e) {
    console.error("Join session failed:", e);
    return NextResponse.json({ error: "Failed to join" }, { status: 500 });
  }
}
