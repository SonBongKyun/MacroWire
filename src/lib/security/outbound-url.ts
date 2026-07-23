import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const WEBHOOK_HOSTS = new Set([
  "hooks.slack.com",
  "discord.com",
  "discordapp.com",
  ...(process.env.WEBHOOK_ALLOWED_HOSTS ?? "")
    .split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean),
]);

export function isPrivateIp(address: string): boolean {
  const normalized = address.toLowerCase();
  if (normalized.startsWith("::ffff:")) return isPrivateIp(normalized.slice(7));
  if (["::", "::1", "0:0:0:0:0:0:0:1"].includes(normalized)) return true;
  if (normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("fe80:")) {
    return true;
  }

  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) return false;
  const [a, b] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) ||
    a >= 224
  );
}

export function parsePublicHttpUrl(raw: string): URL {
  const url = new URL(raw);
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error("Only HTTP(S) URLs are allowed");
  }
  if (url.username || url.password) throw new Error("URL credentials are not allowed");
  if (url.hostname === "localhost" || url.hostname.endsWith(".localhost")) {
    throw new Error("Local addresses are not allowed");
  }
  if (isIP(url.hostname) && isPrivateIp(url.hostname)) {
    throw new Error("Private addresses are not allowed");
  }
  return url;
}

export function parseWebhookUrl(raw: string): URL {
  const url = parsePublicHttpUrl(raw);
  if (url.protocol !== "https:" || !WEBHOOK_HOSTS.has(url.hostname.toLowerCase())) {
    throw new Error("Webhook host is not allowed");
  }
  return url;
}

async function assertPublicDns(url: URL): Promise<void> {
  const records = await lookup(url.hostname, { all: true, verbatim: true });
  if (records.length === 0 || records.some((record) => isPrivateIp(record.address))) {
    throw new Error("URL resolves to a private address");
  }
}

export async function safePublicFetch(
  raw: string,
  init: RequestInit = {},
  redirects = 3
): Promise<Response> {
  let url = parsePublicHttpUrl(raw);
  for (let i = 0; i <= redirects; i++) {
    await assertPublicDns(url);
    const response = await fetch(url, { ...init, redirect: "manual" });
    if (![301, 302, 303, 307, 308].includes(response.status)) return response;

    const location = response.headers.get("location");
    if (!location || i === redirects) throw new Error("Too many redirects");
    url = parsePublicHttpUrl(new URL(location, url).toString());
  }
  throw new Error("Unable to fetch URL");
}
