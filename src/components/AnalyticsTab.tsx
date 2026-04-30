"use client";

import type { Article } from "@/types";
import { AnalyticsDashboard } from "@/components/AnalyticsDashboard";
import { SourceAnalysis } from "@/components/SourceAnalysis";
import { CorrelationHeatmap } from "@/components/CorrelationHeatmap";

interface AnalyticsTabProps {
  articles: Article[];
}

export function AnalyticsTab({ articles }: AnalyticsTabProps) {
  return (
    <div className="overflow-y-auto h-full">
      <div className="max-w-[1200px] mx-auto p-5">
        <div className="mb-5">
          <h2 className="text-[16px] font-bold text-[var(--foreground-bright)] tracking-[-0.01em]">
            애널리틱스 대시보드
          </h2>
          <p className="text-[11px] text-[var(--muted)] mt-1 leading-relaxed">
            뉴스 트렌드, 감성 분석, 태그 버블맵, 경제 캘린더 등 다양한 데이터 시각화를 확인하세요.
          </p>
        </div>
        <AnalyticsDashboard articles={articles} />
        <div style={{ marginTop: 24, padding: "20px", background: "rgba(13,14,18,0.5)", border: "1px solid #2C2D34", borderRadius: 2 }}>
          <SourceAnalysis articles={articles} />
        </div>
        <div style={{ marginTop: 24, padding: "20px", background: "rgba(13,14,18,0.5)", border: "1px solid #2C2D34", borderRadius: 2 }}>
          <CorrelationHeatmap articles={articles} />
        </div>
      </div>
    </div>
  );
}
