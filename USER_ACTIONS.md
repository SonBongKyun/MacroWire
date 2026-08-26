# MacroWire — Go-live / 운영 체크리스트

이 문서는 **현재 코드 기준** 운영 체크리스트입니다. 기능 코드는 저장소에 있어도 Clerk, Stripe, OpenRouter, Resend, cron secret 같은 외부 설정이 빠지면 해당 기능은 의도적으로 비활성화되거나 오류를 반환합니다.

전체 키 목록은 `.env.example`을 기준으로 합니다. 실제 secret은 Git에 커밋하지 않습니다.

---

## 0. 배포 전 데이터베이스

MacroWire는 Neon PostgreSQL을 사용합니다.

```bash
npm ci
npx prisma migrate deploy
npx prisma validate
npx prisma generate
```

운영 DB에서 `prisma migrate reset`을 실행하지 마세요.

CI는 PostgreSQL 16 빈 데이터베이스를 띄운 뒤 전체 migration chain을 적용합니다. PR에서 이 단계가 실패하면 production 배포 전에 migration부터 수정합니다.

---

## 1. Clerk — 인증

Clerk 프로젝트를 만든 뒤 다음 값을 Vercel에 등록합니다.

```text
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY
CLERK_WEBHOOK_SECRET
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/app
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/app
```

Webhook endpoint:

```text
https://<production-domain>/api/clerk/webhook
```

필요 이벤트:

- `user.created`
- `user.updated`
- `user.deleted`

Clerk를 설정하지 않은 배포는 개인용/self-hosted desk로 취급하며 뉴스 읽기 기능은 full-access로 유지됩니다. 다만 사용자 계정에 의존하는 read/save, billing 같은 기능은 사용할 수 없습니다.

---

## 2. Stripe — 구독 결제

Stripe에서 PRO/ELITE recurring price를 만들고 아래 값을 등록합니다.

```text
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
STRIPE_PRICE_PRO
STRIPE_PRICE_ELITE
```

Webhook endpoint:

```text
https://<production-domain>/api/stripe/webhook
```

필요 이벤트:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_failed`

Customer Portal도 활성화합니다.

서버 API가 plan entitlement를 직접 적용하므로 FREE 사용자는 UI를 우회해도 유료 뉴스 범위/소스 범위를 가져올 수 없어야 합니다.

---

## 3. OpenRouter — 선택적 AI 기능

MacroWire의 AI provider는 현재 **OpenRouter**입니다. Anthropic direct API 설정은 사용하지 않습니다.

```text
OPENROUTER_API_KEY
OPENROUTER_MODEL_FREE=anthropic/claude-haiku-4.5
OPENROUTER_MODEL_PRO=anthropic/claude-sonnet-4.5
OPENROUTER_MODEL_ELITE=anthropic/claude-opus-4.1
```

모델 slug는 OpenRouter catalogue에 존재하는 `provider/model` 형식이어야 합니다.

AI 키가 없어도 RSS 수집, Fast Wire, rules analysis, Article Detail의 비-AI 부분은 동작합니다. AI summary/insight만 비활성화됩니다.

---

## 4. Resend — 이메일

```text
RESEND_API_KEY
RESEND_FROM=MacroWire <noreply@yourdomain.com>
```

실서비스에서는 발신 도메인의 SPF/DKIM 인증을 완료합니다.

---

## 5. Cron / 관리자 secret — 필수 점검

Vercel Cron이 호출하는 protected cron route는 `CRON_SECRET`을 요구합니다.

```text
CRON_SECRET=<충분히 긴 랜덤 문자열>
MACROWIRE_OWNER_SECRET=<Clerk-less 관리자 작업용 별도 랜덤 문자열>
ADMIN_CLERK_IDS=<관리자 Clerk user id, 쉼표 구분>
```

`CRON_SECRET`이 없으면 `/api/insights/daily-recap/cron`은 실행되지 않습니다. 값을 추가한 뒤 새 deployment가 해당 환경변수를 읽도록 redeploy합니다.

GitHub Actions에서 같은 protected endpoint를 호출하는 workflow가 있다면 GitHub Actions secret에도 동일한 값을 별도로 등록합니다.

---

## 6. Render wire worker

`render.yaml`은 웹 서버가 아니라 RSS/Discord background worker 전용입니다.

필수:

```text
DATABASE_URL
DIRECT_URL
DISCORD_WEBHOOK_URL
```

기본 worker cadence와 alert threshold는 `render.yaml` / `.env.example`을 source of truth로 봅니다.

배포 후 로그에서 다음을 확인합니다.

- T0/T1 source가 설정된 cadence로 poll되는지
- 한 feed 실패가 다른 feed를 멈추지 않는지
- source health가 DB에 갱신되는지
- 실제 신규 high-signal article만 Discord에 전달되는지

---

## 7. Vercel

```text
NEXT_PUBLIC_SITE_URL=https://<production-domain>
```

환경변수를 바꾼 뒤에는 새 deployment 또는 redeploy가 필요합니다.

웹/API는 Vercel, long-running ingestion은 Render가 담당합니다. Vercel Function 내부에서 worker loop를 시작하지 않습니다.

---

## 8. 출시 전 smoke test

- [ ] `/` 랜딩 페이지가 정상 표시된다.
- [ ] `/app`에서 기사 목록과 source health가 로드된다.
- [ ] FREE 계정에서 7d/30d API 요청이 24h entitlement로 제한된다.
- [ ] FREE 계정에서 core 범위 밖 source가 API로 노출되지 않는다.
- [ ] PRO 계정에서 7d/30d와 전체 source가 열린다.
- [ ] `/sign-up` → `/app` 가입 흐름이 정상이다.
- [ ] read/save가 사용자별로 분리된다.
- [ ] Stripe test checkout 후 User tier가 갱신된다.
- [ ] Stripe 해지/결제실패 webhook 후 tier가 예상대로 갱신된다.
- [ ] AI summary cache hit은 quota를 다시 차감하지 않는다.
- [ ] AI provider가 없을 때 비-AI wire는 정상 동작한다.
- [ ] `/api/insights/daily-recap/cron`이 2xx로 완료된다.
- [ ] Resend digest가 올바른 대상에게만 발송된다.
- [ ] Render worker 재시작 후 source polling이 자동 복구된다.
- [ ] Discord webhook 실패가 article ingest를 rollback하지 않는다.

---

## 9. 출시 카피 원칙

- 실제 RSS polling cadence와 **기사 도착 보장 시간**을 같은 의미로 쓰지 않습니다.
- 기사 전문 저장/재배포 서비스처럼 표현하지 않습니다.
- FREE/PRO/ELITE 페이지에는 서버에서 실제 enforce되는 기능만 약속합니다.
- AI가 생성한 내용과 source fact/rules analysis를 화면에서 구분합니다.
- Yahoo 등 외부 시장 데이터는 공식 거래소 실시간 피드로 오인시키지 않습니다.

---

## 10. 장애 시 첫 확인 순서

1. Vercel runtime errors / build logs
2. Render worker logs와 source health
3. Neon migration 상태와 DB connectivity
4. Clerk / Stripe webhook delivery log
5. OpenRouter / Resend provider 상태
6. 최근 배포 diff

환경변수, 가격, provider 요금과 무료 한도는 수시로 바뀔 수 있으므로 이 문서에 비용을 고정값으로 적지 않습니다. 공급자 dashboard의 현재 값을 기준으로 판단합니다.
