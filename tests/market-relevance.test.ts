import assert from "node:assert/strict";
import test from "node:test";
import { isMarketRelevantEvent } from "../src/lib/events/marketRelevance";
import { applyTags } from "../src/lib/tagging/tagger";

test("AI does not match inside chair", () => {
  const tags = applyTags(
    "Fed Chair Kevin Warsh discusses jobs data",
    "The Fed chair spoke about a data task force.",
  );
  assert.equal(tags.includes("AI"), false);
});

test("war does not match inside Warsh", () => {
  const tags = applyTags("Warsh opens his first Jackson Hole symposium", null);
  assert.equal(tags.includes("지정학"), false);
});

test("AI and war still match as standalone finance terms", () => {
  const tags = applyTags("AI spending rises as trade war risk returns", null);
  assert.equal(tags.includes("AI"), true);
  assert.equal(tags.includes("지정학"), true);
});

test("sports 경기 does not receive the economic cycle tag", () => {
  const tags = applyTags("◇오늘의 경기(28일)", "프로야구와 축구 경기 일정");
  assert.equal(tags.includes("경기"), false);
});

test("economic 경기 context still receives the cycle tag", () => {
  const tags = applyTags("소비 둔화로 국내 경기 회복 속도 약화", null);
  assert.equal(tags.includes("경기"), true);
});

test("weather and sports stay off the macro event desk", () => {
  assert.equal(isMarketRelevantEvent({
    title: "강원 대체로 흐리고 최대 80㎜ 비",
    tags: ["속보"],
    marketChannels: [],
  }), false);
  assert.equal(isMarketRelevantEvent({
    title: "오늘의 경기 일정",
    tags: ["속보", "경기"],
    marketChannels: [],
  }), false);
});

test("real macro, policy and commodity events remain eligible", () => {
  assert.equal(isMarketRelevantEvent({
    title: "Bank of Korea raises policy rate",
    tags: ["금리"],
    marketChannels: ["rates"],
  }), true);
  assert.equal(isMarketRelevantEvent({
    title: "Copper jumps on supply concerns",
    tags: ["원자재"],
    marketChannels: [],
  }), true);
});
