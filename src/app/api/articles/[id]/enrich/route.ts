import { NextRequest, NextResponse } from "next/server";
import { isClerkServerEnabled } from "@/lib/auth/config";
import { requireSignedIn } from "@/lib/security/api-auth";
import { enrichArticleById } from "@/lib/enrichment/enrichArticle";

export const maxDuration = 15;
export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  if (isClerkServerEnabled()) {
    const identity = await requireSignedIn();
    if (identity instanceof NextResponse) return identity;
  }

  try {
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const result = await enrichArticleById(id, { force: body?.force === true });
    if (!result) return NextResponse.json({ error: "Unknown article" }, { status: 404 });
    return NextResponse.json(result);
  } catch (error) {
    console.error("[api/articles/enrich] error:", error);
    return NextResponse.json({ error: "Article enrichment failed" }, { status: 500 });
  }
}
