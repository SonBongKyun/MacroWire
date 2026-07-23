import { prisma } from "../db/prisma";

const RETENTION_DAYS = 30;

export async function cleanupOldArticles(): Promise<number> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);

  const saved = await prisma.savedArticle.findMany({ select: { articleId: true } });
  const candidates = await prisma.article.findMany({
    where: {
      publishedAt: { lt: cutoff },
      isSaved: false,
      id: { notIn: saved.map((item) => item.articleId) },
    },
    select: { id: true },
  });

  const ids = candidates.map((article) => article.id);
  if (ids.length === 0) return 0;

  const [, result] = await prisma.$transaction([
    prisma.readState.deleteMany({ where: { articleId: { in: ids } } }),
    prisma.article.deleteMany({ where: { id: { in: ids } } }),
  ]);

  console.log(
    `[cleanup] deleted ${result.count} articles older than ${RETENTION_DAYS} days`
  );
  return result.count;
}
