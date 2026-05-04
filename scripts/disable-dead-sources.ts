import { prisma } from "../src/lib/db/prisma";

const DEAD = [
  "Reuters Business",
  "Reuters Top News",
  "Reuters World",
  "뉴스핌 속보",
  "이데일리 속보",
  "이데일리 경제",
  "머니투데이 속보",
  "머니투데이",
  "조선비즈",
  "코인텔레그래프 KR",
  "한국은행 보도자료",
];

(async () => {
  const r = await prisma.source.updateMany({
    where: { name: { in: DEAD } },
    data: { enabled: false },
  });
  console.log(`disabled ${r.count} sources`);
  await prisma.$disconnect();
})();
