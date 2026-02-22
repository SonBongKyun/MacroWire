import { prisma } from "../db/prisma";

const RETENTION_DAYS = 30;

export async function cleanupOldArticles(): Promise<number> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);

  const result = await prisma.article.deleteMany({
    where: {
      publishedAt: { lt: cutoff },
      isSaved: false, // preserve saved articles
    },
  });

  console.log(
    `[cleanup] deleted ${result.count} articles older than ${RETENTION_DAYS} days`
  );
  return result.count;
}
