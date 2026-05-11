import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Routes that ALWAYS require sign-in.
const isProtected = createRouteMatcher([
  "/account(.*)",
  "/api/account(.*)",
  "/api/billing(.*)",
  "/api/insights(.*)",
  "/api/articles/:id/save",
  "/api/articles/batch-save",
]);

// Routes that bypass Clerk entirely (cron, webhooks).
const isCronOrWebhook = createRouteMatcher([
  "/api/ingest(.*)",
  "/api/stripe/webhook",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isCronOrWebhook(req)) return NextResponse.next();

  if (isProtected(req)) {
    const { userId } = await auth();
    if (!userId) {
      // For API routes return 401; for pages redirect to sign-in.
      if (req.nextUrl.pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const signIn = new URL("/sign-in", req.url);
      signIn.searchParams.set("redirect_url", req.nextUrl.pathname);
      return NextResponse.redirect(signIn);
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip static + _next + favicon.
    "/((?!_next|.*\\..*).*)",
    "/(api|trpc)(.*)",
  ],
};
