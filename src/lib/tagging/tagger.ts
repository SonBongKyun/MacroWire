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
