import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { isClerkServerEnabled } from "@/lib/auth/config";

function configuredAdminIds(): Set<string> {
  return new Set(
    (process.env.ADMIN_CLERK_IDS ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
  );
}

export async function requireSignedIn(): Promise<string | NextResponse> {
  if (!isClerkServerEnabled()) {
    return NextResponse.json({ error: "Authentication is not configured" }, { status: 503 });
  }
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return userId;
}

export async function requireAdmin(): Promise<string | NextResponse> {
  const identity = await requireSignedIn();
  if (identity instanceof NextResponse) return identity;

  const adminIds = configuredAdminIds();
  if (adminIds.size === 0) {
    return NextResponse.json(
      { error: "Admin access is not configured" },
      { status: 503 }
    );
  }
  if (!adminIds.has(identity)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return identity;
}
