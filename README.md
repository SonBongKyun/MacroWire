# MacroWire

개인용 매크로 뉴스 와이어 웹앱. 공개 RSS 피드를 GitHub Actions로 수집해 Neon에 저장하고, 터미널형 UI에서 빠르게 탐색할 수 있습니다.

## 기술 스택

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: TailwindCSS
- **Database**: Neon PostgreSQL (Prisma ORM)
- **RSS Parser**: rss-parser

## 실행 방법

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수와 데이터베이스

```bash
npx prisma db push
npx prisma generate
```

### 3. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 접속

### 4. 첫 인제스트 실행

- `DATABASE_URL`과 `DIRECT_URL`을 설정한 뒤 `npx tsx scripts/ingest-once.ts` 실행
- 배포 환경에서는 GitHub Actions의 `full-ingest`와 `breaking-ingest`가 Neon에 직접 기록

## 주요 기능

| 기능 | 설명 |
|------|------|
| RSS 인제스트 | 30개 이상 공개 RSS 피드를 정기 수집하고 고신호 속보를 우선 처리 |
| 태깅 | 규칙 기반 자동 태깅 (rates, inflation, fed, fx, oil, geopolitics, equities, credit, crypto, ai) |
| 필터 | 소스, 태그, 검색, 기간(24h/7d/30d) 필터링 |
| 읽음/저장 | 기사 읽음 상태 및 저장 토글 |
| 자동 정리 | 30일 초과 기사 자동 삭제 (저장된 기사 제외) |
| 3패널 UI | 좌측(소스/태그), 중앙(기사 목록), 우측(기사 상세) |

## API 엔드포인트

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/sources` | 소스 목록 |
| PATCH | `/api/sources/:id` | 소스 활성화/비활성화 |
| GET | `/api/articles` | 기사 조회 (필터: sourceId, tag, q, read, saved, range, limit, cursor) |
| POST | `/api/articles/:id/read` | 읽음 토글 |
| POST | `/api/articles/:id/save` | 저장 토글 |
| POST | `/api/ingest` | 수동 인제스트 실행 |

## 프로젝트 구조

```
src/
├── app/
│   ├── api/
│   │   ├── ingest/route.ts
│   │   ├── articles/route.ts
│   │   ├── articles/[id]/read/route.ts
│   │   ├── articles/[id]/save/route.ts
│   │   ├── sources/route.ts
│   │   └── sources/[id]/route.ts
│   ├── page.tsx
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── TopBar.tsx
│   ├── SourcePanel.tsx
│   ├── ArticleList.tsx
│   └── ArticleDetail.tsx
├── lib/
│   ├── db/prisma.ts
│   ├── db/seed.ts
│   ├── ingest/ingest.ts
│   ├── cleanup/cleaner.ts
│   └── tagging/tagger.ts
└── types/index.ts
config/
├── tag_rules.json
└── sources_seed.json
prisma/
└── schema.prisma
```

## 법적 제약

- 본문 스크래핑 금지
- 유료 콘텐츠 우회 접근 금지
- 저장 데이터: title, url, publishedAt, source, summary(피드 제공 시), tags
- 본문은 항상 "Open original"로 외부 링크 이동
