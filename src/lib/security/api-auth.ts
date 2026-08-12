import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { isClerkServerEnabled } from "@/lib/auth/config";
import { timingSafeEqual } from "node:crypto";

export type OwnerSecretStatus = "authorized" | "unconfigured" | "invalid";

export function verifyOwnerSecret(
  headers: Headers,
  env: Record<string, string | undefined> = process.env,
): OwnerSecretStatus {
  const expected = env.MACROWIRE_OWNER_SECRET?.trim();
  if (!expected) return "unconfigured";
  const bearer = headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  const supplied = headers.get("x-macrowire-owner-secret")?.trim() || bearer;
  if (!supplied) return "invalid";
  const expectedBytes = Buffer.from(expected);
  const suppliedBytes = Buffer.from(supplied);
  if (expectedBytes.length !== suppliedBytes.length) return "invalid";
  return timingSafeEqual(expectedBytes, suppliedBytes) ? "authorized" : "invalid";
}

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
