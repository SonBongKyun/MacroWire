import assert from "node:assert/strict";
import test from "node:test";
import { canonicalSourceName } from "../src/lib/events/sourceIdentity";

test("newsroom feed variants collapse to one publisher identity", () => {
  assert.equal(canonicalSourceName("연합뉴스 속보"), "연합뉴스");
  assert.equal(canonicalSourceName("연합뉴스 경제"), "연합뉴스");
  assert.equal(canonicalSourceName("Bloomberg Markets"), "Bloomberg");
  assert.equal(canonicalSourceName("Bloomberg Politics"), "Bloomberg");
  assert.equal(canonicalSourceName("CNBC Breaking"), "CNBC");
  assert.equal(canonicalSourceName("CNBC Top News"), "CNBC");
});

test("unrelated publishers remain independent", () => {
  assert.notEqual(canonicalSourceName("Reuters"), canonicalSourceName("Bloomberg Markets"));
  assert.notEqual(canonicalSourceName("연합뉴스 경제"), canonicalSourceName("매일경제 경제"));
});
