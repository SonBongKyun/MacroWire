import assert from "node:assert/strict";
import test from "node:test";
import { persistFeedItems, type ArticleInsert, type WireSource } from "../src/lib/ingest/sourceIngest";
import { canonicalizeArticleUrl } from "../src/lib/ingest/url";

test("canonicalizes tracking variants to one article and prevents duplicate ingest", async () => {
  const seen = new Set<string>();
  const created: ArticleInsert[] = [];
  const source: WireSource = {
    id: "source-1",
    name: "Reuters",
    feedUrl: "https://example.com/feed.xml",
    category: "글로벌",
    tier: "T2",
  };
  const publishedAt = new Date("2026-08-11T00:00:00.000Z");
  const result = await persistFeedItems(source, [
    { title: "Fed decision", url: "https://example.com/story?utm_source=rss&id=7", publishedAt },
    { title: "Fed decision", url: "https://EXAMPLE.com/story?id=7&utm_medium=email#top", publishedAt },
  ], async (article) => {
    if (seen.has(article.url)) return "duplicate";
    seen.add(article.url);
    created.push(article);
    return "created";
  }, new Date("2026-08-11T01:00:00.000Z"));

  assert.equal(canonicalizeArticleUrl("https://example.com/story?id=7&utm_source=rss"), "https://example.com/story?id=7");
  assert.equal(result.added, 1);
  assert.equal(result.skipped, 1);
  assert.equal(created.length, 1);
  assert.equal(created[0].feedExcerpt, null);
});

test("keeps same-event headlines from different outlets for corroboration", async () => {
  const writes: ArticleInsert[] = [];
  const item = { title: "Fed cuts rates by 25bp", url: "https://one.example/fed", publishedAt: new Date("2026-08-11T00:00:00Z") };
  for (const [id, name, url] of [["one", "Reuters", item.url], ["two", "CNBC", "https://two.example/fed"]] as const) {
    await persistFeedItems({ id, name, feedUrl: "https://example.com/rss", category: "속보", tier: "T1" }, [{ ...item, url }], async (article) => {
      writes.push(article);
      return "created";
    }, new Date("2026-08-11T00:10:00Z"));
  }
  assert.equal(writes.length, 2);
  assert.notEqual(writes[0].url, writes[1].url);
});
