import { NextRequest, NextResponse } from "next/server";

// Client-side extractive summarization endpoint
// No external AI API needed — uses simple extraction from RSS summary + title

export async function POST(req: NextRequest) {
  try {
    const { title, summary, url } = await req.json();

    if (!title) {
      return NextResponse.json({ error: "Missing title" }, { status: 400 });
    }

    // Attempt to fetch article page for more context (with timeout)
    let pageText = "";
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { "User-Agent": "Mozilla/5.0 (compatible; MacroWire/1.0)" },
      });
      clearTimeout(timeout);
      if (res.ok) {
        const html = await res.text();
        // Extract text from meta description and og:description
        const metaDesc = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i)?.[1] || "";
        const ogDesc = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']*)["']/i)?.[1] || "";
        pageText = ogDesc || metaDesc;
      }
    } catch {}

    // Build a structured summary from available data
    const sources: string[] = [];
    if (summary) sources.push(summary);
    if (pageText && pageText !== summary) sources.push(pageText);

    const bestText = sources[0] || "";

    // Extract key sentences (simple extractive)
    const sentences = bestText
      .replace(/\s+/g, " ")
      .split(/[.!?。]\s*/)
      .filter((s) => s.trim().length > 10)
      .slice(0, 3);

    const result = {
      title,
      keyPoints: sentences.length > 0 ? sentences : ["요약을 생성할 수 없습니다. 원문을 확인해주세요."],
      source: pageText ? "meta" : summary ? "rss" : "none",
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json(result);
  } catch (err) {
    console.error("Summarize error:", err);
    return NextResponse.json({ error: "Summarization failed" }, { status: 500 });
  }
}
