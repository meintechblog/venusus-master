import { notFound } from "next/navigation";
import Link from "next/link";
import { DOCS, getCategory, getDoc } from "@/lib/data";
import { DocRenderer, extractHeadings } from "@/components/doc-renderer";
import { DocToc } from "@/components/doc-toc";
import { SourceBadge } from "@/components/source-badge";
import { ArrowLeft, Clock, ExternalLink, FileText } from "lucide-react";
import { formatDate } from "@/lib/utils";

export const dynamicParams = false;

export function generateStaticParams() {
  return DOCS.map((d) => ({ slug: d.slug }));
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

const PLACEHOLDER_BODY = `# This document is in the index but the body has not been ingested yet.

The metadata is recorded — but the full markdown body is not yet vendored into this build of the knowledge base. It will appear here as soon as the source repository is synced.

## What you can do

- Check the *Source* link above to read the original.
- Use ⌘K to search other entries on the same topic.
- Pin this URL — once the body is ingested, it'll render here automatically.

---

> **Stub note** — pages render with a minimal scaffold while the corpus is bootstrapped. No content has been lost; this is the initial seed.
`;

export default async function DocPage({ params }: PageProps) {
  const { slug } = await params;
  const doc = getDoc(slug);
  if (!doc) notFound();

  const cat = getCategory(doc.category);
  const body = doc.body ?? PLACEHOLDER_BODY;
  const headings = extractHeadings(body);

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 font-mono text-[11px] tracking-microcaps uppercase text-ink-faint mb-8">
        <Link href="/" className="hover:text-ink transition-colors">
          Index
        </Link>
        <span>/</span>
        {cat && (
          <>
            <Link
              href={`/category/${cat.slug}`}
              className="hover:text-ink transition-colors"
            >
              {cat.title}
            </Link>
            <span>/</span>
          </>
        )}
        <span className="text-ink-muted truncate max-w-[40ch]">
          {doc.slug}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-12">
        {/* Main column */}
        <div className="min-w-0 max-w-3xl">
          {/* Doc header */}
          <header className="mb-10 pb-8 border-b border-line">
            <div className="flex items-center gap-2 flex-wrap mb-5">
              <SourceBadge type={doc.sourceType} />
              <span className="font-mono text-[10px] tracking-microcaps uppercase text-ink-faint flex items-center gap-1.5">
                <Clock className="w-2.5 h-2.5" />
                {doc.readingTime} min read
              </span>
              <span className="font-mono text-[10px] tracking-microcaps uppercase text-ink-faint">
                Updated {formatDate(doc.lastUpdated)}
              </span>
            </div>

            <h1 className="font-display text-[44px] md:text-[52px] leading-[1.02] tracking-tightest text-ink">
              {doc.title}
            </h1>

            <p className="mt-4 text-[17px] text-ink-muted leading-relaxed">
              {doc.summary}
            </p>

            {/* Metadata strip */}
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-px bg-line border border-line rounded-sm overflow-hidden text-[12px]">
              <MetaCell
                label="Source"
                value={
                  doc.sourceUrl ? (
                    <a
                      href={doc.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-signal hover:opacity-80"
                    >
                      {hostnameOf(doc.sourceUrl)}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="text-ink-faint">— local —</span>
                  )
                }
              />
              <MetaCell
                label="Internal path"
                value={
                  <span className="font-mono text-ink flex items-center gap-1.5">
                    <FileText className="w-3 h-3 text-ink-faint" />
                    {doc.internalPath}
                  </span>
                }
              />
            </div>

            {doc.tags.length > 0 && (
              <div className="mt-5 flex items-center gap-2 flex-wrap">
                {doc.tags.map((t) => (
                  <Link
                    key={t}
                    href={`/search?q=${encodeURIComponent(t)}`}
                    className="font-mono text-[11px] px-2 h-5 rounded-xs border border-line bg-bg-subtle hover:border-line-strong hover:text-ink transition-colors text-ink-muted inline-flex items-center"
                  >
                    #{t}
                  </Link>
                ))}
              </div>
            )}
          </header>

          {/* Body */}
          <DocRenderer markdown={body} />

          {/* Footer nav */}
          <footer className="mt-16 pt-8 border-t border-line flex items-center justify-between">
            <Link
              href={cat ? `/category/${cat.slug}` : "/"}
              className="inline-flex items-center gap-1.5 font-mono text-[11px] tracking-microcaps uppercase text-ink-muted hover:text-signal transition-colors"
            >
              <ArrowLeft className="w-3 h-3" />
              {cat ? cat.title : "Index"}
            </Link>
            <Link
              href={`/search?q=${encodeURIComponent(doc.tags[0] ?? "")}`}
              className="font-mono text-[11px] tracking-microcaps uppercase text-ink-muted hover:text-signal transition-colors"
            >
              More on #{doc.tags[0]} →
            </Link>
          </footer>
        </div>

        {/* TOC sidebar */}
        <aside>
          <DocToc headings={headings} />
        </aside>
      </div>
    </div>
  );
}

function MetaCell({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="bg-bg-subtle p-3">
      <div className="label-micro text-ink-faint mb-1">{label}</div>
      <div className="text-ink truncate">{value}</div>
    </div>
  );
}

function hostnameOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
