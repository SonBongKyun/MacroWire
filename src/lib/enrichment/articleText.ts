import { safePublicFetch } from "../security/outbound-url";
import { cleanEvidenceText, extractMetaDescription } from "./extract";

const MAX_ARTICLE_HTML_BYTES = 1_500_000;
export const MAX_ARTICLE_TEXT_CHARS = 14_000;
const MIN_ARTICLE_TEXT_CHARS = 280;

export type ArticleTextStatus = "available" | "blocked" | "insufficient" | "unavailable";

export interface ArticleTextResult {
  status: ArticleTextStatus;
  text: string | null;
  description: string | null;
}

const BOILERPLATE_PATTERN = /(?:cookie|privacy policy|terms of use|sign in|log in|subscribe|newsletter|advertisement|all rights reserved|쿠키|개인정보|이용약관|로그인|구독|광고)/i;
const RESTRICTED_PUBLISHER_HOSTS = ["ft.com", "wsj.com", "bloomberg.com"];

export function isRestrictedPublisherUrl(rawUrl: string): boolean {
  try {
    const hostname = new URL(rawUrl).hostname.toLowerCase().replace(/^www\./, "");
    return RESTRICTED_PUBLISHER_HOSTS.some((host) => hostname === host || hostname.endsWith(`.${host}`));
  } catch {
    return false;
  }
}

export function classifyArticleTextResponse(
  status: number,
  contentType: string,
  contentLength: number | null,
): ArticleTextStatus | "read" {
  if ([401, 402, 403, 451].includes(status)) return "blocked";
  if (status < 200 || status >= 300) return "unavailable";
  const normalizedType = contentType.toLowerCase();
  if (!normalizedType.includes("text/html") && !normalizedType.includes("application/xhtml+xml")) {
    return "unavailable";
  }
  if (contentLength !== null && contentLength > MAX_ARTICLE_HTML_BYTES) return "unavailable";
  return "read";
}

async function readTextLimited(response: Response, maxBytes: number): Promise<string> {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let received = 0;
  let result = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > maxBytes) {
      await reader.cancel("article document exceeded limit");
      throw new Error("Article document is too large");
    }
    result += decoder.decode(value, { stream: true });
  }

  return result + decoder.decode();
}

function jsonLdArticleBodies(html: string): string[] {
  const bodies: string[] = [];
  const scripts = html.match(/<script\b[^>]*type\s*=\s*(?:["']application\/ld\+json["']|application\/ld\+json)[^>]*>[\s\S]*?<\/script>/gi) ?? [];

  function visit(value: unknown) {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (!value || typeof value !== "object") return;
    const record = value as Record<string, unknown>;
    if (typeof record.articleBody === "string") bodies.push(cleanEvidenceText(record.articleBody));
    Object.values(record).forEach(visit);
  }

  for (const script of scripts) {
    const raw = script.replace(/^<script\b[^>]*>/i, "").replace(/<\/script>$/i, "").trim();
    try {
      visit(JSON.parse(raw));
    } catch {
      // Invalid publisher JSON-LD is ignored; visible paragraphs remain available.
    }
  }
  return bodies.filter((body) => body.length >= MIN_ARTICLE_TEXT_CHARS);
}

function contentRegions(html: string): string[] {
  const articles = [...html.matchAll(/<article\b[^>]*>([\s\S]*?)<\/article>/gi)].map((match) => match[1]);
  if (articles.length > 0) return articles;
  const mains = [...html.matchAll(/<main\b[^>]*>([\s\S]*?)<\/main>/gi)].map((match) => match[1]);
  return mains.length > 0 ? mains : [html];
}

function visibleParagraphs(region: string): string[] {
  const withoutChrome = region
    .replace(/<!--([\s\S]*?)-->/g, " ")
    .replace(/<(script|style|noscript|svg|form|nav|header|footer|aside)\b[^>]*>[\s\S]*?<\/\1>/gi, " ");
  const paragraphs = [...withoutChrome.matchAll(/<(?:p|h[2-4])\b[^>]*>([\s\S]*?)<\/(?:p|h[2-4])>/gi)]
    .map((match) => cleanEvidenceText(match[1]))
    .filter((text) => text.length >= 40 && !BOILERPLATE_PATTERN.test(text));
  return paragraphs;
}

export function extractPublicArticleText(html: string): string | null {
  const jsonLd = jsonLdArticleBodies(html).sort((a, b) => b.length - a.length)[0];
  if (jsonLd) return jsonLd.slice(0, MAX_ARTICLE_TEXT_CHARS);

  const seen = new Set<string>();
  const paragraphs: string[] = [];
  for (const region of contentRegions(html)) {
    for (const paragraph of visibleParagraphs(region)) {
      const fingerprint = paragraph.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
      if (!fingerprint || seen.has(fingerprint)) continue;
      seen.add(fingerprint);
      paragraphs.push(paragraph);
    }
  }

  const text = paragraphs.join("\n").trim();
  return text.length >= MIN_ARTICLE_TEXT_CHARS ? text.slice(0, MAX_ARTICLE_TEXT_CHARS) : null;
}

export async function fetchPublicArticleText(
  url: string,
  timeoutMs = 8_000,
): Promise<ArticleTextResult> {
  // These publishers commonly expose a JSON-LD articleBody inside a paywall
  // shell. Treat it as blocked and fall back to RSS/public metadata instead of
  // mistaking HTTP 200 for permission to use the full body.
  if (isRestrictedPublisherUrl(url)) {
    return { status: "blocked", text: null, description: null };
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await safePublicFetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; MacroWire/2.0; on-demand-summary)",
        Accept: "text/html,application/xhtml+xml;q=0.9",
        "Accept-Encoding": "identity",
      },
    });
    const contentType = response.headers.get("content-type") ?? "";
    const rawLength = response.headers.get("content-length");
    const parsedLength = rawLength === null ? null : Number(rawLength);
    const contentLength = parsedLength !== null && Number.isFinite(parsedLength) ? parsedLength : null;
    const decision = classifyArticleTextResponse(response.status, contentType, contentLength);
    if (decision !== "read") return { status: decision, text: null, description: null };

    const html = await readTextLimited(response, MAX_ARTICLE_HTML_BYTES);
    const text = extractPublicArticleText(html);
    return {
      status: text ? "available" : "insufficient",
      text,
      description: extractMetaDescription(html),
    };
  } catch {
    return { status: "unavailable", text: null, description: null };
  } finally {
    clearTimeout(timeout);
  }
}
