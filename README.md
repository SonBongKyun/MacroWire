# MacroWire

개인용 매크로 뉴스 와이어 웹앱. 공개 RSS 피드를 5분 주기로 수집하여 메타데이터 기반으로 기사를 저장하고, 터미널형 UI로 빠르게 탐색할 수 있습니다.

## 기술 스택

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: TailwindCSS
- **Database**: SQLite (Prisma ORM)
- **RSS Parser**: rss-parser

## 실행 방법

### 1. 의존성 설치

```bash
npm install
```

### 2. 데이터베이스 초기화

```bash
npx prisma migrate dev --name init
npx prisma generate
```

### 3. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 접속

### 4. 첫 인제스트 실행

- UI 상단의 **"Ingest now"** 버튼 클릭
- 또는 API 직접 호출: `POST http://localhost:3000/api/ingest`

## 주요 기능

| 기능 | 설명 |
|------|------|
| RSS 인제스트 | 20개 공개 RSS 피드에서 5분 주기로 기사 수집 |
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
