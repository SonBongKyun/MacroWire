import assert from "node:assert/strict";
import test from "node:test";
import { eventSimilarity } from "../src/lib/events/eventGraph";

test("event similarity links same macro story across outlets", () => {
  const score = eventSimilarity(
    { title: "Federal Reserve cuts rates by 25 basis points", tags: ["금리", "연준"] },
    { title: "Fed cuts interest rates 25 basis points after meeting", tags: ["금리", "연준"] },
  );
  assert.ok(score > 0);
});

test("event similarity rejects stories with no shared macro tag", () => {
  assert.equal(
    eventSimilarity(
      { title: "Federal Reserve cuts rates by 25 basis points", tags: ["금리"] },
      { title: "Federal Reserve building hosts charity concert", tags: ["문화"] },
    ),
    0,
  );
});

test("event similarity rejects weak title coincidence", () => {
  assert.equal(
    eventSimilarity(
      { title: "Markets set for new session after holiday", tags: ["증시"] },
      { title: "New market rules set out by regulator", tags: ["증시"] },
    ),
    0,
  );
});
