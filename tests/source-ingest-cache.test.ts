import assert from "node:assert/strict";
import test from "node:test";
import { runSourceIngest, type WireSource } from "../src/lib/ingest/sourceIngest";

const source: WireSource = {
  id: "source-1",
  name: "Test Feed",
  feedUrl: "https://example.com/rss",
  category: "경제",
  tier: "T2",
  feedEtag: '"abc"',
  feedLastModified: "Wed, 26 Aug 2026 00:00:00 GMT",
};

test("304 feed response skips persistence but keeps validators", async () => {
  let createCalls = 0;
  const result = await runSourceIngest(source, {
    fetchFeed: async () => ({
      items: [],
      status: 304,
      etag: '"abc"',
      lastModified: "Wed, 26 Aug 2026 00:00:00 GMT",
      notModified: true,
      retryAfterMs: null,
    }),
    createArticle: async () => {
      createCalls++;
      return "created";
    },
  });

  assert.equal(result.failed, false);
  assert.equal(result.notModified, true);
  assert.equal(result.httpStatus, 304);
  assert.equal(result.added, 0);
  assert.equal(createCalls, 0);
  assert.equal(result.etag, '"abc"');
});
