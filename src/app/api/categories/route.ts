import { NextResponse } from "next/server";
import { listAllCategories } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const cats = await listAllCategories();
    return NextResponse.json({ categories: cats });
  } catch (err) {
    return NextResponse.json(
      { categories: [], error: err instanceof Error ? err.message : "failed" },
      { status: 500 }
    );
  }
}
