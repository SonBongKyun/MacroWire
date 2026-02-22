import { prisma } from "../db/prisma";
import sourcesData from "../../../config/sources_seed.json";

export async function seedSources() {
  let added = 0;
  let skipped = 0;

  for (const src of sourcesData) {
    const exists = await prisma.source.findUnique({
      where: { feedUrl: src.feedUrl },
    });
    if (exists) {
      skipped++;
      continue;
    }
    await prisma.source.create({
      data: {
        name: src.name,
        feedUrl: src.feedUrl,
        category: src.category,
        enabled: true,
      },
    });
    added++;
  }

  console.log(`[seed] sources added: ${added}, skipped: ${skipped}`);
  return { added, skipped };
}
