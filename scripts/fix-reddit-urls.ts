import { prisma } from "../src/lib/db/prisma";

const FIXES: Array<{ name: string; newUrl: string }> = [
  { name: "r/wallstreetbets", newUrl: "https://old.reddit.com/r/wallstreetbets/.rss" },
  { name: "r/CryptoCurrency", newUrl: "https://old.reddit.com/r/CryptoCurrency/.rss" },
  { name: "r/StockMarket", newUrl: "https://old.reddit.com/r/StockMarket/.rss" },
];

(async () => {
  for (const f of FIXES) {
    const r = await prisma.source.updateMany({
      where: { name: f.name },
      data: { feedUrl: f.newUrl },
    });
    console.log(`${f.name}: ${r.count} updated`);
  }
  await prisma.$disconnect();
})();
