import { prisma } from "../../../lib/primsa";
import { notFound } from "next/navigation";
import SessionGate from "./session-gate";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function SessionPage({ params }: Props) {
  const { id } = await params;
  const session = await prisma.session.findUnique({ where: { id } });
  if (!session) return notFound();

  return (
    <main className="min-h-screen">
      {/* Client-side gate handles username modal and localStorage */}
      <SessionGate sessionId={session.id} sessionName={session.name} />
    </main>
  );
}
