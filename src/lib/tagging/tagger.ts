import tagRules from "../../../config/tag_rules.json";

interface TagRule {
  tag: string;
  keywords: string[];
}

const rules: TagRule[] = tagRules.rules;

export function applyTags(title: string, summary?: string | null): string[] {
  const text = `${title} ${summary ?? ""}`.toLowerCase();
  const matched = new Set<string>();

  for (const rule of rules) {
    for (const keyword of rule.keywords) {
      if (text.includes(keyword.toLowerCase())) {
        matched.add(rule.tag);
        break; // one keyword match is enough per tag
      }
    }
  }

  return Array.from(matched);
}
