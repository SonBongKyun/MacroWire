import { seedSources } from "../src/lib/db/seed";
import { runIngest } from "../src/lib/ingest/ingest";

/**
 * Hourly full ingest, run by .github/workflows/full-ingest.yml straight against
 * Neon.
 *
 * The catalogue is seeded first. /api/ingest has always done this, but the
 * scheduled job runs this script rather than the route, so config never reached
 * production: feeds added to config/sources_seed.json sat there until someone
 * happened to call the admin-only seed endpoint. seedSources() upserts by
 * feedUrl, so this is cheap and also refreshes names and categories on rows
 * that already exist.
 *
 * It never re-enables a source that was switched off deliberately — it only
 * creates missing rows and updates labels.
 */
async function main() {
  const seeded = await seedSources();
  const result = await runIngest();
  console.log(JSON.stringify({ seeded, ...result }, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
