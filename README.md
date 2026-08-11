# MacroWire

개인용 실시간 거시경제·시장 뉴스 터미널. 공개 RSS/Atom 피드를 지속적으로 확인하고, 하나의 기사를 사건 단위의 사실·수치·관련 보도·출처 정보로 보강합니다.

MacroWire는 기사 전문 보관소가 아닙니다. 목록에서는 중요한 변화를 빠르게 찾고, 상세 화면에서는 공개 데이터 조각만으로 사건의 핵심을 판단한 뒤 필요한 경우 원문을 엽니다.

## MacroWire v2 architecture

```text
Render Background Worker (primary)
  → tier scheduler (T0 / T1 / T2 / T3)
  → RSS / official public feeds
  → normalize + canonical URL
  → tag + explainable importance
  → URL deduplicate
  → Neon PostgreSQL
  → /api/articles/head arrival check
  → MacroWire client

GitHub Actions T0/T1 ingest (fallback only)
  → same normalization and deduplication path
  → Neon PostgreSQL
```

웹 프로세스와 worker는 독립적으로 실행됩니다. worker가 source cadence, overlap 방지, retry/backoff, source failure 격리와 상태 기록을 소유합니다. `.github/workflows/breaking-ingest.yml`은 worker 장애나 배포 공백을 보완하는 best-effort safety net이며 지연 보장은 하지 않습니다.

### Source tiers

| Tier | 역할 | 기본 주기 | 예시 |
|---|---|---:|---|
| T0 | 공식 발표 | 45초 | Federal Reserve, ECB |
| T1 | 속보 wire | 25초 | 연합뉴스 속보, CNBC Breaking, Bloomberg Markets |
| T2 | 시장 보도 | 2분 | MarketWatch, FT, Nikkei, SCMP, CoinDesk |
| T3 | 배경/분석 | 10분 | Hacker News, Reddit, 분석 피드 |

`WIRE_T0_INTERVAL_MS`부터 `WIRE_T3_INTERVAL_MS`까지 환경 변수로 cadence를 조정할 수 있습니다. 실패한 source는 해당 tier 주기의 지수 backoff를 적용하며 최대 30분으로 제한됩니다. 한 feed의 오류는 다른 feed 실행을 중단하지 않습니다.

### Source health

`Source`에는 다음 runtime 상태가 저장됩니다.

- `lastFetchAt`
- `lastSuccessAt`
- `lastFailureAt`
- `lastLatencyMs`
- `consecutiveFailures`
- `nextFetchAt`

`POST /api/live/pulse`는 v2부터 read-only health endpoint입니다. 브라우저가 ingestion을 유도하지 않기 때문에 여러 탭, Vercel serverless instance, worker 사이의 ingest 경쟁이 없습니다. 새 기사 도착 확인은 가벼운 `GET /api/articles/head`가 담당하고 기존의 수동 반영, desktop notification, sound UX는 유지합니다.

## Article enrichment

### Raw source data

- title, URL, source, published time
- `feedExcerpt`: RSS가 공개한 발췌
- `metaDescription`: 사용자가 선택한 기사에서만 읽는 공개 page metadata
- tags

기존 `summary` 컬럼은 호환성을 위해 유지하고 migration 시 `feedExcerpt`로 안전하게 backfill합니다. 새 ingest는 두 필드에 같은 RSS 발췌를 기록합니다.

### Derived data

`ArticleEnrichment`는 raw data와 분리해 다음을 캐시합니다.

- `keyFacts`: RSS, 공식 발표, metadata, 관련 coverage에서 그대로 추출한 문장
- `keyNumbers`: 명시적인 단위와 주변 문맥이 함께 있는 숫자만 추출
- `whyItMatters`: 기존 signal classifier를 이용한 규칙 기반 분석
- entities
- content sources / provenance
- enrichment timestamp

상세 흐름:

```text
Article selected
  → cached enrichment 확인 (12시간)
  → 공개 URL 안전성 + DNS 검사
  → 최대 512KB HTML에서 meta/og description만 추출
  → 최근 6시간 coverage window에서 독립 매체 확인
  → 사실 / 수치 / 규칙 분석 분리
  → ArticleEnrichment 저장
  → event-centric detail 표시
```

모든 article row에서 page fetch나 AI 호출을 실행하지 않습니다. enrichment는 선택된 기사에만 lazy-load되며, coverage query는 최대 250개의 최근 후보로 제한됩니다.

### Provenance and AI policy

우선순위는 `official source → RSS → public metadata → multi-source coverage → rules → optional AI`입니다. Fast Wire와 Article Detail은 `ANTHROPIC_API_KEY` 없이 동작합니다.

상세 화면은 사실과 분석을 분리합니다.

- `WHAT HAPPENED`: 실제 확보한 텍스트와 source label
- `KEY NUMBERS`: 실제 문자열, 문맥, source label
- `WHY IT MATTERS`: `Analysis · rules`로 명시
- `RELATED COVERAGE`: 독립 매체별 headline, time, URL
- `PROVENANCE`: 사용한 RSS/official/metadata/coverage/rules 표시

정보가 없으면 섹션을 숨깁니다. 빈 데이터를 채우기 위한 문장이나 수치를 생성하지 않습니다.

## Local development

### Requirements

- Node.js 24
- Neon/PostgreSQL-compatible database
- `DATABASE_URL`: pooled application connection
- `DIRECT_URL`: direct migration connection

### Install and migrate

```bash
npm ci
npx prisma migrate deploy
npx prisma generate
```

운영 데이터가 있는 환경에서 `prisma migrate reset`을 실행하지 마세요. v2 migration은 기존 row를 삭제하지 않고 nullable/default column, enum, enrichment table을 추가한 뒤 `summary → feedExcerpt`만 backfill합니다.

### Run web and worker

두 터미널에서 실행합니다.

```bash
npm run dev
```

```bash
npm run worker:wire
```

웹 앱은 [http://localhost:3000](http://localhost:3000), 실제 desk는 `/app`에서 엽니다.

### Validation

```bash
npm run typecheck
npm test
npm run lint
npm run build
```

## Deployment

### Neon

1. production backup/PITR 상태를 확인합니다.
2. `DIRECT_URL`로 `npx prisma migrate deploy`를 실행합니다.
3. destructive reset 없이 `20260811090000_fast_wire_article_enrichment` migration이 적용됐는지 확인합니다.

### Render Background Worker

repository root의 `render.yaml`을 Blueprint로 연결합니다.

- type: `worker`
- build: `npm ci`
- pre-deploy: `npx prisma migrate deploy`
- start: `npm run worker:wire`
- required secrets: `DATABASE_URL`, `DIRECT_URL`
- shutdown delay: 30초

Render는 worker 종료 시 `SIGTERM`을 보내므로 entrypoint가 새 tick을 중단하고 진행 중 fetch를 drain한 뒤 Prisma connection을 닫습니다. Worker가 정상화된 뒤 T0/T1 로그에서 주기, latency, failures, next poll 상태를 확인하세요.

### Vercel

Vercel은 Next.js web/API만 실행합니다. worker loop를 Vercel function 안에서 시작하지 않습니다. schema migration 이후 web을 배포하고 다음을 확인합니다.

- `GET /api/articles`가 새 raw/importance fields를 반환
- `POST /api/articles/:id/enrich`가 cache/provenance를 반환
- `POST /api/live/pulse`가 `role: health-only`를 반환
- `GET /api/articles/head` arrival count가 기존처럼 동작

### GitHub Actions fallback

`breaking-ingest-fallback` workflow에는 `DATABASE_URL`과 `DIRECT_URL` secret이 필요합니다. T0/T1 source만 bounded run으로 확인하며 worker를 대체하는 latency guarantee로 간주하지 않습니다.

## API

| Method | Endpoint | 설명 |
|---|---|---|
| GET | `/api/sources` | source, tier, health 상태 |
| GET | `/api/articles` | virtualized list용 기사 조회 |
| GET | `/api/articles/head` | 새 기사/속보 도착 수 확인 |
| POST | `/api/articles/:id/enrich` | 선택 기사 metadata + 사건 enrichment |
| POST | `/api/articles/:id/read` | 읽음 전환 |
| POST | `/api/articles/:id/save` | 저장 전환 |
| POST | `/api/live/pulse` | read-only worker health |
| POST | `/api/summarize` | 구버전 호환용 extract-key-facts wrapper |
| POST | `/api/ingest` | bounded manual/full fallback ingest |

## Data and copyright rules

- 기사 전문을 저장하거나 화면에 재현하지 않습니다.
- paywall, login, robots 정책을 우회하지 않습니다.
- metadata fetch는 DB에 이미 저장된 HTTP(S) URL만 대상으로 하고 private/loopback DNS를 차단합니다.
- HTML은 metadata 추출 중 메모리에만 최대 512KB까지 읽으며 DB에는 description만 저장합니다.
- 화면의 사실과 수치는 확보된 source text에서만 추출합니다.
- 규칙 기반 해석은 source fact가 아닌 `Analysis`로 표시합니다.
- 원문은 항상 source가 표시된 `OPEN ORIGINAL` CTA로 엽니다.

## Existing product behavior retained

- article list virtualization
- source/tag/search/range filters
- per-user read/save state
- research notes and highlights
- related coverage and signal scoring
- user-controlled arrival loading (목록 강제 이동 없음)
- desktop notifications and sound
- mobile list/detail navigation
