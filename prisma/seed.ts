import { seedSources } from "../src/lib/db/seed";

async function main() {
  console.log("Seeding sources...");
  const result = await seedSources();
  console.log(`Seed complete: ${result.added} added, ${result.skipped} skipped`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
