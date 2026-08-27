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
  feedEtag?: string | null;
  feedLastModified?: string | null;
  lastHttpStatus?: number | null;
  lastNotModifiedAt?: string | null;
  lastRetryAfterMs?: number | null;
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
  eventId?: string | null;
  eventCoverage?: number;
  eventImportanceScore?: number;
  eventPrimarySource?: string | null;
  eventOfficialSource?: string | null;
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
  access?: {
    tier: "FREE" | "PRO" | "ELITE";
    requestedRange: "24h" | "7d" | "30d";
    effectiveRange: "24h" | "7d" | "30d";
    rangeRestricted: boolean;
    sourceScope: "core" | "all";
    managedSubscriptions: boolean;
  };
}

export type MarketImpactDirection = "up" | "down" | "mixed" | "watch";
export type MarketImpactChannel = "rates" | "fx" | "equities" | "energy" | "crypto" | "macro";

export interface WireEventMarketImpact {
  channel: MarketImpactChannel;
  label: string;
  direction: MarketImpactDirection;
  score: number;
  rationale: string;
}

export interface WireEventArticle {
  id: string;
  title: string;
  url: string;
  sourceName: string;
  publishedAt: string;
  importanceScore: number;
  importanceTier: string;
  sourceTier: "T0" | "T1" | "T2" | "T3";
  similarityScore: number | null;
  isPrimary: boolean;
  excerpt: string | null;
}

export interface WireEvent {
  id: string;
  eventKey: string;
  title: string;
  firstSeenAt: string;
  lastSeenAt: string;
  latestPublishedAt: string;
  importanceTier: "critical" | "major" | "general";
  importanceScore: number;
  coverageCount: number;
  primarySourceName: string | null;
  officialSourceName: string | null;
  tags: string[];
  regions: string[];
  marketChannels: string[];
  deskScore: number;
  deskTier: "critical" | "major" | "general";
  importanceReasons: string[];
  shortExplanation: string;
  marketImpacts: WireEventMarketImpact[];
  confidence: "high" | "medium" | "low";
  distinctSources: number;
  evidenceCount: number;
  articles: WireEventArticle[];
}

export interface EventsResponse {
  data: WireEvent[];
  generatedAt?: string;
  access?: {
    tier: "FREE" | "PRO" | "ELITE";
    requestedRange: "24h" | "7d" | "30d";
    effectiveRange: "24h" | "7d" | "30d";
    rangeRestricted: boolean;
  };
}

export interface IngestResult {
  added: number;
  skipped: number;
  failedSources: string[];
  lastUpdated: string;
}
