export interface Source {
  id: string;
  name: string;
  feedUrl: string;
  enabled: boolean;
  category: string;
  tier?: "T0" | "T1" | "T2" | "T3";
  lastFetchAt?: string | null;
  lastSuccessAt?: string | null;
  lastFailureAt?: string | null;
  lastLatencyMs?: number | null;
  consecutiveFailures?: number;
  nextFetchAt?: string | null;
  createdAt: string;
  _count?: { articles: number };
}

export interface Article {
  id: string;
  sourceId: string;
  sourceName: string;
  sourceTier?: "T0" | "T1" | "T2" | "T3";
  title: string;
  url: string;
  publishedAt: string;
  summary: string | null;
  feedExcerpt?: string | null;
  metaDescription?: string | null;
  tags: string[];
  importanceTier?: "critical" | "major" | "general";
  importanceScore?: number;
  importanceReasons?: string[];
  isRead: boolean;
  isSaved: boolean;
  createdAt: string;
}

export interface ContentSource {
  kind: "official" | "rss" | "metadata" | "coverage" | "rules";
  label: string;
  url?: string;
}

export interface EnrichmentKeyFact {
  text: string;
  sourceKind: "official" | "rss" | "metadata" | "coverage";
  sourceLabel: string;
}

export interface EnrichmentKeyNumber {
  label: string;
  value: string;
  context: string;
  sourceLabel: string;
}

export interface ArticleEnrichmentResult {
  articleId: string;
  keyFacts: EnrichmentKeyFact[];
  keyNumbers: EnrichmentKeyNumber[];
  whyItMatters: string | null;
  entities: string[];
  contentSources: ContentSource[];
  analysisKind: string | null;
  enrichedAt: string;
  cached: boolean;
  metadataStatus: "available" | "missing" | "blocked" | "unavailable";
  coverage: {
    count: number;
    outlets: string[];
    articles: Array<{
      id: string;
      sourceName: string;
      title: string;
      url: string;
      publishedAt: string;
      summary: string | null;
      tags: string[];
    }>;
  };
  importance: {
    tier: "critical" | "major" | "general";
    score: number;
    reasons: string[];
  };
}

export interface ArticlesResponse {
  data: Article[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface IngestResult {
  added: number;
  skipped: number;
  failedSources: string[];
  lastUpdated: string;
}
