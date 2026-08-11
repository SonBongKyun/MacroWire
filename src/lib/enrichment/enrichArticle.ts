import { Prisma } from "@prisma/client";
import { prisma } from "../db/prisma";
import { findRelatedCoverage } from "../clustering/coverage";
import { classifyNewsImportance } from "../news/importance";
import type { Article, ArticleEnrichmentResult, ContentSource } from "../../types";
import type { WireSourceTier } from "../ingest/sourceTiers";
import {
  deriveWhyItMatters,
  extractEntities,
  extractKeyFacts,
  extractKeyNumbers,
  type KeyFact,
  type KeyNumber,
  type TextEvidence,
} from "./extract";
import { fetchArticleMetadata, type MetadataStatus } from "./metadata";

const ENRICHMENT_TTL_MS = 12 * 60 * 60_000;
const COVERAGE_WINDOW_MS = 6 * 60 * 60_000;
const COVERAGE_LIMIT = 250;

export function isEnrichmentFresh(
  enrichedAt: Date | null | undefined,
  now = new Date(),
  ttlMs = ENRICHMENT_TTL_MS,
): boolean {
  return Boolean(enrichedAt && now.getTime() - enrichedAt.getTime() < ttlMs);
}

function parseStringArray(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : [];
  } catch {
    return [];
  }
}

function asArticle(record: {
  id: string;
  sourceId: string;
  sourceName: string;
  title: string;
  url: string;
  publishedAt: Date;
  summary: string | null;
  feedExcerpt: string | null;
  metaDescription: string | null;
  tags: string;
  importanceTier: string;
  importanceScore: number;
  importanceReasons: string;
  isRead: boolean;
  isSaved: boolean;
  createdAt: Date;
  source: { tier: string };
}): Article {
  return {
    id: record.id,
    sourceId: record.sourceId,
    sourceName: record.sourceName,
    sourceTier: record.source.tier as WireSourceTier,
    title: record.title,
    url: record.url,
    publishedAt: record.publishedAt.toISOString(),
    summary: record.feedExcerpt ?? record.summary,
    feedExcerpt: record.feedExcerpt ?? record.summary,
    metaDescription: record.metaDescription,
    tags: parseStringArray(record.tags),
    importanceTier: record.importanceTier as Article["importanceTier"],
    importanceScore: record.importanceScore,
    importanceReasons: parseStringArray(record.importanceReasons),
    isRead: record.isRead,
    isSaved: record.isSaved,
    createdAt: record.createdAt.toISOString(),
  };
}

function jsonArray<T>(value: Prisma.JsonValue | null | undefined): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function jsonInput(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

export async function enrichArticleById(
  articleId: string,
  options: { force?: boolean; now?: Date } = {},
): Promise<ArticleEnrichmentResult | null> {
  const now = options.now ?? new Date();
  const record = await prisma.article.findUnique({
    where: { id: articleId },
    include: { source: { select: { tier: true } }, enrichment: true },
  });
  if (!record) return null;

  const article = asArticle(record);
  const from = new Date(record.publishedAt.getTime() - COVERAGE_WINDOW_MS);
  const to = new Date(record.publishedAt.getTime() + COVERAGE_WINDOW_MS);
  const candidateRecords = await prisma.article.findMany({
    where: { publishedAt: { gte: from, lte: to } },
    orderBy: { publishedAt: "desc" },
    take: COVERAGE_LIMIT,
    include: { source: { select: { tier: true } } },
  });
  const candidates = candidateRecords.map(asArticle);
  const relatedCoverage = findRelatedCoverage(article, candidates);
  const coverageCount = 1 + relatedCoverage.length;

  const cached = record.enrichment;
  const cacheFresh = cached && isEnrichmentFresh(cached.enrichedAt, now);
  if (cacheFresh && !options.force) {
    return {
      articleId,
      keyFacts: jsonArray<KeyFact>(cached.keyFacts),
      keyNumbers: jsonArray<KeyNumber>(cached.keyNumbers),
      whyItMatters: cached.whyItMatters,
      entities: jsonArray<string>(cached.entities),
      contentSources: jsonArray<ContentSource>(cached.contentSources),
      analysisKind: cached.analysisKind,
      enrichedAt: cached.enrichedAt.toISOString(),
      cached: true,
      metadataStatus: record.metaDescription ? "available" : "missing",
      coverage: {
        count: coverageCount,
        outlets: [article.sourceName, ...relatedCoverage.map((item) => item.sourceName)],
        articles: relatedCoverage,
      },
      importance: {
        tier: article.importanceTier ?? "general",
        score: article.importanceScore ?? 0,
        reasons: article.importanceReasons ?? [],
      },
    };
  }

  let metadataStatus: MetadataStatus = record.metaDescription ? "available" : "missing";
  let metaDescription = record.metaDescription;
  if (!metaDescription) {
    const metadata = await fetchArticleMetadata(record.url);
    metadataStatus = metadata.status;
    metaDescription = metadata.description;
  }

  const sourceTier = article.sourceTier ?? "T2";
  const primaryKind = sourceTier === "T0" ? "official" : "rss";
  const evidence: TextEvidence[] = [];
  if (article.feedExcerpt) {
    evidence.push({ kind: primaryKind, label: article.sourceName, text: article.feedExcerpt, url: article.url });
  }
  if (metaDescription && metaDescription !== article.feedExcerpt) {
    evidence.push({ kind: "metadata", label: `${article.sourceName} page metadata`, text: metaDescription, url: article.url });
  }
  for (const related of relatedCoverage) {
    if (!related.summary) continue;
    evidence.push({
      kind: "coverage",
      label: related.sourceName,
      text: related.summary,
      url: related.url,
    });
  }

  const keyFacts = extractKeyFacts(evidence);
  const keyNumbers = extractKeyNumbers(evidence);
  const entities = extractEntities(article.title, evidence);
  const whyItMatters = deriveWhyItMatters({
    title: article.title,
    summary: article.feedExcerpt ?? null,
    tags: article.tags,
    sourceName: article.sourceName,
  });
  const importance = classifyNewsImportance({
    title: article.title,
    summary: article.feedExcerpt,
    tags: article.tags,
    sourceName: article.sourceName,
    sourceTier,
    publishedAt: article.publishedAt,
    coverageCount,
  }, now.getTime());

  const contentSources: ContentSource[] = [];
  if (article.feedExcerpt) {
    contentSources.push({ kind: primaryKind, label: article.sourceName, url: article.url });
  }
  if (metaDescription) {
    contentSources.push({ kind: "metadata", label: `${article.sourceName} page metadata`, url: article.url });
  }
  for (const related of relatedCoverage) {
    contentSources.push({ kind: "coverage", label: related.sourceName, url: related.url });
  }
  if (whyItMatters) contentSources.push({ kind: "rules", label: "MacroWire rule-based signal analysis" });

  await prisma.$transaction([
    prisma.article.update({
      where: { id: articleId },
      data: {
        feedExcerpt: article.feedExcerpt,
        metaDescription,
        importanceTier: importance.tier,
        importanceScore: importance.score,
        importanceReasons: JSON.stringify(importance.reasons),
      },
    }),
    prisma.articleEnrichment.upsert({
      where: { articleId },
      create: {
        articleId,
        keyFacts: jsonInput(keyFacts),
        keyNumbers: jsonInput(keyNumbers),
        whyItMatters,
        entities: jsonInput(entities),
        contentSources: jsonInput(contentSources),
        analysisKind: whyItMatters ? "rules" : null,
        enrichedAt: now,
      },
      update: {
        keyFacts: jsonInput(keyFacts),
        keyNumbers: jsonInput(keyNumbers),
        whyItMatters,
        entities: jsonInput(entities),
        contentSources: jsonInput(contentSources),
        analysisKind: whyItMatters ? "rules" : null,
        enrichedAt: now,
      },
    }),
  ]);

  return {
    articleId,
    keyFacts,
    keyNumbers,
    whyItMatters,
    entities,
    contentSources,
    analysisKind: whyItMatters ? "rules" : null,
    enrichedAt: now.toISOString(),
    cached: false,
    metadataStatus,
    coverage: {
      count: coverageCount,
      outlets: [article.sourceName, ...relatedCoverage.map((item) => item.sourceName)],
      articles: relatedCoverage,
    },
    importance,
  };
}
