import { NextRequest, NextResponse } from "next/server";
import { DOCS } from "@/lib/data";
import type { SearchResult } from "@/lib/types";

export const runtime = "nodejs";

// Highlight occurrences of every query token, returning a wrapped snippet.
function highlight(source: string, tokens: string[]): string {
  if (!tokens.length) return source;
  const escaped = tokens
    .filter(Boolean)
    .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (!escaped.length) return source;
  const re = new RegExp(`(${escaped.join("|")})`, "gi");
  return source.replace(re, "<mark>$1</mark>");
}

function buildSnippet(doc: (typeof DOCS)[number], tokens: string[]): string {
  // Combine title + summary + tags for the snippet pool, prefer summary.
  const pool =
    doc.summary +
    " · " +
    doc.tags.map((t) => "#" + t).join(" ") +
    (doc.body ? " · " + doc.body.replace(/\n+/g, " ").slice(0, 320) : "");

  // Find first match position for a context window.
  let firstMatch = -1;
  for (const t of tokens) {
    const i = pool.toLowerCase().indexOf(t.toLowerCase());
    if (i >= 0 && (firstMatch === -1 || i < firstMatch)) firstMatch = i;
  }

  let window: string;
  if (firstMatch < 0) {
    window = pool.slice(0, 200);
  } else {
    const start = Math.max(0, firstMatch - 60);
    const end = Math.min(pool.length, firstMatch + 200);
    window = (start > 0 ? "…" : "") + pool.slice(start, end) + (end < pool.length ? "…" : "");
  }

  return highlight(window, tokens);
}

function scoreDoc(doc: (typeof DOCS)[number], tokens: string[]): number {
  let score = 0;
  const haystacks: [string, number][] = [
    [doc.title, 4],
    [doc.summary, 2],
    [doc.tags.join(" "), 2],
    [doc.body ?? "", 1],
  ];
  for (const [text, weight] of haystacks) {
    const lc = text.toLowerCase();
    for (const t of tokens) {
      const tLc = t.toLowerCase();
      let idx = 0;
      while ((idx = lc.indexOf(tLc, idx)) !== -1) {
        score += weight;
        idx += tLc.length;
      }
    }
  }
  return score;
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const q: string = typeof body?.q === "string" ? body.q : "";
  const tokens = q
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!tokens.length) {
    return NextResponse.json({
      query: q,
      results: [] as SearchResult[],
      took: 0,
    });
  }

  const t0 = performance.now();
  const scored = DOCS.map((d) => ({ d, s: scoreDoc(d, tokens) }))
    .filter(({ s }) => s > 0)
    .sort((a, b) => b.s - a.s);

  const results: SearchResult[] = scored.map(({ d, s }) => ({
    id: d.slug,
    title: d.title,
    snippet: buildSnippet(d, tokens),
    category: d.category,
    sourceType: d.sourceType,
    sourceUrl: d.sourceUrl,
    internalPath: d.internalPath,
    matchScore: s,
    lastUpdated: d.lastUpdated,
  }));

  return NextResponse.json({
    query: q,
    results,
    took: Math.round((performance.now() - t0) * 100) / 100,
  });
}

// Allow GET ?q=… for convenience.
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") ?? "";
  return POST(
    new NextRequest(request.url, {
      method: "POST",
      body: JSON.stringify({ q }),
      headers: { "content-type": "application/json" },
    }),
  );
}
