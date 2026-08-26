"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Sparkles } from "lucide-react";

const AUTO_SUMMARY_DELAY_MS = 700;

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
    return "OPENROUTER_API_KEY가 설정되면 기사 진입 시 AI 요약이 자동으로 표시됩니다.";
  }
  if (code === "AI_AUTH_FAILED") return "OpenRouter API 키 인증을 확인해 주세요.";
  if (code === "AI_CREDITS_EXHAUSTED") return "OpenRouter 크레딧을 확인해 주세요.";
  if (code === "AI_PROVIDER_UNAVAILABLE") return "AI 제공자를 일시적으로 사용할 수 없습니다.";
  if (status === 504 || code === "AI_TIMEOUT") return "AI 응답 시간이 초과됐습니다. 잠시 후 다시 시도해 주세요.";
  return "AI 요약에 실패했습니다. 잠시 후 다시 시도해 주세요.";
}

async function readSummaryResponse(response: Response): Promise<SummaryResponse> {
  const data = await response.json().catch(() => ({})) as SummaryResponse;
  if (!response.ok) {
    throw Object.assign(new Error(data.error ?? "REQUEST_FAILED"), { status: response.status });
  }
  return data;
}

export function ArticleAiSummary({ articleId }: { articleId: string }) {
  const [result, setResult] = useState<AiSummary | null>(null);
  const [checkingCache, setCheckingCache] = useState(true);
  const [autoQueued, setAutoQueued] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [canGenerate, setCanGenerate] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let autoTimer: number | null = null;

    // The detail component remains mounted while selection changes.
    setResult(null);
    setError(null);
    setCheckingCache(true);
    setAutoQueued(false);
    setGenerating(false);
    setCanGenerate(true);

    const generateAutomatically = async () => {
      setAutoQueued(false);
      setGenerating(true);
      try {
        const response = await fetch(`/api/articles/${articleId}/summary`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
          signal: controller.signal,
        });
        const data = await readSummaryResponse(response);
        if (!controller.signal.aborted) setResult(data.summary);
      } catch (requestError) {
        const typed = requestError as Error & { status?: number };
        if (typed.name !== "AbortError" && !controller.signal.aborted) {
          setError(errorMessage(typed.status ?? 500, typed.message));
          if (typed.status === 401 || typed.status === 503) setCanGenerate(false);
        }
      } finally {
        if (!controller.signal.aborted) setGenerating(false);
      }
    };

    fetch(`/api/articles/${articleId}/summary`, { signal: controller.signal })
      .then(readSummaryResponse)
      .then((data) => {
        if (controller.signal.aborted) return;
        setResult(data.summary);
        setCanGenerate(data.canGenerate !== false);
        setCheckingCache(false);

        if (data.summary) return;
        if (data.canGenerate !== false) {
          // Avoid burning quota while the user is rapidly arrowing/clicking through headlines.
          setAutoQueued(true);
          autoTimer = window.setTimeout(() => {
            if (!controller.signal.aborted) void generateAutomatically();
          }, AUTO_SUMMARY_DELAY_MS);
          return;
        }
        if (data.reason === "AI_NOT_CONFIGURED" || data.reason === "OWNER_AUTH_REQUIRED") {
          setError(errorMessage(data.reason === "AI_NOT_CONFIGURED" ? 503 : 401, data.reason));
        }
      })
      .catch((requestError: Error & { status?: number }) => {
        if (requestError.name !== "AbortError" && !controller.signal.aborted) {
          if (requestError.status === 401 || requestError.status === 503) setCanGenerate(false);
          setError(errorMessage(requestError.status ?? 500, requestError.message));
          setCheckingCache(false);
        }
      });

    return () => {
      controller.abort();
      if (autoTimer !== null) window.clearTimeout(autoTimer);
    };
  }, [articleId]);

  const generate = useCallback(async () => {
    setGenerating(true);
    setAutoQueued(false);
    setError(null);
    try {
      const response = await fetch(`/api/articles/${articleId}/summary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const data = await readSummaryResponse(response);
      setResult(data.summary);
    } catch (requestError) {
      const typed = requestError as Error & { status?: number };
      setError(errorMessage(typed.status ?? 500, typed.message));
    } finally {
      setGenerating(false);
    }
  }, [articleId]);

  const pending = checkingCache || autoQueued || generating;
  const pendingLabel = checkingCache
    ? "저장된 요약 확인 중"
    : autoQueued
      ? "AI 핵심 요약 준비 중"
      : "AI가 핵심만 읽는 중";

  return (
    <section className="event-section ai-source-summary" aria-labelledby={`ai-summary-${articleId}`}>
      <div className="event-section-heading">
        <Sparkles size={13} aria-hidden="true" />
        <h3 id={`ai-summary-${articleId}`}>AI QUICK SUMMARY</h3>
        {result && <span className="analysis-disclosure">AI · {result.evidenceLabel}</span>}
      </div>

      {pending ? (
        <div className="ai-summary-pending" aria-live="polite">
          <RefreshCw size={13} className="animate-spin" /> {pendingLabel}
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
            <span>{result.evidenceLabel}</span>
            <span>신뢰도 {result.confidence}</span>
            <span>{result.cached ? "캐시" : "새 요약"}</span>
          </div>
          <p className="ai-summary-caution">확인 가능한 텍스트만 요약했습니다. 중요한 판단 전 원문을 확인하세요.</p>
        </div>
      ) : (
        <div className="ai-summary-empty">
          <p>{canGenerate ? "자동 요약을 만들지 못했습니다." : "AI 요약을 현재 사용할 수 없습니다."}</p>
          {canGenerate && (
            <button type="button" onClick={generate} disabled={generating}>
              <Sparkles size={13} /> 다시 요약
            </button>
          )}
        </div>
      )}

      {error && <p className="ai-summary-error" role="status">{error}</p>}
    </section>
  );
}
