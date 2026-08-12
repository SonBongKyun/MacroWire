"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Sparkles } from "lucide-react";

type EvidenceScope = "public-article" | "rss-metadata" | "rss-only";

interface AiSummary {
  summary: string;
  keyPoints: string[];
  confidence: "LOW" | "MEDIUM" | "HIGH";
  evidenceScope: EvidenceScope;
  evidenceLabel: string;
  generatedAt: string;
  cached: boolean;
}

interface SummaryResponse {
  summary: AiSummary | null;
  canGenerate?: boolean;
  reason?: string | null;
  error?: string;
}

function errorMessage(status: number, code?: string): string {
  if (code === "OWNER_AUTH_REQUIRED" || code === "OWNER_AUTH_NOT_CONFIGURED") {
    return "소유자 인증이 설정된 환경에서만 AI 요약을 생성할 수 있습니다.";
  }
  if (status === 401) return "로그인 후 AI 요약을 사용할 수 있습니다.";
  if (code === "QUOTA_EXCEEDED") return "오늘의 무료 AI 요약 한도를 사용했습니다.";
  if (status === 429 || code === "AI_RATE_LIMITED") return "AI 제공자가 혼잡합니다. 잠시 후 다시 시도해 주세요.";
  if (status === 422 || code === "SOURCE_TEXT_UNAVAILABLE") {
    return "요약할 공개 원문이나 RSS 발췌를 확보하지 못했습니다.";
  }
  if (code === "AI_NOT_CONFIGURED") {
    return "OPENROUTER_API_KEY가 설정되면 AI 원문 요약을 사용할 수 있습니다.";
  }
  if (code === "AI_AUTH_FAILED") return "OpenRouter API 키 인증을 확인해 주세요.";
  if (code === "AI_CREDITS_EXHAUSTED") return "OpenRouter 크레딧을 확인해 주세요.";
  if (code === "AI_PROVIDER_UNAVAILABLE") return "AI 제공자를 일시적으로 사용할 수 없습니다.";
  if (status === 504 || code === "AI_TIMEOUT") return "AI 응답 시간이 초과됐습니다. 잠시 후 다시 시도해 주세요.";
  return "AI 요약에 실패했습니다. 잠시 후 다시 시도해 주세요.";
}

export function ArticleAiSummary({ articleId }: { articleId: string }) {
  const [result, setResult] = useState<AiSummary | null>(null);
  const [checkingCache, setCheckingCache] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [canGenerate, setCanGenerate] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    // The detail component remains mounted while selection changes.
    setResult(null);
    setError(null);
    setCheckingCache(true);
    setCanGenerate(true);
    fetch(`/api/articles/${articleId}/summary`, { signal: controller.signal })
      .then(async (response) => {
        const data = await response.json().catch(() => ({})) as SummaryResponse;
        if (!response.ok) throw Object.assign(new Error(data.error ?? "REQUEST_FAILED"), { status: response.status });
        setResult(data.summary);
        setCanGenerate(data.canGenerate !== false);
        if (data.reason === "AI_NOT_CONFIGURED" || data.reason === "OWNER_AUTH_REQUIRED") {
          setError(errorMessage(data.reason === "AI_NOT_CONFIGURED" ? 503 : 401, data.reason));
        }
      })
      .catch((requestError: Error & { status?: number }) => {
        if (requestError.name !== "AbortError") {
          if (requestError.status === 401 || requestError.status === 503) setCanGenerate(false);
          setError(errorMessage(requestError.status ?? 500, requestError.message));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setCheckingCache(false);
      });
    return () => controller.abort();
  }, [articleId]);

  const generate = useCallback(async () => {
    setGenerating(true);
    setError(null);
    try {
      const response = await fetch(`/api/articles/${articleId}/summary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: "ko" }),
      });
      const data = await response.json().catch(() => ({})) as SummaryResponse;
      if (!response.ok) throw Object.assign(new Error(data.error ?? "REQUEST_FAILED"), { status: response.status });
      setResult(data.summary);
    } catch (requestError) {
      const typed = requestError as Error & { status?: number };
      setError(errorMessage(typed.status ?? 500, typed.message));
    } finally {
      setGenerating(false);
    }
  }, [articleId]);

  return (
    <section className="event-section ai-source-summary" aria-labelledby={`ai-summary-${articleId}`}>
      <div className="event-section-heading">
        <Sparkles size={13} aria-hidden="true" />
        <h3 id={`ai-summary-${articleId}`}>AI ORIGINAL SUMMARY</h3>
        {result && <span className="analysis-disclosure">AI · {result.evidenceLabel}</span>}
      </div>

      {checkingCache ? (
        <div className="ai-summary-pending" aria-live="polite">
          <RefreshCw size={13} className="animate-spin" /> 저장된 요약 확인 중
        </div>
      ) : result ? (
        <div className="ai-summary-result">
          <p className="ai-summary-lead">{result.summary}</p>
          <ul>
            {result.keyPoints.map((point, index) => (
              <li key={`${point}-${index}`}><span>{String(index + 1).padStart(2, "0")}</span><p>{point}</p></li>
            ))}
          </ul>
          <div className="ai-summary-provenance">
            <span>근거 {result.evidenceLabel}</span>
            <span>신뢰도 {result.confidence}</span>
            <span>{result.cached ? "캐시 재사용" : "방금 생성"}</span>
          </div>
          <p className="ai-summary-caution">AI가 확인 가능한 텍스트만 요약했습니다. 투자 판단 전 원문을 확인하세요.</p>
        </div>
      ) : (
        <div className="ai-summary-empty">
          <p>공개 원문 본문을 우선 요약합니다. 접근이 막히면 RSS·metadata만 사용하며 원문 전체는 저장하지 않습니다.</p>
          <button type="button" onClick={generate} disabled={generating || !canGenerate}>
            {generating ? <RefreshCw size={13} className="animate-spin" /> : <Sparkles size={13} />}
            {generating ? "원문을 읽고 요약하는 중" : "AI 원문 요약 생성"}
          </button>
        </div>
      )}

      {error && <p className="ai-summary-error" role="status">{error}</p>}
    </section>
  );
}
