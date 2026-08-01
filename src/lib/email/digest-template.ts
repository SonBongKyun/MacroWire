/**
 * Inline-CSS HTML email template. Resend renders this as-is to inbox.
 * Keep it simple — no @import, no flexbox, no JS, no remote fonts.
 */

interface TopStory {
  articleId: string;
  title: string;
  url: string;
  sourceName: string;
  why: string;
  tradeImplication: string;
}

interface DigestData {
  locale: "ko" | "en";
  headline: string;
  summary: string;
  topStories: TopStory[];
  themes?: string[];
  unsubscribeUrl?: string;
  manageUrl: string;
  dateLabel: string;
}

const colors = {
  bg: "#0B0E11",
  panel: "#11161A",
  text: "#EDEAE0",
  dim: "#8C8C91",
  accent: "#72AEF8",
  border: "rgba(245,240,225,0.10)",
};

const i18n = {
  ko: {
    preview: "AI가 정리한 오늘의 매크로 TOP 3",
    title: "오늘의 매크로",
    why: "왜 중요한가",
    trade: "트레이드 함의",
    cta: "MacroWire에서 전체 보기",
    themes: "오늘의 테마",
    footerNote: "MacroWire에서 매일 받아보시는 매크로 다이제스트입니다.",
    manage: "이메일 설정 관리",
    unsubscribe: "구독 해지",
  },
  en: {
    preview: "Today's macro top 3, distilled by AI",
    title: "Today in Macro",
    why: "Why it matters",
    trade: "Trade implication",
    cta: "Open the full wire on MacroWire",
    themes: "Themes",
    footerNote: "You're receiving this because you opted into the MacroWire daily digest.",
    manage: "Manage email settings",
    unsubscribe: "Unsubscribe",
  },
};

export function renderDigestHTML(d: DigestData): string {
  const t = i18n[d.locale];
  const storyBlocks = d.topStories
    .map(
      (s, i) => `
    <tr>
      <td style="padding: 0 0 30px 0;">
        <p style="margin: 0 0 6px; color: ${colors.dim}; font-size: 11px; letter-spacing: 0.12em; font-family: monospace; text-transform: uppercase;">
          #${i + 1} · ${escapeHtml(s.sourceName)}
        </p>
        <a href="${escapeHtml(s.url)}" target="_blank" style="color: ${colors.text}; text-decoration: none;">
          <h3 style="margin: 0 0 10px; font-size: 20px; line-height: 1.35; font-weight: 700; color: ${colors.text};">
            ${escapeHtml(s.title)}
          </h3>
        </a>
        <p style="margin: 0 0 12px; font-size: 14px; line-height: 1.55; color: #A9A79E;">
          <strong style="color: ${colors.accent};">${t.why}.</strong> ${escapeHtml(s.why)}
        </p>
        <div style="padding: 10px 14px; background: rgba(114,174,248,0.08); border-left: 3px solid ${colors.accent}; font-size: 12px; line-height: 1.5; color: ${colors.accent};">
          <strong>${t.trade.toUpperCase()}</strong> — ${escapeHtml(s.tradeImplication)}
        </div>
      </td>
    </tr>`
    )
    .join("");

  return `<!doctype html>
<html lang="${d.locale}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${escapeHtml(d.headline)} — MacroWire</title>
</head>
<body style="margin:0;padding:0;background:${colors.bg};color:${colors.text};font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <span style="display:none;visibility:hidden;opacity:0;color:transparent;height:0;width:0;">${escapeHtml(t.preview)}</span>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${colors.bg};">
    <tr>
      <td align="center" style="padding: 32px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width: 600px; background: ${colors.bg};">
          <tr>
            <td style="padding-bottom:16px; border-top: 3px solid ${colors.accent};"></td>
          </tr>
          <tr>
            <td style="padding: 0 0 8px;">
              <span style="font-family: monospace; font-size: 12px; letter-spacing:0.16em; color: ${colors.accent}; font-weight: 700;">MACROWIRE</span>
              <span style="float: right; font-size: 11px; color: ${colors.dim}; letter-spacing: 0.08em;">${escapeHtml(d.dateLabel)}</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px 0 8px;">
              <p style="margin:0;font-size:12px;letter-spacing:0.16em;color:${colors.dim};text-transform:uppercase;">${t.title}</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 0 14px;">
              <h1 style="margin:0;font-size:36px;line-height:1.15;letter-spacing:0.01em;color:${colors.text};font-weight:800;">
                ${escapeHtml(d.headline)}
              </h1>
            </td>
          </tr>
          ${
            d.summary
              ? `<tr><td style="padding:0 0 28px;font-size:16px;line-height:1.6;color:#A9A79E;">${escapeHtml(d.summary)}</td></tr>`
              : ""
          }
          ${storyBlocks}
          <tr>
            <td style="padding: 8px 0 24px; text-align: center;">
              <a href="https://macro-wire-psi.vercel.app/app" style="display:inline-block;background:${colors.accent};color:${colors.bg};padding:12px 24px;text-decoration:none;font-weight:700;letter-spacing:0.10em;font-size:13px;">${t.cta}</a>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 0; border-top: 1px solid ${colors.border}; font-size: 11px; color: ${colors.dim}; line-height: 1.6;">
              ${t.footerNote}<br/>
              <a href="${d.manageUrl}" style="color: ${colors.accent}; text-decoration: none;">${t.manage}</a>
              ${d.unsubscribeUrl ? ` · <a href="${d.unsubscribeUrl}" style="color: ${colors.dim};">${t.unsubscribe}</a>` : ""}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
