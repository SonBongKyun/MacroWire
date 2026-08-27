import { createHash } from "node:crypto";
import { prisma } from "@/lib/db/prisma";
import type { NewWireArticle } from "@/lib/ingest/sourceIngest";
import {
  EVENT_MATCH_THRESHOLD,
  eventSimilarityV2,
} from "@/lib/events/eventIntelligence";

const DEFAULT_EVENT_WINDOW_MS = 8 * 60 * 60_000;
const EXTENDED_EVENT_WINDOW_MS = 18 * 60 * 60_000;

function parseStringArray(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const value = JSON.parse(raw);
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

/** Backwards-compatible export used by tests and older callers. */
export function eventSimilarity(
  a: { title: string; tags: string[] },
  b: { title: string; tags: string[] },
): number {
  return eventSimilarityV2(a, b);
}

function eventWindowMs(article: Pick<NewWireArticle, "title" | "tags">): number {
  const text = `${article.title} ${article.tags.join(" ")}`.toLowerCase();
  // Geopolitical, commodity-supply and central-bank stories often develop in
  // waves over a full session. The stricter V2 entity matching lets us keep a
  // longer window without fusing generic market headlines.
  if (/hormuz|iran|israel|war|sanction|opec|oil|energy|central bank|fed|fomc|ecb|boj|bok|호르무즈|이란|이스라엘|전쟁|제재|유가|에너지|연준|한국은행|금통위/.test(text)) {
    return EXTENDED_EVENT_WINDOW_MS;
  }
  return DEFAULT_EVENT_WINDOW_MS;
}

function eventKey(articleId: string): string {
  return `evt_${createHash("sha256").update(articleId).digest("hex").slice(0, 24)}`;
}

function inferRegions(article: Pick<NewWireArticle, "title" | "tags">): string[] {
  const text = `${article.title} ${article.tags.join(" ")}`.toLowerCase();
  const regions: string[] = [];
  if (/한국|korea|kospi|원화|krw|한국은행/.test(text)) regions.push("KR");
  if (/미국|u\.s\.|united states|fed|federal reserve|treasury|dollar|usd/.test(text)) regions.push("US");
  if (/유럽|euro|ecb|europe|독일|france|italy/.test(text)) regions.push("EU");
  if (/일본|japan|boj|yen|jpy/.test(text)) regions.push("JP");
  if (/중국|china|pboc|yuan|cny/.test(text)) regions.push("CN");
  if (/중동|iran|israel|hormuz|saudi|gulf/.test(text)) regions.push("ME");
  return unique(regions);
}

function inferMarketChannels(tags: string[]): string[] {
  const text = tags.join(" ").toLowerCase();
  const channels: string[] = [];
  if (/금리|rates|채권|bond|국채|treasury|fed|ecb|boj/.test(text)) channels.push("rates");
  if (/fx|환율|달러|원화|엔화|통화/.test(text)) channels.push("fx");
  if (/주식|equity|증시|반도체|semiconductor|ai/.test(text)) channels.push("equities");
  if (/유가|oil|energy|에너지|원유|천연가스/.test(text)) channels.push("energy");
  if (/crypto|bitcoin|btc|가상자산/.test(text)) channels.push("crypto");
  if (/인플레이션|inflation|cpi|pce|고용|labor|gdp|성장/.test(text)) channels.push("macro");
  return unique(channels);
}

export async function linkArticleToEvent(article: NewWireArticle): Promise<string | null> {
  const alreadyLinked = await prisma.eventArticle.findUnique({ where: { articleId: article.id } });
  if (alreadyLinked) return alreadyLinked.eventId;

  const publishedAt = new Date(article.publishedAt);
  const windowMs = eventWindowMs(article);
  const lower = new Date(publishedAt.getTime() - windowMs);
  const upper = new Date(publishedAt.getTime() + windowMs);
  const candidates = await prisma.event.findMany({
    where: { latestPublishedAt: { gte: lower, lte: upper } },
    orderBy: [{ latestPublishedAt: "desc" }, { importanceScore: "desc" }],
    take: 120,
  });

  let best: (typeof candidates)[number] | null = null;
  let bestScore = 0;
  for (const candidate of candidates) {
    const score = eventSimilarityV2(
      { title: article.title, tags: article.tags },
      { title: candidate.title, tags: parseStringArray(candidate.tags) },
    );
    if (score >= EVENT_MATCH_THRESHOLD && score > bestScore) {
      best = candidate;
      bestScore = score;
    }
  }

  const regions = inferRegions(article);
  const marketChannels = inferMarketChannels(article.tags);
  const isOfficial = article.sourceTier === "T0";

  if (!best) {
    const created = await prisma.event.create({
      data: {
        eventKey: eventKey(article.id),
        title: article.title,
        firstSeenAt: publishedAt,
        lastSeenAt: publishedAt,
        latestPublishedAt: publishedAt,
        importanceTier: article.importanceTier,
        importanceScore: article.importanceScore,
        coverageCount: 1,
        primarySourceName: article.sourceName,
        officialSourceName: isOfficial ? article.sourceName : null,
        tags: JSON.stringify(article.tags),
        regions: JSON.stringify(regions),
        marketChannels: JSON.stringify(marketChannels),
        articles: {
          create: {
            articleId: article.id,
            sourceName: article.sourceName,
            publishedAt,
            similarityScore: 1,
            isPrimary: true,
          },
        },
      },
    });
    return created.id;
  }

  return prisma.$transaction(async (tx) => {
    const currentLinks = await tx.eventArticle.findMany({
      where: { eventId: best.id },
      select: { sourceName: true },
    });
    const sourceNames = new Set(currentLinks.map((link) => link.sourceName));
    sourceNames.add(article.sourceName);
    const becomesPrimary = article.importanceScore > best.importanceScore;
    if (becomesPrimary) {
      await tx.eventArticle.updateMany({ where: { eventId: best.id }, data: { isPrimary: false } });
    }
    await tx.eventArticle.create({
      data: {
        eventId: best.id,
        articleId: article.id,
        sourceName: article.sourceName,
        publishedAt,
        similarityScore: bestScore,
        isPrimary: becomesPrimary,
      },
    });

    const mergedTags = unique([...parseStringArray(best.tags), ...article.tags]);
    const mergedRegions = unique([...parseStringArray(best.regions), ...regions]);
    const mergedChannels = unique([...parseStringArray(best.marketChannels), ...marketChannels]);
    await tx.event.update({
      where: { id: best.id },
      data: {
        title: becomesPrimary ? article.title : best.title,
        firstSeenAt: publishedAt < best.firstSeenAt ? publishedAt : best.firstSeenAt,
        lastSeenAt: publishedAt > best.lastSeenAt ? publishedAt : best.lastSeenAt,
        latestPublishedAt: publishedAt > best.latestPublishedAt ? publishedAt : best.latestPublishedAt,
        importanceTier: becomesPrimary ? article.importanceTier : best.importanceTier,
        // Keep the stored score as the strongest source-level signal. Event-level
        // coverage/freshness bonuses are calculated at read time so they never
        // compound every time another article is attached.
        importanceScore: Math.max(best.importanceScore, article.importanceScore),
        coverageCount: sourceNames.size,
        primarySourceName: becomesPrimary ? article.sourceName : best.primarySourceName,
        officialSourceName: best.officialSourceName ?? (isOfficial ? article.sourceName : null),
        tags: JSON.stringify(mergedTags),
        regions: JSON.stringify(mergedRegions),
        marketChannels: JSON.stringify(mergedChannels),
      },
    });
    return best.id;
  });
}

export async function linkNewArticlesToEvents(articles: NewWireArticle[]): Promise<void> {
  for (const article of articles) {
    try {
      await linkArticleToEvent(article);
    } catch (error) {
      // Event construction is a derived product layer. Never let it stop wire ingestion.
      console.error(`[event] could not link ${article.id}`, error);
    }
  }
}

/** Gradually fills the event graph for recent articles created before Event V1 shipped. */
export async function backfillRecentEvents(limit = 30, hours = 48): Promise<number> {
  const since = new Date(Date.now() - Math.max(1, hours) * 60 * 60_000);
  const articles = await prisma.article.findMany({
    where: {
      publishedAt: { gte: since },
      eventLinks: { none: {} },
    },
    include: { source: { select: { tier: true } } },
    orderBy: { publishedAt: "asc" },
    take: Math.min(Math.max(1, limit), 100),
  });

  for (const article of articles) {
    await linkArticleToEvent({
      id: article.id,
      title: article.title,
      url: article.url,
      sourceName: article.sourceName,
      sourceTier: article.source.tier,
      publishedAt: article.publishedAt.toISOString(),
      importanceTier: article.importanceTier as "critical" | "major" | "general",
      importanceScore: article.importanceScore,
      importanceReasons: parseStringArray(article.importanceReasons),
      summary: article.feedExcerpt ?? article.summary,
      tags: parseStringArray(article.tags),
    });
  }
  return articles.length;
}
