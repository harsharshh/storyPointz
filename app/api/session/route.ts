import { NextResponse } from "next/server";
import { prisma } from "../../../lib/primsa";

export async function POST(req: Request) {
  try {
    const { name } = await req.json().catch(() => ({ name: "" }));
    const session = await prisma.session.create({
      data: { name: name?.toString()?.trim() || "Untitled Session" },
    });
    // Create a default story for this session so voting can attach to it
    try {
      await prisma.story.create({
        data: {
          key: "S-1",
          title: "Untitled",
          sessionId: session.id,
        },
      });
    } catch (e) {
      // ignore story create errors to not block session creation
      console.error("default story create failed", e);
    }
    return NextResponse.json({ sessionId: session.id });
  } catch (e) {
    console.error("Create session failed:", e);
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
  }
}
