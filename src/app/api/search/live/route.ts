import { NextRequest, NextResponse } from "next/server";
import { liveSearchTitles } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? 8), 20);
  if (q.length < 2) return NextResponse.json({ query: q, results: [] });
  try {
    const results = await liveSearchTitles(q, limit);
    return NextResponse.json({ query: q, results });
  } catch (err) {
    return NextResponse.json(
      { query: q, results: [], error: err instanceof Error ? err.message : "search failed" },
      { status: 500 }
    );
  }
}
