import { prisma } from "../../../lib/primsa";
import { notFound } from "next/navigation";
import SessionGate from "./session-gate";

interface Props {
  params: { id: string };
}

export default async function SessionPage({ params }: Props) {
  const session = await prisma.session.findUnique({ where: { id: params.id } });
  if (!session) return notFound();

  return (
    <main className="min-h-screen px-6 py-10">
      {/* Client-side gate handles username modal and localStorage */}
      <SessionGate sessionId={session.id} sessionName={session.name} />
    </main>
  );
}