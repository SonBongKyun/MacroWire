-- Repair migration for a historical production-only migration that was applied
-- to Neon as 20260511120524_add_users_subscriptions_insights but was never
-- committed to the repository. Do NOT recreate that historical migration name:
-- production already records its checksum. This migration is intentionally
-- idempotent so both production and a fresh database converge on the current
-- Prisma schema.

DO $$
BEGIN
  CREATE TYPE "Tier" AS ENUM ('FREE', 'PRO', 'ELITE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "SubStatus" AS ENUM ('ACTIVE', 'TRIALING', 'PAST_DUE', 'CANCELED', 'INCOMPLETE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "InsightKind" AS ENUM ('ARTICLE', 'CLUSTER', 'CONNECTIONS', 'DAILY_RECAP', 'PERSONAL_BRIEFING');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "User" (
  "id" TEXT NOT NULL,
  "clerkId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "name" TEXT,
  "tier" "Tier" NOT NULL DEFAULT 'FREE',
  "locale" TEXT NOT NULL DEFAULT 'ko',
  "referralCode" TEXT NOT NULL,
  "referredBy" TEXT,
  "referralBonusUntil" TIMESTAMP(3),
  "watchlist" JSONB,
  "portfolio" JSONB,
  "digestEmail" BOOLEAN NOT NULL DEFAULT true,
  "digestHour" INTEGER NOT NULL DEFAULT 8,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Subscription" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "stripeCustomerId" TEXT NOT NULL,
  "stripeSubscriptionId" TEXT NOT NULL,
  "stripePriceId" TEXT NOT NULL,
  "status" "SubStatus" NOT NULL,
  "currentPeriodStart" TIMESTAMP(3) NOT NULL,
  "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
  "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Insight" (
  "id" TEXT NOT NULL,
  "kind" "InsightKind" NOT NULL,
  "cacheKey" TEXT NOT NULL,
  "locale" TEXT NOT NULL DEFAULT 'ko',
  "payload" JSONB NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Insight_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "InsightUsage" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "kind" "InsightKind" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InsightUsage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ReadState" (
  "userId" TEXT NOT NULL,
  "articleId" TEXT NOT NULL,
  "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReadState_pkey" PRIMARY KEY ("userId", "articleId")
);

CREATE TABLE IF NOT EXISTS "SavedArticle" (
  "userId" TEXT NOT NULL,
  "articleId" TEXT NOT NULL,
  "savedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "note" TEXT,
  CONSTRAINT "SavedArticle_pkey" PRIMARY KEY ("userId", "articleId")
);

CREATE TABLE IF NOT EXISTS "DailyRecap" (
  "id" TEXT NOT NULL,
  "date" TEXT NOT NULL,
  "locale" TEXT NOT NULL,
  "headline" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "topStories" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DailyRecap_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "User_clerkId_key" ON "User"("clerkId");
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "User_referralCode_key" ON "User"("referralCode");

CREATE UNIQUE INDEX IF NOT EXISTS "Subscription_userId_key" ON "Subscription"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "Subscription_stripeCustomerId_key" ON "Subscription"("stripeCustomerId");
CREATE UNIQUE INDEX IF NOT EXISTS "Subscription_stripeSubscriptionId_key" ON "Subscription"("stripeSubscriptionId");

CREATE UNIQUE INDEX IF NOT EXISTS "Insight_cacheKey_key" ON "Insight"("cacheKey");
CREATE INDEX IF NOT EXISTS "Insight_cacheKey_idx" ON "Insight"("cacheKey");
CREATE INDEX IF NOT EXISTS "Insight_expiresAt_idx" ON "Insight"("expiresAt");
CREATE INDEX IF NOT EXISTS "Insight_kind_idx" ON "Insight"("kind");

CREATE INDEX IF NOT EXISTS "InsightUsage_userId_createdAt_idx" ON "InsightUsage"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "InsightUsage_userId_kind_createdAt_idx" ON "InsightUsage"("userId", "kind", "createdAt");

CREATE INDEX IF NOT EXISTS "ReadState_userId_readAt_idx" ON "ReadState"("userId", "readAt");
CREATE INDEX IF NOT EXISTS "ReadState_articleId_idx" ON "ReadState"("articleId");
CREATE INDEX IF NOT EXISTS "SavedArticle_userId_savedAt_idx" ON "SavedArticle"("userId", "savedAt");
CREATE INDEX IF NOT EXISTS "SavedArticle_articleId_idx" ON "SavedArticle"("articleId");

CREATE UNIQUE INDEX IF NOT EXISTS "DailyRecap_date_locale_key" ON "DailyRecap"("date", "locale");
CREATE INDEX IF NOT EXISTS "DailyRecap_date_idx" ON "DailyRecap"("date");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Subscription_userId_fkey') THEN
    ALTER TABLE "Subscription"
      ADD CONSTRAINT "Subscription_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InsightUsage_userId_fkey') THEN
    ALTER TABLE "InsightUsage"
      ADD CONSTRAINT "InsightUsage_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ReadState_userId_fkey') THEN
    ALTER TABLE "ReadState"
      ADD CONSTRAINT "ReadState_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SavedArticle_userId_fkey') THEN
    ALTER TABLE "SavedArticle"
      ADD CONSTRAINT "SavedArticle_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ReadState_articleId_fkey') THEN
    ALTER TABLE "ReadState"
      ADD CONSTRAINT "ReadState_articleId_fkey"
      FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SavedArticle_articleId_fkey') THEN
    ALTER TABLE "SavedArticle"
      ADD CONSTRAINT "SavedArticle_articleId_fkey"
      FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
