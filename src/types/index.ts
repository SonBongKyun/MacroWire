export interface Source {
  id: string;
  name: string;
  feedUrl: string;
  enabled: boolean;
  category: string;
  createdAt: string;
  _count?: { articles: number };
}

export interface Article {
  id: string;
  sourceId: string;
  sourceName: string;
  title: string;
  url: string;
  publishedAt: string;
  summary: string | null;
  tags: string[];
  isRead: boolean;
  isSaved: boolean;
  createdAt: string;
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

// AI Insight types
export interface ArticleInsight {
  keyPoints: string[];
  marketImpact: string;
  context: string;
}

export interface ClusterInsight {
  synthesis: string;
  mediaTones: { source: string; tone: string }[];
  consensus: string;
  divergence: string;
  outlook: string;
}

export interface ConnectionChain {
  nodes: string[];
  relations: string[];
  narrative: string;
}

export interface ConnectionsInsight {
  chains: ConnectionChain[];
  summary: string;
}
