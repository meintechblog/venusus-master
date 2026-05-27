import Link from "next/link";
import { Suspense } from "react";
import { headers } from "next/headers";
import { SourceBadge } from "@/components/source-badge";
import { HeroSearch } from "@/components/hero-search";
import type { SearchResult } from "@/lib/types";
import { ArrowUpRight, Hash, ExternalLink } from "lucide-react";
import { getCategory } from "@/lib/data";
import { formatDate } from "@/lib/utils";

interface PageProps {
  searchParams: Promise<{ q?: string }>;
}

async function fetchResults(q: string) {
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  const url = `${proto}://${host}/api/search`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ q }),
    cache: "no-store",
  });
  if (!res.ok) return { query: q, results: [] as SearchResult[], took: 0 };
  return (await res.json()) as {
    query: string;
    results: SearchResult[];
    took: number;
  };
}

export default async function SearchPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const data = q ? await fetchResults(q) : { query: "", results: [], took: 0 };

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      {/* Breadcrumb / context */}
      <div className="flex items-center gap-2 font-mono text-[11px] tracking-microcaps uppercase text-ink-faint mb-8">
        <Link href="/" className="hover:text-ink transition-colors">
          Index
        </Link>
        <span>/</span>
        <span className="text-ink">Search</span>
      </div>

      {/* Query bar */}
      <div className="mb-10">
        <HeroSearch />
      </div>

      {/* Result header */}
      {q ? (
        <div className="flex items-end justify-between mb-6 border-b border-line pb-4">
          <div>
            <div className="label-micro text-ink-faint mb-2">Results for</div>
            <h1 className="font-display text-[32px] tracking-tighter text-ink">
              “{q}”
            </h1>
          </div>
          <div className="font-mono text-[11px] tracking-microcaps uppercase text-ink-faint">
            <Suspense>
              <span className="text-ink">{data.results.length}</span> matches ·{" "}
              <span className="text-signal">{data.took.toFixed(2)}ms</span>
            </Suspense>
          </div>
        </div>
      ) : (
        <div className="mb-10 p-8 plate rounded-md text-center">
          <div className="label-micro text-ink-faint mb-2">Empty query</div>
          <p className="text-[14px] text-ink-muted">
            Type something into the search bar — or hit{" "}
            <kbd className="px-1.5 py-0.5 rounded-xs bg-bg-subtle border border-line font-mono text-[11px]">
              ⌘K
            </kbd>{" "}
            for the command palette.
          </p>
        </div>
      )}

      {/* Results list */}
      <div className="space-y-3">
        {data.results.map((r, i) => (
          <ResultCard key={r.id} result={r} index={i} />
        ))}
      </div>

      {q && data.results.length === 0 && (
        <div className="p-12 plate rounded-md text-center">
          <div className="label-micro text-ink-faint mb-3">No matches</div>
          <p className="text-[14px] text-ink-muted">
            Nothing in the index matches{" "}
            <span className="text-ink font-mono">&quot;{q}&quot;</span> yet.
          </p>
        </div>
      )}
    </div>
  );
}

function ResultCard({
  result,
  index,
}: {
  result: SearchResult;
  index: number;
}) {
  const cat = getCategory(result.category);

  return (
    <article
      className="plate rounded-md p-5 hover:border-line-strong transition-colors animate-fade-up"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="flex items-center gap-2 flex-wrap mb-2.5">
        <SourceBadge type={result.sourceType} />
        {cat && (
          <Link
            href={`/category/${cat.slug}`}
            className="inline-flex items-center gap-1 px-2 h-5 rounded-xs border border-line bg-bg font-mono text-[10px] tracking-microcaps uppercase text-ink-subtle hover:text-ink hover:border-line-strong transition-colors"
          >
            <Hash className="w-2.5 h-2.5" />
            {cat.title}
          </Link>
        )}
        <span className="font-mono text-[10px] tracking-microcaps uppercase text-ink-faint">
          {formatDate(result.lastUpdated)}
        </span>
        <span className="ml-auto font-mono text-[10px] tracking-microcaps uppercase text-ink-faint">
          score{" "}
          <span className="text-signal tabular-nums">
            {result.matchScore.toFixed(0)}
          </span>
        </span>
      </div>

      <Link href={`/doc/${result.id}`} className="group block">
        <h2 className="font-display text-[22px] leading-tight tracking-tighter text-ink group-hover:text-signal transition-colors">
          {result.title}
        </h2>
      </Link>

      <p
        className="mt-2 text-[14px] leading-relaxed text-ink-muted"
        dangerouslySetInnerHTML={{ __html: result.snippet }}
      />

      <div className="mt-4 pt-3 border-t border-line flex items-center justify-between font-mono text-[11px] text-ink-faint">
        <span className="truncate max-w-[60%]">{result.internalPath}</span>
        <div className="flex items-center gap-3 shrink-0">
          {result.sourceUrl && (
            <a
              href={result.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 hover:text-signal transition-colors"
            >
              source <ExternalLink className="w-3 h-3" />
            </a>
          )}
          <Link
            href={`/doc/${result.id}`}
            className="inline-flex items-center gap-1 text-signal hover:opacity-80 transition-opacity"
          >
            View full <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </article>
  );
}
