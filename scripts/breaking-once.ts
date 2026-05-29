import { runBreakingIngest } from "../src/lib/ingest/breakingIngest";

runBreakingIngest()
  .then((r) => {
    console.log(JSON.stringify(r, null, 2));
    process.exit(r.failedSources > 0 ? 1 : 0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
