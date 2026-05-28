// Hybrid search route — pgvector (semantic) + tsvector (FTS) with RRF.
// Falls back to local DOCS stub if Postgres is unreachable, so the UI still works
// in dev before content is ingested.

import { NextRequest, NextResponse } from "next/server";
import { DOCS } from "@/lib/data";
import type { SearchResult } from "@/lib/types";
import { hybridSearch } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function fallback(q: string): SearchResult[] {
  const tokens = q.trim().split(/\s+/).filter(Boolean).map((t) => t.toLowerCase());
  if (!tokens.length) return [];
  const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(${tokens.map(escape).join("|")})`, "gi");

  return DOCS
    .map((d) => {
      const haystack = `${d.title} ${d.summary} ${d.tags.join(" ")} ${d.body ?? ""}`.toLowerCase();
      let score = 0;
      for (const t of tokens) {
        let idx = 0;
        while ((idx = haystack.indexOf(t, idx)) !== -1) {
          score += 1;
          idx += t.length;
        }
      }
      return { d, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ d, score }) => ({
      id: d.slug,
      title: d.title,
      snippet: (d.summary + (d.body ? " · " + d.body.slice(0, 200) : "")).replace(re, "<mark>$1</mark>"),
      category: d.category,
      sourceType: d.sourceType,
      sourceUrl: d.sourceUrl,
      internalPath: d.internalPath,
      matchScore: score,
      lastUpdated: d.lastUpdated,
    }));
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const q: string = typeof body?.q === "string" ? body.q : "";
  if (!q.trim()) {
    return NextResponse.json({ query: q, results: [], took: 0 });
  }

  const t0 = performance.now();
  try {
    const hits = await hybridSearch(q, 30);
    const results: SearchResult[] = hits.map((h) => ({
      id: h.slug,
      title: h.title,
      snippet: h.snippet,
      category: h.category as SearchResult["category"],
      sourceType: h.sourceType as SearchResult["sourceType"],
      sourceUrl: h.sourceUrl ?? undefined,
      internalPath: h.internalPath,
      matchScore: h.matchScore,
      lastUpdated: h.lastUpdated,
      headingPath: h.headingPath,
    }));
    return NextResponse.json({
      query: q,
      results,
      took: Math.round((performance.now() - t0) * 100) / 100,
      engine: "hybrid-pgvector",
    });
  } catch (e: unknown) {
    // Fallback to local stub so the UI doesn't break before DB is ready
    const results = fallback(q);
    return NextResponse.json({
      query: q,
      results,
      took: Math.round((performance.now() - t0) * 100) / 100,
      engine: "fallback-stub",
      warn: String(e),
    });
  }
}

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
