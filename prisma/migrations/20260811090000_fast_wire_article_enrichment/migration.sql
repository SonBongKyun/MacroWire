-- Fast Wire source scheduling and health. All additions are nullable or have
-- defaults so the existing production rows remain valid.
CREATE TYPE "SourceTier" AS ENUM ('T0', 'T1', 'T2', 'T3');

ALTER TABLE "Source"
ADD COLUMN "tier" "SourceTier" NOT NULL DEFAULT 'T2',
ADD COLUMN "lastFetchAt" TIMESTAMP(3),
ADD COLUMN "lastSuccessAt" TIMESTAMP(3),
ADD COLUMN "lastFailureAt" TIMESTAMP(3),
ADD COLUMN "lastLatencyMs" INTEGER,
ADD COLUMN "consecutiveFailures" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "nextFetchAt" TIMESTAMP(3);

-- Preserve every existing RSS excerpt. `summary` remains as a compatibility
-- alias while new code writes and reads the explicit field.
ALTER TABLE "Article"
ADD COLUMN "feedExcerpt" TEXT,
ADD COLUMN "metaDescription" TEXT,
ADD COLUMN "importanceTier" TEXT NOT NULL DEFAULT 'general',
ADD COLUMN "importanceScore" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "importanceReasons" TEXT NOT NULL DEFAULT '[]';

UPDATE "Article"
SET "feedExcerpt" = "summary"
WHERE "feedExcerpt" IS NULL AND "summary" IS NOT NULL;

CREATE TABLE "ArticleEnrichment" (
  "articleId" TEXT NOT NULL,
  "keyFacts" JSONB NOT NULL,
  "keyNumbers" JSONB NOT NULL,
  "whyItMatters" TEXT,
  "entities" JSONB NOT NULL,
  "contentSources" JSONB NOT NULL,
  "analysisKind" TEXT,
  "enrichedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ArticleEnrichment_pkey" PRIMARY KEY ("articleId")
);

ALTER TABLE "ArticleEnrichment"
ADD CONSTRAINT "ArticleEnrichment_articleId_fkey"
FOREIGN KEY ("articleId") REFERENCES "Article"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "Source_enabled_tier_nextFetchAt_idx"
ON "Source"("enabled", "tier", "nextFetchAt");

CREATE INDEX "Article_importanceTier_publishedAt_idx"
ON "Article"("importanceTier", "publishedAt");

CREATE INDEX "ArticleEnrichment_enrichedAt_idx"
ON "ArticleEnrichment"("enrichedAt");
