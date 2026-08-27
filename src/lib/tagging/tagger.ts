import tagRules from "../../../config/tag_rules.json";

interface TagRule {
  tag: string;
  keywords: string[];
}

const rules: TagRule[] = tagRules.rules;

/**
 * Every tag the tagger can produce, in rules order.
 *
 * The filter bar and the command palette used to carry their own hardcoded
 * copy of this list, so a tag added to the rules file was invisible in the UI
 * until someone remembered to update the array too. There is one list now.
 */
export const ALL_TAGS: string[] = rules.map((rule) => rule.tag);

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function keywordMatches(text: string, keyword: string): boolean {
  const normalized = keyword.trim().toLowerCase();
  if (!normalized) return false;

  // "경기" is both the business cycle and a sports match. Require nearby
  // economic context for the bare word; explicit terms such as 경기침체 and
  // 경기회복 are separate keywords and continue to match normally.
  if (normalized === "경기") {
    return /(?:경제|성장|침체|회복|둔화|부진|호황|불황|소비|고용|실업|gdp|pmi).{0,14}경기|경기.{0,14}(?:경제|성장|침체|회복|둔화|부진|호황|불황|소비|고용|실업|gdp|pmi)/i.test(text);
  }

  // Short Latin finance tokens such as AI, EU, CPI, Fed and war must be
  // matched as words. Plain substring matching turns "chair" into AI and
  // "Warsh" into war, which cascades into bad importance and event signals.
  if (/^[a-z0-9]+(?:\s+[a-z0-9]+)*$/i.test(normalized)) {
    const phrase = normalized.split(/\s+/).map(escapeRegex).join("\\s+");
    return new RegExp(`(^|[^a-z0-9])${phrase}(?=$|[^a-z0-9])`, "i").test(text);
  }

  return text.includes(normalized);
}

export function applyTags(title: string, summary?: string | null): string[] {
  const text = `${title} ${summary ?? ""}`.toLowerCase();
  const matched = new Set<string>();

  for (const rule of rules) {
    for (const keyword of rule.keywords) {
      if (keywordMatches(text, keyword)) {
        matched.add(rule.tag);
        break; // one keyword match is enough per tag
      }
    }
  }

  return Array.from(matched);
}
