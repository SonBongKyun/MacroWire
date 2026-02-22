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
