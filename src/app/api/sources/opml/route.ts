import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

// GET /api/sources/opml — Export all sources as OPML XML
export async function GET() {
  try {
    const sources = await prisma.source.findMany({
      orderBy: { name: "asc" },
    });

    // Group sources by category
    const grouped: Record<string, typeof sources> = {};
    for (const source of sources) {
      const cat = source.category || "other";
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(source);
    }

    const CATEGORY_LABELS: Record<string, string> = {
      policy: "정책·기관",
      macro: "매크로·경제",
      global: "글로벌·국제",
      fx: "환율·증권",
      semicon: "반도체·기술",
      other: "기타",
    };

    const escapeXml = (str: string) =>
      str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");

    let body = "";
    for (const [category, catSources] of Object.entries(grouped)) {
      const label = CATEGORY_LABELS[category] || category;
      body += `      <outline text="${escapeXml(label)}" title="${escapeXml(label)}">\n`;
      for (const source of catSources) {
        body += `        <outline type="rss" text="${escapeXml(source.name)}" title="${escapeXml(source.name)}" xmlUrl="${escapeXml(source.feedUrl)}" category="${escapeXml(category)}" />\n`;
      }
      body += `      </outline>\n`;
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head>
    <title>Ryzm Finance Sources</title>
  </head>
  <body>
${body}  </body>
</opml>`;

    return new NextResponse(xml, {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Content-Disposition": 'attachment; filename="ryzm-sources.opml"',
      },
    });
  } catch (err) {
    console.error("[api/sources/opml/GET] error:", err);
    return NextResponse.json(
      { error: "Failed to export OPML" },
      { status: 500 }
    );
  }
}

// POST /api/sources/opml — Import sources from OPML XML
export async function POST(request: NextRequest) {
  try {
    const xmlText = await request.text();

    if (!xmlText.trim()) {
      return NextResponse.json(
        { error: "Empty OPML content" },
        { status: 400 }
      );
    }

    // Simple XML parsing — extract outline elements with type="rss"
    const outlineRegex = /<outline[^>]*type=["']rss["'][^>]*\/?>/gi;
    const matches = xmlText.match(outlineRegex);

    if (!matches || matches.length === 0) {
      return NextResponse.json(
        { imported: 0, skipped: 0, errors: ["No RSS outline elements found in OPML"] },
        { status: 200 }
      );
    }

    const getAttr = (tag: string, attr: string): string => {
      const regex = new RegExp(`${attr}=["']([^"']*)["']`, "i");
      const match = tag.match(regex);
      return match ? match[1] : "";
    };

    const unescapeXml = (str: string) =>
      str
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'");

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    // Detect parent category from enclosing outline
    const categoryMap: Record<string, string> = {
      "정책·기관": "policy",
      "매크로·경제": "macro",
      "글로벌·국제": "global",
      "환율·증권": "fx",
      "반도체·기술": "semicon",
    };

    for (const tag of matches) {
      const xmlUrl = unescapeXml(getAttr(tag, "xmlUrl"));
      const text = unescapeXml(getAttr(tag, "text") || getAttr(tag, "title"));
      const categoryAttr = unescapeXml(getAttr(tag, "category"));

      if (!xmlUrl) {
        errors.push(`Outline missing xmlUrl: ${text || "(unnamed)"}`);
        continue;
      }

      // Validate URL
      try {
        new URL(xmlUrl);
      } catch {
        errors.push(`Invalid URL for "${text}": ${xmlUrl}`);
        continue;
      }

      const name = text || xmlUrl;
      const category = categoryAttr || categoryMap[text] || "macro";

      try {
        // Check if source already exists by feedUrl
        const existing = await prisma.source.findUnique({
          where: { feedUrl: xmlUrl },
        });

        if (existing) {
          skipped++;
          continue;
        }

        await prisma.source.create({
          data: {
            name,
            feedUrl: xmlUrl,
            category,
            enabled: true,
          },
        });
        imported++;
      } catch (err) {
        errors.push(`Failed to import "${name}": ${err instanceof Error ? err.message : "Unknown error"}`);
      }
    }

    return NextResponse.json({ imported, skipped, errors });
  } catch (err) {
    console.error("[api/sources/opml/POST] error:", err);
    return NextResponse.json(
      { error: "Failed to import OPML" },
      { status: 500 }
    );
  }
}
