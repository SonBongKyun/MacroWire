import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { enrichArticleById } from "@/lib/enrichment/enrichArticle";

/**
 * Backward-compatible extract-key-facts endpoint.
 *
 * This is intentionally not labelled an AI summary: it returns only facts
 * extracted from RSS excerpts, public page metadata and related coverage.
 */
export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();
    if (typeof url !== "string" || !url) {
      return NextResponse.json({ error: "Missing URL" }, { status: 400 });
    }

    const article = await prisma.article.findUnique({ where: { url }, select: { id: true } });
    if (!article) return NextResponse.json({ error: "Unknown article" }, { status: 404 });

    const enrichment = await enrichArticleById(article.id);
    if (!enrichment) return NextResponse.json({ error: "Unknown article" }, { status: 404 });

    return NextResponse.json({
      keyPoints: enrichment.keyFacts.map((fact) => fact.text),
      source: enrichment.contentSources.map((source) => source.kind),
      generatedAt: enrichment.enrichedAt,
      mode: "extract-key-facts",
    }, {
      headers: { Deprecation: "true", Link: `</api/articles/${article.id}/enrich>; rel=successor-version` },
    });
  } catch (error) {
    console.error("[api/summarize] error:", error);
    return NextResponse.json({ error: "Key-fact extraction failed" }, { status: 500 });
  }
}
