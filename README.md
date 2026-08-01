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
| 시세 | Yahoo Finance 기반 단일 시세 계층 — 모든 화면이 같은 일간 등락률과 실제 일중 시세를 사용 |
| 경제 캘린더 | 공표 규칙에서 매달 자동 산출 (하드코딩 일정 없음) |
| 모바일 | 하단 탭바 + 리스트→상세 전환, 44px 터치 타깃, 홈 화면 설치(PWA) |

## 모바일

- **터치**: 768px 이하에서 모든 컨트롤이 최소 44px 타깃을 갖고, 본문 텍스트는 11px 아래로
  내려가지 않습니다. 기사 태그처럼 작게 보여야 하는 칩은 겉보기 크기를 유지한 채
  가상 요소로 히트 영역만 넓힙니다.
- **배터리·데이터**: 모든 폴링은 `useVisibleInterval`을 거칩니다. 탭이 가려지면 뉴스(30초)·
  시세(5분)·시계(1초) 타이머가 전부 멈추고, 다시 보는 순간 한 번 즉시 갱신합니다.
  주머니 속에서 라디오를 깨우지 않습니다.
- **설치**: `start_url`이 `/app`이라 홈 화면에서 열면 랜딩이 아니라 데스크로 바로 들어갑니다.
  아이콘은 192/512 PNG와 maskable 변형을 포함합니다(`npm run icons`로 SVG에서 재생성).
- **초기 로딩**: 대시보드와 와이어만 처음에 로드하고, 나머지 탭·오버레이는 열 때
  내려받습니다. 에디토리얼 세리프(Crimson Pro)는 랜딩·리캡 라우트에서만 로드합니다.

## 데이터 원칙

화면에 보이는 숫자는 실제 값이거나, 실제가 아닐 때 그렇다고 표시합니다.

- **시세는 한 곳에서만 계산합니다.** `src/lib/market/quote.ts`가 유일한 시세 계층이고
  `/api/market`과 `/api/portfolio`가 이를 공유합니다. 일간 등락률은 항상
  Yahoo `meta.previousClose`(직전 정규장 종가)를 기준으로 계산합니다. 조회 구간에 따라
  달라지는 `chartPreviousClose`를 쓰면 5일 변동률이 일간 변동률로 표시됩니다.
- **차트는 합성하지 않습니다.** 스파크라인은 실제 일중 종가 시계열입니다. 데이터가
  부족하면 선을 그리지 않고 "일중 시세 없음"을 표시합니다.
- **정적 수치는 기준일을 밝힙니다.** `config/macro_indicators.json`의 각 항목은 `asOf`와
  `staleAfterDays`를 가지며, 기간이 지나거나 `asOf`가 `null`이면 대시보드가 흐리게
  표시하고 "확인 필요"를 붙입니다.
- **캘린더는 규칙으로 생성합니다.** `config/econ_calendar.json`의 `recurring` 규칙을
  `src/lib/calendar/econ.ts`가 매달 전개하므로 일정이 과거로 굳지 않습니다.
  규칙 기반 항목은 "추정"으로 표시하고, 확정된 중앙은행 일정은 `anchors`에 추가하면
  같은 날짜의 추정 항목을 대체합니다. 발표 시각은 기관 현지 시간대로 저장해
  미국 지표가 EST/EDT를 자동으로 따라갑니다.

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
│   ├── calendar/econ.ts      # 경제 캘린더 규칙 전개
│   ├── market/quote.ts       # 시세 단일 계층 (등락률·스파크라인)
│   └── tagging/tagger.ts
└── types/index.ts
config/
├── tag_rules.json
├── sources_seed.json
├── econ_calendar.json        # 반복 규칙 + 확정 일정(anchors)
└── macro_indicators.json     # 정책금리·물가 등 참고 수치 (asOf 필수)
prisma/
└── schema.prisma
```

## 법적 제약

- 본문 스크래핑 금지
- 유료 콘텐츠 우회 접근 금지
- 저장 데이터: title, url, publishedAt, source, summary(피드 제공 시), tags
- 본문은 항상 "Open original"로 외부 링크 이동
