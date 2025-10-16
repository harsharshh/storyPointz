import { prisma } from './lib/primsa';

async function main() {
  const session = await prisma.session.findFirst();
  console.log(session);
}

main().finally(async () => {
  await prisma.$disconnect();
});
