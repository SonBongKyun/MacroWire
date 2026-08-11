import assert from "node:assert/strict";
import test from "node:test";
import {
  deriveWhyItMatters,
  extractKeyFacts,
  extractKeyNumbers,
  extractMetaDescription,
} from "../src/lib/enrichment/extract";
import { classifyMetadataResponse } from "../src/lib/enrichment/metadata";
import { isEnrichmentFresh } from "../src/lib/enrichment/enrichArticle";

test("extracts facts from RSS evidence without adding text", () => {
  const text = "The Federal Reserve lowered the target range by 25 basis points. Two members dissented.";
  const facts = extractKeyFacts([{ kind: "official", label: "Federal Reserve", text }]);
  assert.equal(facts.length, 2);
  assert.ok(facts.every((fact) => text.includes(fact.text)));
  assert.equal(facts[0].sourceKind, "official");
});

test("uses public metadata when available and handles attribute order", () => {
  const html = `<html><head><meta content="Inflation eased to 2.7% in July." property="og:description"></head></html>`;
  assert.equal(extractMetaDescription(html), "Inflation eased to 2.7% in July.");
  assert.equal(extractMetaDescription("<html><head></head></html>"), null);
});

test("extracts only numbers that carry an explicit unit and preserves context", () => {
  const evidence = [{ kind: "rss" as const, label: "Reuters", text: "The policy rate moved to 3.50–3.75% after a 25bp cut. Officials met in 2026." }];
  const numbers = extractKeyNumbers(evidence);
  assert.deepEqual(numbers.map((item) => item.value), ["3.50–3.75%", "25bp"]);
  assert.ok(numbers.every((item) => evidence[0].text.includes(item.context)));
});

test("does not hallucinate sections when evidence is missing", () => {
  assert.deepEqual(extractKeyFacts([]), []);
  assert.deepEqual(extractKeyNumbers([]), []);
  assert.equal(deriveWhyItMatters({ title: "Company opens a new office", summary: null, tags: [], sourceName: "News" }), null);
});

test("marks paid or blocked responses without attempting a bypass", () => {
  assert.equal(classifyMetadataResponse(402, "text/html", 1_000), "blocked");
  assert.equal(classifyMetadataResponse(403, "text/html", 1_000), "blocked");
  assert.equal(classifyMetadataResponse(200, "application/pdf", 1_000), "unavailable");
  assert.equal(classifyMetadataResponse(200, "text/html", 900_000), "unavailable");
  assert.equal(classifyMetadataResponse(200, "text/html", 1_000), "read");
});

test("honors the enrichment cache TTL", () => {
  const now = new Date("2026-08-11T12:00:00Z");
  assert.equal(isEnrichmentFresh(new Date("2026-08-11T11:00:00Z"), now), true);
  assert.equal(isEnrichmentFresh(new Date("2026-08-10T12:00:00Z"), now), false);
});
