import assert from "node:assert/strict";
import test from "node:test";
import { prisma } from "../src/lib/db/prisma";
import {
  releaseInsightReservation,
  reserveInsightQuota,
} from "../src/lib/billing/gate";
import { PLANS, tierFromPriceId } from "../src/lib/billing/plans";

async function createQuotaUser(suffix: string) {
  return prisma.user.create({
    data: {
      clerkId: `quota-test-${suffix}-${Date.now()}-${Math.random()}`,
      email: `quota-${suffix}-${Date.now()}-${Math.random()}@example.test`,
    },
  });
}

test("FREE quota admits exactly three concurrent reservations", async () => {
  const user = await createQuotaUser("concurrent");
  try {
    const results = await Promise.all(
      Array.from({ length: 16 }, () => reserveInsightQuota(user, PLANS.free, "ARTICLE")),
    );
    const accepted = results.filter((result) => result.ok);
    const rejected = results.filter((result) => !result.ok);
    assert.equal(accepted.length, 3);
    assert.equal(rejected.length, 13);

    const persisted = await prisma.insightUsage.count({ where: { userId: user.id } });
    assert.equal(persisted, 3);
  } finally {
    await prisma.user.delete({ where: { id: user.id } });
  }
});

test("failed model work can release a reserved usage slot", async () => {
  const user = await createQuotaUser("release");
  try {
    const reservation = await reserveInsightQuota(user, PLANS.free, "ARTICLE");
    assert.equal(reservation.ok, true);
    if (!reservation.ok) return;
    assert.ok(reservation.reservationId);

    await releaseInsightReservation(reservation.reservationId);
    assert.equal(await prisma.insightUsage.count({ where: { userId: user.id } }), 0);
  } finally {
    await prisma.user.delete({ where: { id: user.id } });
  }
});

test("unknown Stripe prices fail closed instead of mapping to FREE", () => {
  const oldPro = process.env.STRIPE_PRICE_PRO;
  const oldElite = process.env.STRIPE_PRICE_ELITE;
  process.env.STRIPE_PRICE_PRO = "price_test_pro";
  process.env.STRIPE_PRICE_ELITE = "price_test_elite";
  try {
    assert.equal(tierFromPriceId("price_test_pro"), "PRO");
    assert.equal(tierFromPriceId("price_test_elite"), "ELITE");
    assert.equal(tierFromPriceId("price_unknown"), null);
    assert.equal(tierFromPriceId(null), null);
  } finally {
    if (oldPro === undefined) delete process.env.STRIPE_PRICE_PRO;
    else process.env.STRIPE_PRICE_PRO = oldPro;
    if (oldElite === undefined) delete process.env.STRIPE_PRICE_ELITE;
    else process.env.STRIPE_PRICE_ELITE = oldElite;
  }
});
