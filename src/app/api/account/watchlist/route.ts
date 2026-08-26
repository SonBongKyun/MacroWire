import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { resolveViewerAccess } from "@/lib/billing/access";
import {
  normalizeWatchlistKeyword,
  parseWatchlistStore,
  type WatchlistStore,
} from "@/lib/personalization/deskPreferences";

async function context() {
  const access = await resolveViewerAccess();
  if (!access.user) return { access, store: null };
  return { access, store: parseWatchlistStore(access.user.watchlist) };
}

function payload(store: WatchlistStore, limit: number, tier: string) {
  return { store, limit, tier };
}

export async function GET() {
  const { access, store } = await context();
  if (!access.user || !store) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(payload(store, access.plan.limits.watchlistSize, access.tier));
}

export async function POST(request: NextRequest) {
  const { access, store } = await context();
  if (!access.user || !store) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({})) as { keyword?: unknown };
  const keyword = normalizeWatchlistKeyword(body.keyword);
  if (!keyword) return NextResponse.json({ error: "Invalid keyword" }, { status: 400 });

  if (store.items.some((item) => item.keyword === keyword)) {
    return NextResponse.json(payload(store, access.plan.limits.watchlistSize, access.tier));
  }
  if (store.items.length >= access.plan.limits.watchlistSize) {
    return NextResponse.json(
      { error: "LIMIT_REACHED", limit: access.plan.limits.watchlistSize },
      { status: 403 },
    );
  }

  const next: WatchlistStore = {
    items: [...store.items, { keyword, createdAt: new Date().toISOString() }],
  };
  await prisma.user.update({
    where: { id: access.user.id },
    data: { watchlist: next as unknown as Prisma.InputJsonValue },
  });
  return NextResponse.json(payload(next, access.plan.limits.watchlistSize, access.tier));
}

export async function DELETE(request: NextRequest) {
  const { access, store } = await context();
  if (!access.user || !store) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({})) as { keyword?: unknown };
  const keyword = normalizeWatchlistKeyword(body.keyword);
  if (!keyword) return NextResponse.json({ error: "Invalid keyword" }, { status: 400 });

  const next: WatchlistStore = { items: store.items.filter((item) => item.keyword !== keyword) };
  await prisma.user.update({
    where: { id: access.user.id },
    data: { watchlist: next as unknown as Prisma.InputJsonValue },
  });
  return NextResponse.json(payload(next, access.plan.limits.watchlistSize, access.tier));
}
