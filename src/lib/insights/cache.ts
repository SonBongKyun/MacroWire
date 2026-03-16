import { prisma } from "../db/prisma";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function getCachedInsight(
  type: string,
  targetId: string
): Promise<Record<string, unknown> | null> {
  const row = await prisma.insight.findUnique({
    where: { type_targetId: { type, targetId } },
  });

  if (!row) return null;
  if (new Date(row.expiresAt).getTime() < Date.now()) return null;

  try {
    return JSON.parse(row.content);
  } catch {
    return null;
  }
}

export async function setCachedInsight(
  type: string,
  targetId: string,
  model: string,
  content: Record<string, unknown>
): Promise<void> {
  const expiresAt = new Date(Date.now() + CACHE_TTL_MS);

  await prisma.insight.upsert({
    where: { type_targetId: { type, targetId } },
    update: {
      model,
      content: JSON.stringify(content),
      expiresAt,
    },
    create: {
      type,
      targetId,
      model,
      content: JSON.stringify(content),
      expiresAt,
    },
  });
}
