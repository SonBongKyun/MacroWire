import { prisma } from "../db/prisma";
import sourcesData from "../../../config/sources_seed.json";
import { inferSourceTier, type WireSourceTier } from "../ingest/sourceTiers";

interface SeedSource {
  name: string;
  feedUrl: string;
  category: string;
  tier?: WireSourceTier;
  /**
   * A feed that used to be in the catalogue and should now be switched off.
   *
   * Dropping an entry from the JSON does not touch the database — the row keeps
   * ingesting. Marking it retired instead keeps the decision in version control
   * and lets the scheduled job apply it, rather than someone poking production
   * by hand. Articles already collected are left alone.
   */
  retired?: boolean;
}

export async function seedSources() {
  let added = 0;
  let skipped = 0;
  let retired = 0;

  for (const src of sourcesData as SeedSource[]) {
    const tier = inferSourceTier(src);
    const exists = await prisma.source.findUnique({
      where: { feedUrl: src.feedUrl },
    });

    if (exists) {
      // Only ever disable on an explicit retire flag. Nothing here re-enables a
      // source that was turned off deliberately.
      await prisma.source.update({
        where: { id: exists.id },
        data: src.retired
          ? { name: src.name, category: src.category, tier, enabled: false }
          : { name: src.name, category: src.category, tier },
      });
      if (src.retired && exists.enabled) retired++;
      else skipped++;
      continue;
    }

    // A retired feed that was never in the database has nothing to switch off.
    if (src.retired) {
      skipped++;
      continue;
    }

    await prisma.source.create({
      data: {
        name: src.name,
        feedUrl: src.feedUrl,
        category: src.category,
        tier,
        enabled: true,
      },
    });
    added++;
  }

  console.log(
    `[seed] sources added: ${added}, skipped: ${skipped}, retired: ${retired}`
  );
  return { added, skipped, retired };
}
