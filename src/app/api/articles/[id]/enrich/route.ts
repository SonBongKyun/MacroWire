import { NextRequest, NextResponse } from "next/server";
import { isClerkServerEnabled } from "@/lib/auth/config";
import { requireSignedIn, verifyOwnerSecret } from "@/lib/security/api-auth";
import { enrichArticleById } from "@/lib/enrichment/enrichArticle";

export const maxDuration = 15;
export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const body = await request.json().catch(() => ({})) as { force?: boolean };
  const force = body.force === true;

  if (isClerkServerEnabled()) {
    const identity = await requireSignedIn();
    if (identity instanceof NextResponse) return identity;
  } else if (force) {
    // The personal/self-hosted desk may lazily enrich without Clerk, but a
    // cache-bypassing force request is an administrative operation because it
    // causes outbound fetches and DB writes on every call.
    const ownerStatus = verifyOwnerSecret(request.headers);
    if (ownerStatus === "unconfigured") {
      return NextResponse.json({ error: "OWNER_AUTH_NOT_CONFIGURED" }, { status: 503 });
    }
    if (ownerStatus !== "authorized") {
      return NextResponse.json({ error: "OWNER_AUTH_REQUIRED" }, { status: 401 });
    }
  }

  try {
    const { id } = await context.params;
    const result = await enrichArticleById(id, { force });
    if (!result) return NextResponse.json({ error: "Unknown article" }, { status: 404 });
    return NextResponse.json(result);
  } catch (error) {
    console.error("[api/articles/enrich] error:", error);
    return NextResponse.json({ error: "Article enrichment failed" }, { status: 500 });
  }
}
