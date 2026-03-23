"use client";

import { useState, useMemo, useCallback } from "react";
import type { Article } from "@/types";

interface NewsletterGeneratorProps {
  open: boolean;
  onClose: () => void;
  articles: Article[];
  portfolioPrices?: Array<{ symbol: string; label: string; price: number; change: number; changePct: number }>;
}

function formatDate(): string {
  const now = new Date();
  return `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getDate()).padStart(2, "0")}`;
}

function generatePlainText(
  selected: Article[],
  prices?: Array<{ symbol: string; label: string; price: number; change: number; changePct: number }>
): string {
  const date = formatDate();
  let text = `RYZM FINANCE DAILY BRIEF\n${date}\n\n`;
  text += `━━━━━━━━━━━━━━━━━━━━\n\n`;
  text += `TOP STORIES\n\n`;

  selected.forEach((a, i) => {
    const time = new Date(a.publishedAt).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
    text += `${i + 1}. ${a.title}\n`;
    text += `   ${a.sourceName} · ${time}\n`;
    if (a.summary) {
      const preview = a.summary.length > 100 ? a.summary.slice(0, 100) + "..." : a.summary;
      text += `   ${preview}\n`;
    }
    text += `\n`;
  });

  if (prices && prices.length > 0) {
    text += `━━━━━━━━━━━━━━━━━━━━\n\n`;
    text += `MARKET SNAPSHOT\n\n`;
    prices.forEach((p) => {
      const sign = p.change >= 0 ? "+" : "";
      text += `${p.symbol}: ${p.price.toLocaleString()} (${sign}${p.changePct.toFixed(2)}%)\n`;
    });
    text += `\n`;
  }

  text += `━━━━━━━━━━━━━━━━━━━━\n\n`;
  text += `Powered by RYZM FINANCE\n`;
  return text;
}

function generateNewsletterHTML(
  selected: Article[],
  prices?: Array<{ symbol: string; label: string; price: number; change: number; changePct: number }>
): string {
  const date = formatDate();
  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>RYZM FINANCE DAILY BRIEF</title>
</head>
<body style="margin:0;padding:0;background:#0D0D0F;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0D0D0F;padding:20px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#0D0D0F;">
  <!-- Header -->
  <tr><td style="padding:32px 24px 16px;border-bottom:2px solid #C9A96E;">
    <div style="font-size:22px;font-weight:700;color:#C9A96E;letter-spacing:0.08em;">RYZM FINANCE</div>
    <div style="font-size:14px;color:#8C8C91;margin-top:4px;">DAILY BRIEF · ${date}</div>
  </td></tr>

  <!-- Stories -->
  <tr><td style="padding:24px;">
    <div style="font-size:11px;font-weight:700;color:#8C8C91;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:16px;">TOP STORIES</div>
    ${selected.map((a, i) => {
      const time = new Date(a.publishedAt).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
      const preview = a.summary ? (a.summary.length > 120 ? a.summary.slice(0, 120) + "..." : a.summary) : "";
      return `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;border-bottom:1px solid #2D2D32;padding-bottom:16px;">
    <tr><td>
      <div style="font-size:13px;color:#C9A96E;font-weight:700;margin-bottom:4px;">${String(i + 1).padStart(2, "0")}</div>
      <a href="${a.url}" style="font-size:15px;color:#EBEBEB;font-weight:600;text-decoration:none;line-height:1.4;">${a.title}</a>
      <div style="font-size:12px;color:#8C8C91;margin-top:6px;">${a.sourceName} · ${time}</div>
      ${preview ? `<div style="font-size:13px;color:#8C8C91;margin-top:8px;line-height:1.5;">${preview}</div>` : ""}
    </td></tr>
    </table>`;
    }).join("")}
  </td></tr>

  ${prices && prices.length > 0 ? `
  <!-- Market -->
  <tr><td style="padding:0 24px 24px;">
    <div style="font-size:11px;font-weight:700;color:#8C8C91;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:12px;padding-top:8px;border-top:2px solid #2D2D32;">MARKET SNAPSHOT</div>
    <table width="100%" cellpadding="0" cellspacing="0">
    ${prices.map((p) => {
      const sign = p.change >= 0 ? "+" : "";
      const color = p.change >= 0 ? "#22C55E" : "#EF4444";
      return `
      <tr style="border-bottom:1px solid #2D2D32;">
        <td style="padding:8px 0;font-size:13px;color:#EBEBEB;font-weight:600;">${p.symbol}</td>
        <td style="padding:8px 0;font-size:13px;color:#EBEBEB;text-align:right;font-family:monospace;">${p.price.toLocaleString()}</td>
        <td style="padding:8px 0;font-size:13px;color:${color};text-align:right;font-family:monospace;">${sign}${p.changePct.toFixed(2)}%</td>
      </tr>`;
    }).join("")}
    </table>
  </td></tr>` : ""}

  <!-- Footer -->
  <tr><td style="padding:20px 24px;border-top:1px solid #2D2D32;text-align:center;">
    <div style="font-size:11px;color:#8C8C91;">Powered by <span style="color:#C9A96E;font-weight:700;">RYZM FINANCE</span></div>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

export function NewsletterGenerator({ open, onClose, articles, portfolioPrices }: NewsletterGeneratorProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);
  const [previewMode, setPreviewMode] = useState<"text" | "preview">("preview");

  // Pre-select saved articles on open
  useMemo(() => {
    if (open) {
      const saved = new Set(articles.filter((a) => a.isSaved).map((a) => a.id));
      setSelectedIds(saved);
    }
  }, [open, articles]);

  const recentArticles = useMemo(() => {
    return [...articles]
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
      .slice(0, 50);
  }, [articles]);

  const selectedArticles = useMemo(() => {
    return recentArticles.filter((a) => selectedIds.has(a.id));
  }, [recentArticles, selectedIds]);

  const toggleArticle = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(recentArticles.map((a) => a.id)));
  }, [recentArticles]);

  const selectNone = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleCopyClipboard = useCallback(() => {
    const text = generatePlainText(selectedArticles, portfolioPrices);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [selectedArticles, portfolioPrices]);

  const handleDownloadHTML = useCallback(() => {
    const html = generateNewsletterHTML(selectedArticles, portfolioPrices);
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ryzm-newsletter-${new Date().toISOString().slice(0, 10)}.html`;
    link.click();
    URL.revokeObjectURL(url);
  }, [selectedArticles, portfolioPrices]);

  if (!open) return null;

  const plainText = generatePlainText(selectedArticles, portfolioPrices);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[4vh] overflow-y-auto"
      style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full mb-8"
        style={{
          maxWidth: 900,
          background: "#0D0D0F",
          border: "1px solid #2D2D32",
          display: "grid",
          gridTemplateColumns: "340px 1fr",
          minHeight: 500,
          maxHeight: "92vh",
        }}
      >
        {/* Left: Article Selection */}
        <div style={{ borderRight: "1px solid #2D2D32", display: "flex", flexDirection: "column" }}>
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: "1px solid #2D2D32" }}
          >
            <div>
              <h2
                className="font-heading"
                style={{ color: "#C9A96E", fontSize: 14, letterSpacing: "0.06em", fontWeight: 700 }}
              >
                NEWSLETTER
              </h2>
              <p style={{ fontSize: 10, color: "#8C8C91", marginTop: 1 }}>
                {selectedIds.size}건 선택됨
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={selectAll}
                className="text-[10px] font-medium transition-colors"
                style={{ color: "#8C8C91", padding: "2px 6px", border: "1px solid #2D2D32" }}
              >
                전체 선택
              </button>
              <button
                onClick={selectNone}
                className="text-[10px] font-medium transition-colors"
                style={{ color: "#8C8C91", padding: "2px 6px", border: "1px solid #2D2D32" }}
              >
                선택 해제
              </button>
            </div>
          </div>

          {/* Article List */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {recentArticles.map((a) => {
              const isSelected = selectedIds.has(a.id);
              const time = new Date(a.publishedAt).toLocaleString("ko-KR", {
                month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit",
              });
              return (
                <div
                  key={a.id}
                  onClick={() => toggleArticle(a.id)}
                  className="cursor-pointer transition-colors"
                  style={{
                    padding: "10px 14px",
                    borderBottom: "1px solid #2D2D32",
                    background: isSelected ? "rgba(201,169,110,0.06)" : "transparent",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                    <div
                      style={{
                        width: 16,
                        height: 16,
                        border: `1px solid ${isSelected ? "#C9A96E" : "#2D2D32"}`,
                        background: isSelected ? "rgba(201,169,110,0.2)" : "transparent",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        marginTop: 1,
                      }}
                    >
                      {isSelected && (
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="#C9A96E" strokeWidth="1.5">
                          <path d="M2 5l2 2 4-4" />
                        </svg>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 500,
                          color: isSelected ? "#EBEBEB" : "#8C8C91",
                          lineHeight: 1.4,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {a.title}
                      </div>
                      <div style={{ fontSize: 10, color: "#8C8C91", marginTop: 2 }}>
                        {a.sourceName} · {time}
                        {a.isSaved && <span style={{ color: "#C9A96E", marginLeft: 6 }}>★</span>}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            {recentArticles.length === 0 && (
              <div style={{ textAlign: "center", padding: "40px 0", color: "#8C8C91", fontSize: 12 }}>
                기사가 없습니다.
              </div>
            )}
          </div>
        </div>

        {/* Right: Preview */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          {/* Preview Header */}
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: "1px solid #2D2D32" }}
          >
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPreviewMode("preview")}
                className="text-[10px] font-medium transition-colors"
                style={{
                  padding: "3px 8px",
                  border: "1px solid #2D2D32",
                  background: previewMode === "preview" ? "rgba(201,169,110,0.15)" : "transparent",
                  color: previewMode === "preview" ? "#C9A96E" : "#8C8C91",
                }}
              >
                미리보기
              </button>
              <button
                onClick={() => setPreviewMode("text")}
                className="text-[10px] font-medium transition-colors"
                style={{
                  padding: "3px 8px",
                  border: "1px solid #2D2D32",
                  background: previewMode === "text" ? "rgba(201,169,110,0.15)" : "transparent",
                  color: previewMode === "text" ? "#C9A96E" : "#8C8C91",
                }}
              >
                텍스트
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyClipboard}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium transition-colors"
                style={{
                  border: "1px solid #2D2D32",
                  background: copied ? "rgba(201,169,110,0.15)" : "transparent",
                  color: copied ? "#C9A96E" : "#8C8C91",
                }}
              >
                {copied ? "복사됨" : "클립보드 복사"}
              </button>
              <button
                onClick={handleDownloadHTML}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium transition-colors"
                style={{ border: "1px solid #2D2D32", background: "transparent", color: "#8C8C91" }}
              >
                HTML 다운로드
              </button>
              <button
                onClick={onClose}
                className="flex items-center justify-center w-7 h-7 text-[#8C8C91] hover:text-[#EBEBEB] transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M1 1l12 12M13 1L1 13" />
                </svg>
              </button>
            </div>
          </div>

          {/* Preview Content */}
          <div style={{ flex: 1, overflowY: "auto", padding: previewMode === "text" ? 0 : 20 }}>
            {selectedArticles.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 0", color: "#8C8C91", fontSize: 12 }}>
                기사를 선택하세요
              </div>
            ) : previewMode === "text" ? (
              <pre
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 12,
                  color: "#EBEBEB",
                  lineHeight: 1.6,
                  padding: 20,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {plainText}
              </pre>
            ) : (
              /* Formatted preview */
              <div style={{ maxWidth: 560, margin: "0 auto" }}>
                {/* Newsletter Header */}
                <div style={{ paddingBottom: 14, borderBottom: "2px solid #C9A96E", marginBottom: 20 }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: "#C9A96E", letterSpacing: "0.08em" }}>
                    RYZM FINANCE
                  </div>
                  <div style={{ fontSize: 13, color: "#8C8C91", marginTop: 4 }}>
                    DAILY BRIEF · {formatDate()}
                  </div>
                </div>

                {/* Stories */}
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: "#8C8C91",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase" as const,
                    marginBottom: 14,
                  }}
                >
                  TOP STORIES
                </div>
                {selectedArticles.map((a, i) => {
                  const time = new Date(a.publishedAt).toLocaleString("ko-KR", {
                    month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit",
                  });
                  const preview = a.summary
                    ? (a.summary.length > 120 ? a.summary.slice(0, 120) + "..." : a.summary)
                    : "";
                  return (
                    <div
                      key={a.id}
                      style={{ marginBottom: 16, paddingBottom: 16, borderBottom: "1px solid #2D2D32" }}
                    >
                      <div style={{ fontSize: 12, color: "#C9A96E", fontWeight: 700, marginBottom: 4 }}>
                        {String(i + 1).padStart(2, "0")}
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "#EBEBEB", lineHeight: 1.4 }}>
                        {a.title}
                      </div>
                      <div style={{ fontSize: 11, color: "#8C8C91", marginTop: 5 }}>
                        {a.sourceName} · {time}
                      </div>
                      {preview && (
                        <div style={{ fontSize: 12, color: "#8C8C91", marginTop: 6, lineHeight: 1.5 }}>
                          {preview}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Market Snapshot */}
                {portfolioPrices && portfolioPrices.length > 0 && (
                  <div style={{ marginTop: 8, paddingTop: 16, borderTop: "2px solid #2D2D32" }}>
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: "#8C8C91",
                        letterSpacing: "0.1em",
                        textTransform: "uppercase" as const,
                        marginBottom: 10,
                      }}
                    >
                      MARKET SNAPSHOT
                    </div>
                    {portfolioPrices.map((p) => {
                      const sign = p.change >= 0 ? "+" : "";
                      const color = p.change >= 0 ? "#22C55E" : "#EF4444";
                      return (
                        <div
                          key={p.symbol}
                          style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #2D2D32", fontSize: 12 }}
                        >
                          <span style={{ fontWeight: 600 }}>{p.symbol}</span>
                          <span style={{ fontFamily: "'Space Mono', monospace" }}>
                            {p.price.toLocaleString()}{" "}
                            <span style={{ color }}>{sign}{p.changePct.toFixed(2)}%</span>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Footer */}
                <div style={{ marginTop: 24, paddingTop: 14, borderTop: "1px solid #2D2D32", textAlign: "center" }}>
                  <span style={{ fontSize: 11, color: "#8C8C91" }}>
                    Powered by <span style={{ color: "#C9A96E", fontWeight: 700 }}>RYZM FINANCE</span>
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
