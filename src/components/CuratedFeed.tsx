"use client";

import { useState, useMemo, useCallback } from "react";
import type { Article } from "@/types";
import { useArticleNotes } from "@/hooks/useArticleNotes";

interface CuratedFeedProps {
  open: boolean;
  onClose: () => void;
  articles: Article[];
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function CuratedFeed({ open, onClose, articles }: CuratedFeedProps) {
  const [copyToast, setCopyToast] = useState(false);
  const articleNotes = useArticleNotes();

  // Saved articles with notes/highlights, sorted by save date (newest first)
  const curatedItems = useMemo(() => {
    const saved = articles.filter((a) => a.isSaved);
    return saved
      .map((a) => ({
        article: a,
        note: articleNotes.getNote(a.id),
      }))
      .sort(
        (a, b) =>
          new Date(b.article.publishedAt).getTime() -
          new Date(a.article.publishedAt).getTime()
      );
  }, [articles, articleNotes]);

  const generateShareText = useCallback(() => {
    const lines: string[] = [
      "MacroWire \u2014 \uD050\uB808\uC774\uC158 \uD53C\uB4DC",
      "\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500",
      "",
    ];
    curatedItems.forEach((item, i) => {
      const { article, note } = item;
      lines.push(`${i + 1}. ${article.title}`);
      lines.push(
        `   \uCD9C\uCC98: ${article.sourceName} | ${formatDate(article.publishedAt)}`
      );
      if (note?.text) {
        lines.push(`   \uBA54\uBAA8: ${note.text}`);
      }
      if (note?.highlights && note.highlights.length > 0) {
        note.highlights.forEach((h) => {
          lines.push(`   > ${h}`);
        });
      }
      lines.push("");
    });
    return lines.join("\n");
  }, [curatedItems]);

  const generateMarkdown = useCallback(() => {
    const lines: string[] = [
      "# MacroWire \u2014 \uD050\uB808\uC774\uC158 \uD53C\uB4DC",
      "",
      `> \uC0DD\uC131\uC77C: ${new Date().toLocaleDateString("ko-KR")}`,
      `> \uCD1D ${curatedItems.length}\uAC74`,
      "",
      "---",
      "",
    ];
    curatedItems.forEach((item, i) => {
      const { article, note } = item;
      lines.push(`## ${i + 1}. ${article.title}`);
      lines.push("");
      lines.push(
        `- **\uCD9C\uCC98**: ${article.sourceName}`
      );
      lines.push(
        `- **\uB0A0\uC9DC**: ${formatDate(article.publishedAt)}`
      );
      lines.push(`- **\uD0DC\uADF8**: ${article.tags.join(", ") || "\uC5C6\uC74C"}`);
      lines.push(`- **URL**: ${article.url}`);
      if (article.summary) {
        lines.push("");
        lines.push(article.summary);
      }
      if (note?.text) {
        lines.push("");
        lines.push(`> **\uBA54\uBAA8**: ${note.text}`);
      }
      if (note?.highlights && note.highlights.length > 0) {
        lines.push("");
        lines.push("**\uD558\uC774\uB77C\uC774\uD2B8:**");
        note.highlights.forEach((h) => {
          lines.push(`> ${h}`);
        });
      }
      lines.push("");
      lines.push("---");
      lines.push("");
    });
    return lines.join("\n");
  }, [curatedItems]);

  const handleShareText = useCallback(() => {
    const text = generateShareText();
    navigator.clipboard.writeText(text).then(() => {
      setCopyToast(true);
      setTimeout(() => setCopyToast(false), 1500);
    });
  }, [generateShareText]);

  const handleExportMarkdown = useCallback(() => {
    const md = generateMarkdown();
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ryzm-curated-feed-${new Date().toISOString().slice(0, 10)}.md`;
    link.click();
    URL.revokeObjectURL(url);
  }, [generateMarkdown]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(6px)" }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="glass-modal border border-[#2C2D34] shadow-2xl flex flex-col"
        style={{
          width: 640,
          maxHeight: "80vh",
          background: "#131316",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: "#2C2D34" }}
        >
          <div>
            <h2
              className="font-heading font-bold text-[16px]"
              style={{ color: "#EBEBEB", letterSpacing: "-0.01em" }}
            >
              {"\uD050\uB808\uC774\uC158 \uD53C\uB4DC"}
            </h2>
            <p className="text-[11px] mt-0.5" style={{ color: "#8C8C91" }}>
              {"\uC800\uC7A5\uB41C \uAE30\uC0AC"} {curatedItems.length}{"\uAC74"} &middot; {"\uBA54\uBAA8 \uBC0F \uD558\uC774\uB77C\uC774\uD2B8 \uD3EC\uD568"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleShareText}
              className="px-3 py-1.5 text-[11px] font-semibold metal-btn transition-colors"
              style={{ color: "#C9A96E", borderColor: "rgba(201,169,110,0.3)" }}
            >
              {"\uD53C\uB4DC \uACF5\uC720"}
            </button>
            <button
              onClick={handleExportMarkdown}
              className="px-3 py-1.5 text-[11px] font-semibold metal-btn transition-colors"
              style={{ color: "#8C8C91" }}
            >
              {"\uB9C8\uD06C\uB2E4\uC6B4 \uB0B4\uBCF4\uB0B4\uAE30"}
            </button>
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center text-[#8C8C91] hover:text-[#EBEBEB] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {curatedItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40" style={{ color: "#8C8C91" }}>
              <svg className="w-8 h-8 mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              <p className="text-[12px]">{"\uC800\uC7A5\uB41C \uAE30\uC0AC\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4"}</p>
              <p className="text-[10px] mt-1 opacity-60">{"\uAE30\uC0AC\uB97C \uC800\uC7A5\uD558\uBA74 \uC5EC\uAE30\uC5D0 \uD45C\uC2DC\uB429\uB2C8\uB2E4"}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {curatedItems.map((item, i) => {
                const { article, note } = item;
                return (
                  <div
                    key={article.id}
                    className="border-b pb-4"
                    style={{ borderColor: "#2C2D34" }}
                  >
                    {/* Title row */}
                    <div className="flex items-start gap-2">
                      <span
                        className="text-[10px] font-bold tabular-nums shrink-0 mt-0.5"
                        style={{ color: "#C9A96E", minWidth: 18 }}
                      >
                        {i + 1}.
                      </span>
                      <div className="flex-1 min-w-0">
                        <a
                          href={article.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[13px] font-semibold leading-[1.5] hover:underline"
                          style={{ color: "#EBEBEB" }}
                        >
                          {article.title}
                        </a>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px]" style={{ color: "#8C8C91" }}>
                            {article.sourceName}
                          </span>
                          <span className="text-[8px]" style={{ color: "#2C2D34" }}>&middot;</span>
                          <span className="text-[10px] tabular-nums" style={{ color: "#8C8C91" }}>
                            {formatDate(article.publishedAt)}
                          </span>
                          {article.tags.length > 0 && (
                            <>
                              <span className="text-[8px]" style={{ color: "#2C2D34" }}>&middot;</span>
                              <span className="text-[10px]" style={{ color: "#8C8C91" }}>
                                {article.tags.slice(0, 3).join(", ")}
                              </span>
                            </>
                          )}
                        </div>

                        {/* User note */}
                        {note?.text && (
                          <div
                            className="mt-2 px-2.5 py-1.5 text-[11px] leading-[1.6]"
                            style={{
                              color: "#EBEBEB",
                              background: "rgba(201,169,110,0.06)",
                              borderLeft: "2px solid rgba(201,169,110,0.3)",
                            }}
                          >
                            {note.text}
                          </div>
                        )}

                        {/* Highlights */}
                        {note?.highlights && note.highlights.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {note.highlights.map((h, hi) => (
                              <div
                                key={hi}
                                className="pl-3 py-1 text-[11px] leading-[1.6]"
                                style={{
                                  color: "var(--foreground-secondary, #B0B0B5)",
                                  borderLeft: "2px solid #C9A96E",
                                  fontStyle: "italic",
                                }}
                              >
                                {h}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-5 py-3 border-t flex items-center justify-between"
          style={{ borderColor: "#2C2D34" }}
        >
          <span className="text-[10px]" style={{ color: "#8C8C91" }}>
            Shift+C {"\uB85C \uD1A0\uAE00"} &middot; ESC {"\uB2EB\uAE30"}
          </span>
          {copyToast && (
            <span className="text-[10px] font-semibold" style={{ color: "#C9A96E" }}>
              {"\uD074\uB9BD\uBCF4\uB4DC\uC5D0 \uBCF5\uC0AC\uB428!"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
