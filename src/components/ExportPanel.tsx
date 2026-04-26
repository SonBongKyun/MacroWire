"use client";

import { useCallback } from "react";
import type { Article } from "@/types";

interface ExportPanelProps {
  articles: Article[];
  onClose: () => void;
}

export function ExportPanel({ articles, onClose }: ExportPanelProps) {
  const savedArticles = articles.filter((a) => a.isSaved);

  const exportJSON = useCallback(() => {
    const data = savedArticles.map((a) => ({
      title: a.title,
      url: a.url,
      source: a.sourceName,
      publishedAt: a.publishedAt,
      tags: a.tags,
      summary: a.summary,
    }));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" });
    download(blob, `macrowire-export-${dateStr()}.json`);
  }, [savedArticles]);

  const exportCSV = useCallback(() => {
    const header = "제목,URL,출처,발행일,태그,요약\n";
    const rows = savedArticles.map((a) =>
      [
        csvEscape(a.title),
        a.url,
        csvEscape(a.sourceName),
        new Date(a.publishedAt).toLocaleString("ko-KR"),
        csvEscape(a.tags.join("; ")),
        csvEscape(a.summary || ""),
      ].join(",")
    );
    const bom = "\uFEFF"; // UTF-8 BOM for Excel
    const blob = new Blob([bom + header + rows.join("\n")], { type: "text/csv;charset=utf-8" });
    download(blob, `macrowire-export-${dateStr()}.csv`);
  }, [savedArticles]);

  const exportMarkdown = useCallback(() => {
    const md = savedArticles
      .map(
        (a, i) =>
          `### ${i + 1}. ${a.title}\n` +
          `- **출처**: ${a.sourceName}\n` +
          `- **시간**: ${new Date(a.publishedAt).toLocaleString("ko-KR")}\n` +
          `- **태그**: ${a.tags.join(", ") || "없음"}\n` +
          `- **URL**: ${a.url}\n` +
          (a.summary ? `- **요약**: ${a.summary}\n` : "")
      )
      .join("\n---\n\n");

    const header = `# MacroWire — 저장된 기사\n\n> 내보내기: ${new Date().toLocaleString("ko-KR")}\n> 총 ${savedArticles.length}건\n\n---\n\n`;
    const blob = new Blob([header + md], { type: "text/markdown;charset=utf-8" });
    download(blob, `macrowire-export-${dateStr()}.md`);
  }, [savedArticles]);

  const exportHTML = useCallback(() => {
    const rows = savedArticles
      .map(
        (a) =>
          `<tr><td><a href="${a.url}" target="_blank">${escapeHtml(a.title)}</a></td>` +
          `<td>${escapeHtml(a.sourceName)}</td>` +
          `<td>${new Date(a.publishedAt).toLocaleString("ko-KR")}</td>` +
          `<td>${a.tags.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join(" ")}</td></tr>`
      )
      .join("\n");

    const html = `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"><title>MacroWire Export</title>
<style>
body{font-family:-apple-system,sans-serif;margin:40px;color:#333}
table{border-collapse:collapse;width:100%}
th,td{border:1px solid #ddd;padding:8px 12px;text-align:left;font-size:13px}
th{background:#f5f5f5;font-weight:700}
a{color:#1e3a5f;text-decoration:none}
a:hover{text-decoration:underline}
.tag{display:inline-block;padding:1px 6px;margin:1px;border-radius:3px;font-size:10px;font-weight:600;background:#f0f0f0;color:#555}
h1{font-size:20px;margin-bottom:4px}
p{color:#888;font-size:12px}
</style></head>
<body>
<h1>MacroWire — 저장된 기사</h1>
<p>${new Date().toLocaleString("ko-KR")} | ${savedArticles.length}건</p>
<table><thead><tr><th>제목</th><th>출처</th><th>발행일</th><th>태그</th></tr></thead>
<tbody>${rows}</tbody></table>
</body></html>`;

    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    download(blob, `macrowire-export-${dateStr()}.html`);
  }, [savedArticles]);

  return (
    <div className="glass-modal w-72 overflow-hidden animate-fade-in">
      <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
        <h3 className="text-[12px] font-bold text-[var(--foreground-bright)] flex items-center gap-2">
          <div className="w-5 h-5 rounded-[var(--radius-xs)] bg-[var(--accent)] flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          내보내기
        </h3>
        <button onClick={onClose} className="text-[var(--muted)] hover:text-[var(--foreground)] text-xs">✕</button>
      </div>

      <div className="p-3 space-y-1.5">
        <div className="text-[9px] text-[var(--muted)] mb-2">
          저장된 기사 {savedArticles.length}건을 내보냅니다
        </div>

        {savedArticles.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-[10px] text-[var(--muted)]">저장된 기사가 없습니다</p>
          </div>
        ) : (
          <>
            <ExportButton
              label="JSON"
              desc="구조화된 데이터, API 연동용"
              icon="{ }"
              onClick={exportJSON}
            />
            <ExportButton
              label="CSV"
              desc="Excel, Google Sheets 호환"
              icon="▦"
              onClick={exportCSV}
            />
            <ExportButton
              label="Markdown"
              desc="노트앱, 블로그 호환"
              icon="M↓"
              onClick={exportMarkdown}
            />
            <ExportButton
              label="HTML"
              desc="브라우저에서 바로 열기"
              icon="<>"
              onClick={exportHTML}
            />
          </>
        )}
      </div>
    </div>
  );
}

function ExportButton({ label, desc, icon, onClick }: { label: string; desc: string; icon: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-sm)] metal-btn text-left hover:border-[var(--accent)] transition-all group"
    >
      <div className="w-8 h-8 rounded-[var(--radius-sm)] bg-[var(--surface-active)] flex items-center justify-center text-[10px] font-bold text-[var(--accent)] group-hover:bg-[var(--accent)] group-hover:text-white transition-all shrink-0">
        {icon}
      </div>
      <div>
        <div className="text-[11px] font-bold text-[var(--foreground)]">{label}</div>
        <div className="text-[9px] text-[var(--muted)]">{desc}</div>
      </div>
    </button>
  );
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function dateStr() {
  return new Date().toISOString().slice(0, 10);
}

function csvEscape(str: string): string {
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
