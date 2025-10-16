import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
try {
  const result = await prisma.session.update({
    where: { id: 'dummy' },
    data: { activeStoryId: 'x', activeStoryKey: 'k', activeStoryTitle: 't', activeStoryRoundActive: true },
  });
  console.log(result);
} catch (err) {
  console.error('err', err.message);
} finally {
  await prisma.$disconnect();
}
