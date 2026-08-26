import { prisma } from "@/lib/db/prisma";
import { summarizeWorkerHealth } from "@/lib/ingest/workerHealth";

export type HealthLevel = "healthy" | "degraded" | "stale" | "unconfigured";

export interface PublicHealthSnapshot {
  status: HealthLevel;
  database: "ok" | "error";
  wire: {
    status: HealthLevel;
    sourceCount: number;
    healthySources: number;
    latestArticleAt: string | null;
    latestArticleAgeSeconds: number | null;
  };
  checkedAt: string;
}

export interface InternalHealthSnapshot extends PublicHealthSnapshot {
  wire: PublicHealthSnapshot["wire"] & {
    staleSources: string[];
    failedSources: string[];
    sourceFailures: Array<{
      name: string;
      tier: string;
      consecutiveFailures: number;
      lastHttpStatus: number | null;
      lastLatencyMs: number | null;
      lastSuccessAt: string | null;
    }>;
  };
  integrations: Record<"openrouter" | "stripe" | "resend" | "cron" | "clerk" | "discord", boolean>;
  databaseStats: {
    articleCount: number;
    eventCount: number;
    unlinkedRecentArticles: number;
    slowQueries: Array<{ calls: number; meanMs: number; totalMs: number; query: string }>;
  };
}

function integrationStatus() {
  return {
    openrouter: Boolean(process.env.OPENROUTER_API_KEY),
    stripe: Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET),
    resend: Boolean(process.env.RESEND_API_KEY),
    cron: Boolean(process.env.CRON_SECRET),
    clerk: Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY),
    discord: Boolean(process.env.DISCORD_WEBHOOK_URL),
  };
}

function worstStatus(database: "ok" | "error", wire: HealthLevel): HealthLevel {
  if (database === "error") return "stale";
  if (wire === "stale" || wire === "unconfigured") return wire;
  return wire === "degraded" ? "degraded" : "healthy";
}

export async function getPublicHealth(now = new Date()): Promise<PublicHealthSnapshot> {
  let database: "ok" | "error" = "ok";
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    database = "error";
  }

  let sources: Array<{
    name: string;
    tier: "T0" | "T1" | "T2" | "T3";
    lastSuccessAt: Date | null;
    lastFailureAt: Date | null;
    consecutiveFailures: number;
    lastLatencyMs: number | null;
  }> = [];
  let latestArticleAt: Date | null = null;
  if (database === "ok") {
    [sources, latestArticleAt] = await Promise.all([
      prisma.source.findMany({
        where: { enabled: true },
        select: {
          name: true,
          tier: true,
          lastSuccessAt: true,
          lastFailureAt: true,
          consecutiveFailures: true,
          lastLatencyMs: true,
        },
      }),
      prisma.article.findFirst({ orderBy: { publishedAt: "desc" }, select: { publishedAt: true } })
        .then((row) => row?.publishedAt ?? null),
    ]);
  }
  const worker = summarizeWorkerHealth(sources, now);
  const latestArticleAgeSeconds = latestArticleAt
    ? Math.max(0, Math.round((now.getTime() - latestArticleAt.getTime()) / 1_000))
    : null;

  return {
    status: worstStatus(database, worker.status),
    database,
    wire: {
      status: worker.status,
      sourceCount: worker.sourceCount,
      healthySources: worker.healthySources,
      latestArticleAt: latestArticleAt?.toISOString() ?? null,
      latestArticleAgeSeconds,
    },
    checkedAt: now.toISOString(),
  };
}

export async function getInternalHealth(now = new Date()): Promise<InternalHealthSnapshot> {
  const base = await getPublicHealth(now);
  const sources = await prisma.source.findMany({
    where: { enabled: true },
    select: {
      name: true,
      tier: true,
      lastSuccessAt: true,
      lastFailureAt: true,
      consecutiveFailures: true,
      lastLatencyMs: true,
      lastHttpStatus: true,
    },
  });
  const worker = summarizeWorkerHealth(sources, now);
  const since = new Date(now.getTime() - 48 * 60 * 60_000);
  const [articleCount, eventCount, unlinkedRecentArticles] = await Promise.all([
    prisma.article.count(),
    prisma.event.count(),
    prisma.article.count({ where: { publishedAt: { gte: since }, eventLinks: { none: {} } } }),
  ]);

  let slowQueries: InternalHealthSnapshot["databaseStats"]["slowQueries"] = [];
  try {
    const rows = await prisma.$queryRaw<Array<{
      calls: bigint;
      mean_exec_time: number;
      total_exec_time: number;
      query: string;
    }>>`
      SELECT calls, mean_exec_time, total_exec_time, LEFT(query, 240) AS query
      FROM pg_stat_statements
      WHERE query NOT ILIKE 'CREATE %'
        AND query NOT ILIKE '%pg_catalog%'
        AND query NOT ILIKE '%pg_stat_statements%'
      ORDER BY total_exec_time DESC
      LIMIT 10
    `;
    slowQueries = rows.map((row) => ({
      calls: Number(row.calls),
      meanMs: Number(row.mean_exec_time.toFixed(2)),
      totalMs: Number(row.total_exec_time.toFixed(2)),
      query: row.query.replace(/\s+/g, " ").trim(),
    }));
  } catch (error) {
    console.warn("[health] pg_stat_statements unavailable", error);
  }

  return {
    ...base,
    wire: {
      ...base.wire,
      staleSources: worker.staleSources,
      failedSources: worker.failedSources,
      sourceFailures: sources
        .filter((source) => source.consecutiveFailures > 0)
        .sort((a, b) => b.consecutiveFailures - a.consecutiveFailures)
        .slice(0, 20)
        .map((source) => ({
          name: source.name,
          tier: source.tier,
          consecutiveFailures: source.consecutiveFailures,
          lastHttpStatus: source.lastHttpStatus,
          lastLatencyMs: source.lastLatencyMs,
          lastSuccessAt: source.lastSuccessAt?.toISOString() ?? null,
        })),
    },
    integrations: integrationStatus(),
    databaseStats: { articleCount, eventCount, unlinkedRecentArticles, slowQueries },
  };
}
