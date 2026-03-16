-- CreateTable
CREATE TABLE "Insight" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "Insight_targetId_idx" ON "Insight"("targetId");

-- CreateIndex
CREATE INDEX "Insight_type_idx" ON "Insight"("type");

-- CreateIndex
CREATE UNIQUE INDEX "Insight_type_targetId_key" ON "Insight"("type", "targetId");
