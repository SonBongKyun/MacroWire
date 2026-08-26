import Parser from "rss-parser";
import { prisma } from "../db/prisma";
import { applyTags } from "../tagging/tagger";
import { classifyNewsImportance } from "../news/importance";
import { deliverDiscordAlerts } from "../alerts/discord";
import { safePublicFetch } from "../security/outbound-url";
import { FeedHttpError, parseRetryAfterMs, withFeedRetry } from "./feedRetry";
import { articleIdFromUrl, canonicalizeArticleUrl } from "./url";
import {
  getTierSchedules,
  inferSourceTier,
  nextPollAt,
  type WireSourceTier,
} from "./sourceTiers";

const FEED_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "application/rss+xml, application/atom+xml, application/xml;q=0.9, text/xml;q=0.8, */*;q=0.7",
  "Accept-Language": "en-US,en;q=0.9,ko;q=0.8",
  "Accept-Encoding": "identity",
};

const parser = new Parser();

export interface WireSource {
  id: string;
  name: string;
  feedUrl: string;
  category: string;
  tier: WireSourceTier;
  consecutiveFailures?: number;
  nextFetchAt?: Date | null;
  feedEtag?: string | null;
  feedLastModified?: string | null;
  lastRetryAfterMs?: number | null;
}

export interface FeedItem {
  title: string;
  url: string;
  summary?: string | null;
  publishedAt?: Date;
}

export interface FeedFetchResult {
  items: FeedItem[];
  status: number;
  etag: string | null;
  lastModified: string | null;
  notModified: boolean;
  retryAfterMs: number | null;
}

export interface NewWireArticle {
  id: string;
  title: string;
  url: string;
  sourceName: string;
  sourceTier: WireSourceTier;
  publishedAt: string;
  importanceTier: "critical" | "major" | "general";
  importanceScore: number;
  importanceReasons: string[];
  summary: string | null;
  tags: string[];
}

export interface SourceIngestResult {
  sourceId: string;
  sourceName: string;
  added: number;
  skipped: number;
  failed: boolean;
  latencyMs: number;
  error?: string;
  newArticles: NewWireArticle[];
  httpStatus?: number;
  etag?: string | null;
  lastModified?: string | null;
  notModified?: boolean;
  retryAfterMs?: number | null;
}

function conditionalHeaders(source: WireSource): Record<string, string> {
  const headers: Record<string, string> = { ...FEED_HEADERS };
  if (source.feedEtag) headers["If-None-Match"] = source.feedEtag;
  if (source.feedLastModified) headers["If-Modified-Since"] = source.feedLastModified;
  return headers;
}

function mapFeedItems(feed: Awaited<ReturnType<Parser["parseString"]>>): FeedItem[] {
  return feed.items.map((item) => ({
    title: item.title?.trim() || "Untitled",
    url: item.link || "",
    summary: item.contentSnippet?.slice(0, 1_500) ?? item.content?.slice(0, 1_500) ?? null,
    publishedAt: item.pubDate
      ? new Date(item.pubDate)
      : item.isoDate
        ? new Date(item.isoDate)
        : new Date(),
  }));
}

export async function fetchSourceFeedDetailed(source: WireSource): Promise<FeedFetchResult> {
  const schedule = getTierSchedules()[source.tier];
  return withFeedRetry(async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), schedule.timeoutMs);
    try {
      const response = await safePublicFetch(source.feedUrl, {
        headers: conditionalHeaders(source),
        signal: controller.signal,
        cache: "no-store",
      });
      const retryAfterMs = parseRetryAfterMs(response.headers.get("retry-after"));
      const etag = response.headers.get("etag") ?? source.feedEtag ?? null;
      const lastModified = response.headers.get("last-modified") ?? source.feedLastModified ?? null;

      if (response.status === 304) {
        return { items: [], status: 304, etag, lastModified, notModified: true, retryAfterMs };
      }
      if (!response.ok) {
        throw new FeedHttpError(
          `Feed request failed with Status code ${response.status}`,
          response.status,
          retryAfterMs,
        );
      }

      const xml = await response.text();
      if (xml.length > 5_000_000) throw new Error("Feed body exceeds 5 MB");
      const feed = await parser.parseString(xml);
      return {
        items: mapFeedItems(feed),
        status: response.status,
        etag,
        lastModified,
        notModified: false,
        retryAfterMs,
      };
    } finally {
      clearTimeout(timeout);
    }
  }, { attempts: schedule.retryAttempts, baseDelayMs: 700, jitterMs: 350 });
}

/** Backwards-compatible helper retained for scripts/tests that only need items. */
export async function fetchSourceFeed(source: WireSource): Promise<FeedItem[]> {
  return (await fetchSourceFeedDetailed(source)).items;
}

export interface ArticleInsert {
  id: string;
  sourceId: string;
  sourceName: string;
  title: string;
  url: string;
  publishedAt: Date;
  summary: string | null;
  feedExcerpt: string | null;
  tags: string;
  importanceTier: string;
  importanceScore: number;
  importanceReasons: string;
  isRead: false;
  isSaved: false;
}

export type CreateArticle = (article: ArticleInsert) => Promise<"created" | "duplicate">;

function isUniqueConstraint(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: string }).code === "P2002",
  );
}

async function createWithPrisma(article: ArticleInsert): Promise<"created" | "duplicate"> {
  try {
    await prisma.article.create({ data: article });
    return "created";
  } catch (error) {
    if (isUniqueConstraint(error)) return "duplicate";
    throw error;
  }
}

export async function persistFeedItems(
  source: WireSource,
  items: FeedItem[],
  createArticle: CreateArticle = createWithPrisma,
  now = new Date(),
): Promise<{ added: number; skipped: number; newArticles: NewWireArticle[] }> {
  let added = 0;
  let skipped = 0;
  const newArticles: NewWireArticle[] = [];
  const retentionCutoff = new Date(now.getTime() - 30 * 24 * 60 * 60_000);

  for (const item of items) {
    if (!item.url) {
      skipped++;
      continue;
    }

    const url = canonicalizeArticleUrl(item.url);
    const publishedAt = item.publishedAt ?? now;
    if (Number.isNaN(publishedAt.getTime()) || publishedAt < retentionCutoff) {
      skipped++;
      continue;
    }

    const feedExcerpt = item.summary?.replace(/\s+/g, " ").trim().slice(0, 1_500) || null;
    const title = item.title.trim() || "Untitled";
    const baseTags = applyTags(title, feedExcerpt);
    const isBreakingSource = source.category === "속보" || /속보|breaking/i.test(source.name);
    const tags = isBreakingSource && !baseTags.includes("속보")
      ? ["속보", ...baseTags]
      : baseTags;
    const importance = classifyNewsImportance({
      title,
      summary: feedExcerpt,
      tags,
      sourceName: source.name,
      sourceTier: source.tier,
      publishedAt,
    }, now.getTime());

    const id = articleIdFromUrl(url);
    const outcome = await createArticle({
      id,
      sourceId: source.id,
      sourceName: source.name,
      title,
      url,
      publishedAt,
      summary: feedExcerpt,
      feedExcerpt,
      tags: JSON.stringify(tags),
      importanceTier: importance.tier,
      importanceScore: importance.score,
      importanceReasons: JSON.stringify(importance.reasons),
      isRead: false,
      isSaved: false,
    });

    if (outcome === "duplicate") {
      skipped++;
      continue;
    }

    added++;
    newArticles.push({
      id,
      title,
      url,
      sourceName: source.name,
      sourceTier: source.tier,
      publishedAt: publishedAt.toISOString(),
      importanceTier: importance.tier,
      importanceScore: importance.score,
      importanceReasons: importance.reasons,
      summary: feedExcerpt,
      tags,
    });
  }

  return { added, skipped, newArticles };
}

export async function runSourceIngest(
  source: WireSource,
  options: {
    fetchItems?: (source: WireSource) => Promise<FeedItem[]>;
    fetchFeed?: (source: WireSource) => Promise<FeedFetchResult>;
    createArticle?: CreateArticle;
    now?: () => Date;
  } = {},
): Promise<SourceIngestResult> {
  const startedAt = Date.now();
  const now = options.now ?? (() => new Date());

  try {
    const fetched = options.fetchFeed
      ? await options.fetchFeed(source)
      : options.fetchItems
        ? {
            items: await options.fetchItems(source),
            status: 200,
            etag: source.feedEtag ?? null,
            lastModified: source.feedLastModified ?? null,
            notModified: false,
            retryAfterMs: null,
          }
        : await fetchSourceFeedDetailed(source);
    const persisted = fetched.notModified
      ? { added: 0, skipped: 0, newArticles: [] as NewWireArticle[] }
      : await persistFeedItems(source, fetched.items, options.createArticle, now());
    return {
      sourceId: source.id,
      sourceName: source.name,
      ...persisted,
      failed: false,
      latencyMs: Date.now() - startedAt,
      httpStatus: fetched.status,
      etag: fetched.etag,
      lastModified: fetched.lastModified,
      notModified: fetched.notModified,
      retryAfterMs: fetched.retryAfterMs,
    };
  } catch (error) {
    return {
      sourceId: source.id,
      sourceName: source.name,
      added: 0,
      skipped: 0,
      failed: true,
      latencyMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : String(error),
      newArticles: [],
      httpStatus: error instanceof FeedHttpError ? error.status : undefined,
      retryAfterMs: error instanceof FeedHttpError ? error.retryAfterMs : undefined,
    };
  }
}

export async function pollSourceAndRecordHealth(source: WireSource): Promise<SourceIngestResult> {
  const fetchedAt = new Date();
  const result = await runSourceIngest(source);
  const completedAt = new Date();
  const failures = result.failed ? (source.consecutiveFailures ?? 0) + 1 : 0;
  const retryDelay = result.retryAfterMs ?? 0;
  const scheduledNext = nextPollAt(source.tier, completedAt, failures);
  const nextFetchAt = retryDelay > 0
    ? new Date(Math.max(scheduledNext.getTime(), completedAt.getTime() + retryDelay))
    : scheduledNext;

  try {
    await prisma.source.update({
      where: { id: source.id },
      data: {
        tier: inferSourceTier(source),
        lastFetchAt: fetchedAt,
        lastSuccessAt: result.failed ? undefined : completedAt,
        lastFailureAt: result.failed ? completedAt : undefined,
        lastLatencyMs: result.latencyMs,
        consecutiveFailures: failures,
        nextFetchAt,
        feedEtag: result.etag === undefined ? undefined : result.etag,
        feedLastModified: result.lastModified === undefined ? undefined : result.lastModified,
        lastHttpStatus: result.httpStatus ?? undefined,
        lastNotModifiedAt: result.notModified ? completedAt : undefined,
        lastRetryAfterMs: result.retryAfterMs ?? null,
      },
    });
  } catch (error) {
    console.error(`[wire] health update failed for ${source.name}:`, error);
  }

  if (result.newArticles.length > 0) {
    await deliverDiscordAlerts(result.newArticles);
  }

  return result;
}
