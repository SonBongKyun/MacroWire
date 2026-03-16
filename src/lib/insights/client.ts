import Anthropic from "@anthropic-ai/sdk";

let _client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!_client) {
    _client = new Anthropic();
  }
  return _client;
}

export async function generateInsight(
  prompt: string,
  model: "haiku" | "sonnet"
): Promise<string> {
  const modelId =
    model === "haiku"
      ? "claude-haiku-4-5-20241022"
      : "claude-sonnet-4-5-20250514";

  const msg = await getClient().messages.create({
    model: modelId,
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const block = msg.content[0];
  return block.type === "text" ? block.text : "";
}
