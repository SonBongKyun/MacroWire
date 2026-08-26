-- Production V2: observability, conditional feed caching, event graph, and search support.
-- All DDL is additive so it is safe for a live deployment.

CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

ALTER TABLE "Source"
  ADD COLUMN IF NOT EXISTS "feedEtag" TEXT,
  ADD COLUMN IF NOT EXISTS "feedLastModified" TEXT,
  ADD COLUMN IF NOT EXISTS "lastHttpStatus" INTEGER,
  ADD COLUMN IF NOT EXISTS "lastNotModifiedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "lastRetryAfterMs" INTEGER;

CREATE TABLE IF NOT EXISTS "Event" (
  "id" TEXT NOT NULL,
  "eventKey" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "firstSeenAt" TIMESTAMP(3) NOT NULL,
  "lastSeenAt" TIMESTAMP(3) NOT NULL,
  "latestPublishedAt" TIMESTAMP(3) NOT NULL,
  "importanceTier" TEXT NOT NULL DEFAULT 'general',
  "importanceScore" INTEGER NOT NULL DEFAULT 0,
  "coverageCount" INTEGER NOT NULL DEFAULT 1,
  "primarySourceName" TEXT,
  "officialSourceName" TEXT,
  "tags" TEXT NOT NULL DEFAULT '[]',
  "regions" TEXT NOT NULL DEFAULT '[]',
  "marketChannels" TEXT NOT NULL DEFAULT '[]',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "EventArticle" (
  "eventId" TEXT NOT NULL,
  "articleId" TEXT NOT NULL,
  "sourceName" TEXT NOT NULL,
  "publishedAt" TIMESTAMP(3) NOT NULL,
  "similarityScore" DOUBLE PRECISION,
  "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "EventArticle_pkey" PRIMARY KEY ("eventId", "articleId")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Event_eventKey_key" ON "Event"("eventKey");
CREATE INDEX IF NOT EXISTS "Event_latestPublishedAt_idx" ON "Event"("latestPublishedAt" DESC);
CREATE INDEX IF NOT EXISTS "Event_importanceScore_latestPublishedAt_idx"
  ON "Event"("importanceScore" DESC, "latestPublishedAt" DESC);
CREATE UNIQUE INDEX IF NOT EXISTS "EventArticle_articleId_key" ON "EventArticle"("articleId");
CREATE INDEX IF NOT EXISTS "EventArticle_publishedAt_idx" ON "EventArticle"("publishedAt" DESC);

DO $$ BEGIN
  ALTER TABLE "EventArticle"
    ADD CONSTRAINT "EventArticle_eventId_fkey"
    FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "EventArticle"
    ADD CONSTRAINT "EventArticle_articleId_fkey"
    FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Trigram indexes support the article API's case-insensitive contains filters.
CREATE INDEX IF NOT EXISTS "Article_title_trgm_idx"
  ON "Article" USING GIN ("title" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Article_feedExcerpt_trgm_idx"
  ON "Article" USING GIN ("feedExcerpt" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Article_sourceName_trgm_idx"
  ON "Article" USING GIN ("sourceName" gin_trgm_ops);
