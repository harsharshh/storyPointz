import { NextResponse } from "next/server";
import { prisma } from "../../../lib/primsa";

export async function POST(req: Request) {
  try {
    const { name } = await req.json().catch(() => ({ name: "" }));
    const session = await prisma.session.create({
      data: { name: name?.toString()?.trim() || "Untitled Session" },
    });
    return NextResponse.json({ sessionId: session.id });
  } catch (e) {
    console.error("Create session failed:", e);
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
  }
}