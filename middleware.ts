import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

// Routes that ALWAYS require sign-in.
const isProtected = createRouteMatcher([
  "/account(.*)",
  "/api/account(.*)",
  "/api/billing(.*)",
  "/api/insights(.*)",
  "/api/articles/:id/read",
  "/api/articles/:id/save",
  "/api/articles/batch-read",
  "/api/articles/batch-save",
  "/api/webhook",
  // The open app drives its own breaking refresh; sign-in keeps that off a
  // public URL. See src/app/api/live/pulse/route.ts.
  "/api/live/pulse",
]);

// Routes that bypass Clerk entirely (cron, webhooks).
const isCronOrWebhook = createRouteMatcher([
  "/api/ingest(.*)",
  "/api/insights/daily-recap/cron",
  "/api/email/digest",
  "/api/stripe/webhook",
  "/api/clerk/webhook",
]);

const clerkHandler = clerkMiddleware(async (auth, req) => {
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

const clerkConfigured = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY
);

export default clerkConfigured
  ? clerkHandler
  : function authenticationDisabled(req: NextRequest) {
      if (isCronOrWebhook(req)) return NextResponse.next();
      if (isProtected(req)) {
        if (req.nextUrl.pathname.startsWith("/api/")) {
          return NextResponse.json(
            { error: "Authentication is not configured" },
            { status: 503 }
          );
        }
        return NextResponse.redirect(new URL("/app", req.url));
      }
      return NextResponse.next();
    };

export const config = {
  matcher: [
    // Skip static + _next + favicon.
    "/((?!_next|.*\\..*).*)",
    "/(api|trpc)(.*)",
  ],
};
