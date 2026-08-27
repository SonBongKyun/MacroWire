import assert from "node:assert/strict";
import test from "node:test";
import { ALL_TAGS, applyTags } from "../src/lib/tagging/tagger";
import tagRules from "../config/tag_rules.json";

test("the UI tag list is the rules file, not a copy of it", () => {
  // The filter bar used to hardcode its own array, so tags added to the rules
  // file were invisible until someone remembered to update it too.
  assert.deepEqual(ALL_TAGS, tagRules.rules.map((r) => r.tag));
  assert.ok(ALL_TAGS.length >= 19);
});

test("every tag in the catalogue is reachable from representative market context", () => {
  for (const rule of tagRules.rules) {
    // 경기 is intentionally context-sensitive because the bare Korean word
    // also means a sports match. Probe it with explicit business-cycle text
    // instead of reintroducing the false-positive behavior this test protects.
    const probe = rule.tag === "경기" ? "경제 경기 회복 전망" : rule.keywords[0];
    const tags = applyTags(probe);
    assert.ok(
      tags.includes(rule.tag),
      `"${probe}" should tag as ${rule.tag} but produced [${tags.join(", ")}]`
    );
  }
});

test("tag rules have no duplicate tags", () => {
  const seen = new Set<string>();
  for (const rule of tagRules.rules) {
    assert.ok(!seen.has(rule.tag), `duplicate tag: ${rule.tag}`);
    seen.add(rule.tag);
  }
});
