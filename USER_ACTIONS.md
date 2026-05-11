# MacroWire — 외부 서비스 연동 체크리스트

코드는 전부 작성됐고 Vercel에도 배포돼 있습니다. **이 문서의 환경변수만 채워 넣으면** 결제, 인증, AI, 이메일이 모두 동작합니다.

전체 환경변수 템플릿은 `.env.example` 참고. 아래는 **순서대로** 진행하면 가장 빠릅니다.

---

## 1. Clerk (인증) — 5분, 무료 10K MAU까지

1. https://dashboard.clerk.com 가입
2. New Application → "MacroWire" → Email + Google + Apple 활성화
3. API Keys 페이지에서 복사:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (pk_…)
   - `CLERK_SECRET_KEY` (sk_…)
4. Webhooks → Add Endpoint
   - URL: `https://macro-wire-psi.vercel.app/api/clerk/webhook`
   - Events: `user.created`, `user.updated`, `user.deleted`
   - Signing secret → `CLERK_WEBHOOK_SECRET`
5. Customization → Paths
   - Sign-in: `/sign-in`
   - Sign-up: `/sign-up`
   - After sign-in: `/app`

**Vercel 환경변수에 넣을 키 6개:**
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY
CLERK_WEBHOOK_SECRET
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/app
```

---

## 2. Stripe (결제) — 10분

1. https://dashboard.stripe.com 가입 (한국이면 dashboard.stripe.com/register/korea)
2. 사업자 등록 (테스트는 사업자 없이도 가능)
3. **Products → Add Product** 두 개 생성:

   | Product | Price | Billing |
   |---|---|---|
   | MacroWire PRO | ₩9,900 (KRW) | Recurring · monthly |
   | MacroWire ELITE | ₩29,900 (KRW) | Recurring · monthly |

   생성 후 각 Price의 `price_…` 복사 → `STRIPE_PRICE_PRO`, `STRIPE_PRICE_ELITE`
4. Developers → API keys
   - Secret key → `STRIPE_SECRET_KEY` (sk_…)
   - Publishable key → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (pk_…)
5. Developers → Webhooks → Add endpoint
   - URL: `https://macro-wire-psi.vercel.app/api/stripe/webhook`
   - Events:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_failed`
   - Signing secret → `STRIPE_WEBHOOK_SECRET`
6. Customer Portal 활성화: Settings → Billing → Customer portal → Activate

**Vercel 환경변수 5개:**
```
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
STRIPE_PRICE_PRO
STRIPE_PRICE_ELITE
```

---

## 3. Anthropic (AI) — 3분

1. https://console.anthropic.com 가입
2. **Billing** 에서 결제수단 등록 후 $10 정도 충전 (Pay-as-you-go)
3. API Keys → Create Key → `ANTHROPIC_API_KEY` (sk-ant-…)

**Vercel 환경변수 1~3개:**
```
ANTHROPIC_API_KEY
# (선택) 모델 오버라이드:
ANTHROPIC_MODEL_PRO=claude-sonnet-4-5
ANTHROPIC_MODEL_ELITE=claude-opus-4-1
```

**예상 비용**: 활성 사용자 100명 기준 월 $20–60 (캐시 hit이 많아 무난).

---

## 4. Resend (이메일) — 3분, 월 3K 통 무료

1. https://resend.com 가입
2. **Domains** → Add Domain → 자기 도메인 (예: macrowire.app)
   - 도메인 없으면 일단 onboarding 도메인 그대로 사용 가능 (단, 발신 제한 있음)
3. DNS 레코드(SPF/DKIM) 추가 후 verify
4. API Keys → Create → `RESEND_API_KEY` (re_…)

**Vercel 환경변수 2개:**
```
RESEND_API_KEY
RESEND_FROM=MacroWire <noreply@yourdomain.com>
```

---

## 5. Vercel 환경변수 일괄 등록

Vercel Dashboard → 프로젝트 → Settings → **Environment Variables** 에 위 항목 전부 붙여넣기. **Production, Preview, Development 셋 다 체크.**

마지막으로 한 줄 추가:
```
NEXT_PUBLIC_SITE_URL=https://macro-wire-psi.vercel.app
CRON_SECRET=<openssl rand -hex 32 결과 같은 긴 랜덤 문자열>
```

저장 → **Deployments → 최근 배포 ··· → Redeploy** 클릭 (env 새로 잡기 위함).

---

## 6. 도메인 (선택, 글로벌 인상엔 필수)

- macrowire.io / macrowire.app / themacrowire.com 같은 도메인 구매 (Namecheap, Cloudflare Registrar)
- Vercel → Domains → Add → 도메인 입력 → CNAME / A 레코드 안내대로 설정
- `NEXT_PUBLIC_SITE_URL` + Clerk paths + Stripe webhook URL을 새 도메인으로 업데이트
- Stripe Checkout / Customer Portal 모두 새 도메인으로 잘 동작하는지 테스트

---

## 7. 첫 운영 체크리스트

배포 후 한 번씩 직접 눌러보세요:

- [ ] `/` 랜딩 페이지 정상
- [ ] `/sign-up` 가입 → `/app`로 진입
- [ ] `/account` 본인 정보 보임
- [ ] `/#pricing` → PRO 버튼 → Stripe Checkout 열림
- [ ] **Stripe 테스트 카드** `4242 4242 4242 4242` 로 결제 → tier가 PRO로 갱신
- [ ] `/account` → Manage Subscription → Stripe 포털 열림 → 해지 테스트
- [ ] `/app` → 기사 클릭 → AI Insight 패널 (FREE 3회 / 일)
- [ ] `/macro` → 오늘의 매크로 페이지 (cron 1회 돌면 채워짐)
- [ ] 다음날 아침 → Resend 발신 로그에 이메일 송신 기록
- [ ] `/r/<내 referralCode>` → 다른 브라우저로 가입 → 양쪽 모두 PRO 자동

---

## 8. 출시 전 한 번 더 점검

- **랜딩페이지 카피 검증**: 더 이상 거짓말이 없는지. 예: "30개 소스 90초 갱신" 같은 옛 문구가 남아있으면 다시 쓰기 (실제: ~40개 소스, 5분 갱신, AI 인사이트 있음).
- **PRO 약속**: 현재 코드에서 정의된 plan.bullets는 모두 실제 작동. 그래도 한 번 직접 PRO로 가입해서 한 줄씩 확인하기.
- **법적 표기**: 푸터에 사업자번호, 약관, 개인정보처리방침 링크 (한국 결제 받으려면 필수). 토스페이먼츠도 검토해볼만 — Stripe보다 한국 카드 호환성 좋음.
- **GTM**: Google Search Console + Google Analytics 추가 (`/macro` 페이지가 SEO 핵심).
- **SNS**: 트위터/X에 macrowire 핸들 잡고 매일 OG 이미지 자동 트윗 (`/api/og/recap`을 이미지로 첨부).

---

## 운영 비용 (월) — 100 유저 기준

| 항목 | 비용 |
|---|---|
| Vercel Pro (필수, cron 다회) | $20 |
| Neon Scale | $19 |
| Anthropic API | $20–60 |
| Resend (3K 무료 → Pro $20) | $0–20 |
| Clerk (10K MAU 무료) | $0 |
| Stripe (수수료만) | 매출 2.9% + ₩300 |
| 도메인 | $1 |
| **총 고정비** | **$60–120** |

**손익분기**: PRO 5명만 들어와도 흑자.

---

이 문서대로만 하면 1–2시간 안에 결제 가능한 글로벌 매크로 와이어가 됩니다. 진행하시면서 막히는 부분 알려주시면 거기서부터 같이 잡습니다.
