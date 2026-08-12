import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyArticleTextResponse,
  extractPublicArticleText,
  isRestrictedPublisherUrl,
} from "../src/lib/enrichment/articleText";
import { verifyOwnerSecret } from "../src/lib/security/api-auth";
import {
  fallbackSummaryEvidence,
  validateSourceSummaryOutput,
  type SummaryArticle,
} from "../src/lib/ai/sourceSummary";

const article: SummaryArticle = {
  id: "article-1",
  title: "Central bank changes its policy rate",
  sourceName: "Example Wire",
  url: "https://example.com/story",
  publishedAt: new Date("2026-08-11T10:00:00Z"),
  summary: null,
  feedExcerpt: "The central bank lowered its policy rate by 25 basis points after the meeting.",
  metaDescription: "Officials cited softer inflation and weaker hiring in the public statement.",
};

test("extracts public article paragraphs while excluding page chrome", () => {
  const html = `<html><body>
    <nav><p>Subscribe to our newsletter and sign in for more.</p></nav>
    <article>
      <p>The central bank lowered its policy rate by 25 basis points after a two-day meeting, responding to softer inflation data.</p>
      <p>Officials said hiring had slowed while consumer spending remained resilient, leaving future decisions dependent on incoming data.</p>
      <p>Two committee members preferred to keep rates unchanged, according to the statement released after the meeting.</p>
    </article>
    <footer><p>Privacy policy and all rights reserved by the publisher.</p></footer>
  </body></html>`;
  const text = extractPublicArticleText(html);
  assert.ok(text);
  assert.match(text, /25 basis points/);
  assert.match(text, /Two committee members/);
  assert.doesNotMatch(text, /Subscribe|Privacy policy/);
});

test("uses publisher JSON-LD articleBody when it contains the public story", () => {
  const body = "The ministry published a detailed trade report. ".repeat(12);
  const html = `<script type="application/ld+json">${JSON.stringify({ "@type": "NewsArticle", articleBody: body })}</script>`;
  assert.equal(extractPublicArticleText(html), body.trim());
});

test("classifies blocked and oversized source pages without bypassing them", () => {
  assert.equal(classifyArticleTextResponse(402, "text/html", 5_000), "blocked");
  assert.equal(classifyArticleTextResponse(451, "text/html", 5_000), "blocked");
  assert.equal(classifyArticleTextResponse(200, "application/pdf", 5_000), "unavailable");
  assert.equal(classifyArticleTextResponse(200, "text/html", 2_000_000), "unavailable");
  assert.equal(classifyArticleTextResponse(200, "text/html", 50_000), "read");
});

test("blocks full-text extraction for known paywalled publishers", () => {
  assert.equal(isRestrictedPublisherUrl("https://www.ft.com/content/story"), true);
  assert.equal(isRestrictedPublisherUrl("https://markets.wsj.com/story"), true);
  assert.equal(isRestrictedPublisherUrl("https://www.bloomberg.com/news/articles/story"), true);
  assert.equal(isRestrictedPublisherUrl("https://www.federalreserve.gov/newsevents/pressreleases.htm"), false);
});

test("AI generation fails closed without Clerk unless the owner secret is configured and supplied", () => {
  assert.equal(verifyOwnerSecret(new Headers(), {}), "unconfigured");
  assert.equal(
    verifyOwnerSecret(new Headers({ "x-macrowire-owner-secret": "wrong" }), { MACROWIRE_OWNER_SECRET: "correct" }),
    "invalid",
  );
  assert.equal(
    verifyOwnerSecret(new Headers({ authorization: "Bearer correct" }), { MACROWIRE_OWNER_SECRET: "correct" }),
    "authorized",
  );
});

test("labels fallback evidence rather than claiming it is the original body", () => {
  assert.deepEqual(fallbackSummaryEvidence(article, null), {
    scope: "rss-metadata",
    label: "RSS + 공개 metadata",
    text: `${article.feedExcerpt}\n${article.metaDescription}`,
  });
  assert.equal(fallbackSummaryEvidence({ ...article, feedExcerpt: null, metaDescription: null }, null), null);
  assert.equal(fallbackSummaryEvidence({ ...article, feedExcerpt: "Too short.", metaDescription: null }, null), null);
});

test("validates and bounds structured AI summary output", () => {
  assert.deepEqual(validateSourceSummaryOutput({
    summary: "정책금리가 25bp 인하됐고 당국은 향후 결정을 데이터에 연동했다.",
    keyPoints: ["- 물가 둔화가 결정 배경이다.", "2. 두 위원은 동결을 선호했다."],
    confidence: "HIGH",
  }), {
    summary: "정책금리가 25bp 인하됐고 당국은 향후 결정을 데이터에 연동했다.",
    keyPoints: ["물가 둔화가 결정 배경이다.", "두 위원은 동결을 선호했다."],
    confidence: "HIGH",
  });
  assert.throws(() => validateSourceSummaryOutput({ summary: "짧은 요약", keyPoints: [], confidence: "HIGH" }), /AI_BAD_SCHEMA/);
  assert.equal(validateSourceSummaryOutput({ summary: "확인된 사실은 하나다.", keyPoints: ["확인된 사실"], confidence: "LOW" }).keyPoints.length, 1);
  assert.throws(() => validateSourceSummaryOutput({ summary: "요약", keyPoints: ["a", "b"], confidence: "CERTAIN" }), /AI_BAD_SCHEMA/);
});
