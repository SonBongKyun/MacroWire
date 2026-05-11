import crypto from "crypto";
import { prisma } from "@/lib/db/prisma";
import type { Insight, InsightKind } from "@prisma/client";

/**
 * Persistent insight cache. We hash the input (article ids, locale, tier-or-model,
 * and a version tag) so changing the prompt invalidates everything cleanly.
 */
const PROMPT_VERSION = "v1";

export function cacheKey(parts: Record<string, unknown>): string {
  const canonical = JSON.stringify(sortKeys({ ...parts, PROMPT_VERSION }));
  return crypto.createHash("sha256").update(canonical).digest("hex").slice(0, 32);
}

function sortKeys(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(sortKeys);
  if (obj && typeof obj === "object") {
    const sorted: Record<string, unknown> = {};
    for (const k of Object.keys(obj as Record<string, unknown>).sort()) {
      sorted[k] = sortKeys((obj as Record<string, unknown>)[k]);
    }
    return sorted;
  }
  return obj;
}

export async function getCachedInsight(key: string): Promise<Insight | null> {
  const row = await prisma.insight.findUnique({ where: { cacheKey: key } });
  if (!row) return null;
  if (row.expiresAt.getTime() < Date.now()) return null;
  return row;
}

export async function setCachedInsight(opts: {
  key: string;
  kind: InsightKind;
  locale: string;
  payload: unknown;
  ttlSeconds: number;
}): Promise<Insight> {
  const expiresAt = new Date(Date.now() + opts.ttlSeconds * 1000);
  return prisma.insight.upsert({
    where: { cacheKey: opts.key },
    update: { kind: opts.kind, locale: opts.locale, payload: opts.payload as never, expiresAt },
    create: {
      cacheKey: opts.key,
      kind: opts.kind,
      locale: opts.locale,
      payload: opts.payload as never,
      expiresAt,
    },
  });
}
