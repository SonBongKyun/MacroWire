import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { resolveViewerAccess } from "@/lib/billing/access";
import { isValidQuoteSymbol } from "@/lib/market/quote";
import {
  normalizePortfolioAsset,
  parsePortfolioStore,
  type PortfolioStore,
} from "@/lib/personalization/deskPreferences";

async function context() {
  const access = await resolveViewerAccess();
  if (!access.user) return { access, store: null };
  return {
    access,
    store: parsePortfolioStore(access.user.portfolio, { defaultWhenMissing: true }),
  };
}

function payload(store: PortfolioStore, limit: number, tier: string) {
  return { store, limit, tier };
}

export async function GET() {
  const { access, store } = await context();
  if (!access.user || !store) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(payload(store, access.plan.limits.portfolioSize, access.tier));
}

export async function POST(request: NextRequest) {
  const { access, store } = await context();
  if (!access.user || !store) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({})) as { asset?: unknown };
  const asset = normalizePortfolioAsset(body.asset);
  if (!asset || !isValidQuoteSymbol(asset.symbol)) {
    return NextResponse.json({ error: "Invalid asset" }, { status: 400 });
  }

  if (store.assets.some((item) => item.symbol === asset.symbol)) {
    return NextResponse.json(payload(store, access.plan.limits.portfolioSize, access.tier));
  }
  if (store.assets.length >= access.plan.limits.portfolioSize) {
    return NextResponse.json(
      { error: "LIMIT_REACHED", limit: access.plan.limits.portfolioSize },
      { status: 403 },
    );
  }

  const next: PortfolioStore = {
    assets: [...store.assets, { ...asset, addedAt: new Date().toISOString() }],
  };
  await prisma.user.update({
    where: { id: access.user.id },
    data: { portfolio: next as unknown as Prisma.InputJsonValue },
  });
  return NextResponse.json(payload(next, access.plan.limits.portfolioSize, access.tier));
}

export async function DELETE(request: NextRequest) {
  const { access, store } = await context();
  if (!access.user || !store) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({})) as { symbol?: unknown };
  const symbol = typeof body.symbol === "string" ? body.symbol.trim() : "";
  if (!isValidQuoteSymbol(symbol)) {
    return NextResponse.json({ error: "Invalid symbol" }, { status: 400 });
  }

  const next: PortfolioStore = { assets: store.assets.filter((item) => item.symbol !== symbol) };
  await prisma.user.update({
    where: { id: access.user.id },
    data: { portfolio: next as unknown as Prisma.InputJsonValue },
  });
  return NextResponse.json(payload(next, access.plan.limits.portfolioSize, access.tier));
}
