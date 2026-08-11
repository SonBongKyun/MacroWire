import { safePublicFetch } from "../security/outbound-url";
import { extractMetaDescription } from "./extract";

const MAX_METADATA_HTML_BYTES = 512 * 1024;

export type MetadataStatus = "available" | "missing" | "blocked" | "unavailable";

export interface MetadataResult {
  status: MetadataStatus;
  description: string | null;
}

export function classifyMetadataResponse(
  status: number,
  contentType: string,
  contentLength: number | null,
): MetadataStatus | "read" {
  if ([401, 402, 403, 451].includes(status)) return "blocked";
  if (status < 200 || status >= 300) return "unavailable";
  const normalizedType = contentType.toLowerCase();
  if (!normalizedType.includes("text/html") && !normalizedType.includes("application/xhtml+xml")) {
    return "unavailable";
  }
  if (contentLength !== null && contentLength > MAX_METADATA_HTML_BYTES) return "unavailable";
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
      await reader.cancel("metadata document exceeded limit");
      throw new Error("Metadata document is too large");
    }
    result += decoder.decode(value, { stream: true });
  }

  return result + decoder.decode();
}

export async function fetchArticleMetadata(
  url: string,
  timeoutMs = 6_000,
): Promise<MetadataResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await safePublicFetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; MacroWire/2.0; metadata-only)",
        Accept: "text/html,application/xhtml+xml;q=0.9",
        "Accept-Encoding": "identity",
      },
    });

    const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
    const rawContentLength = response.headers.get("content-length");
    const parsedContentLength = rawContentLength === null ? null : Number(rawContentLength);
    const contentLength = parsedContentLength !== null && Number.isFinite(parsedContentLength)
      ? parsedContentLength
      : null;
    const decision = classifyMetadataResponse(response.status, contentType, contentLength);
    if (decision !== "read") return { status: decision, description: null };

    const html = await readTextLimited(response, MAX_METADATA_HTML_BYTES);
    const description = extractMetaDescription(html);
    return { status: description ? "available" : "missing", description };
  } catch {
    return { status: "unavailable", description: null };
  } finally {
    clearTimeout(timeout);
  }
}
