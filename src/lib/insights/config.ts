export const insightConfig = {
  mode: (process.env.INSIGHT_MODE ?? "manual") as "manual" | "auto" | "off",
  autoArticle: process.env.INSIGHT_AUTO_ARTICLE === "true",
  autoCluster: process.env.INSIGHT_AUTO_CLUSTER === "true",
  apiKeyConfigured: !!process.env.ANTHROPIC_API_KEY,
};
