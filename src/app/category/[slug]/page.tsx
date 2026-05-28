import { notFound } from "next/navigation";
import Link from "next/link";
import { listAllCategorySlugs, listDocumentsByCategory } from "@/lib/db";
import { DocRow } from "@/components/doc-row";
import { cn } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";

export const revalidate = 60;

export async function generateStaticParams() {
  try {
    const slugs = await listAllCategorySlugs();
    return slugs.map((slug) => ({ slug }));
  } catch {
    return [];
  }
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

const HUE_BG: Record<string, string> = {
  signal: "from-signal/15",
  amber: "from-amber/15",
  rust: "from-rust/15",
  moss: "from-moss/15",
  plum: "from-plum/15",
};

const HUE_TEXT: Record<string, string> = {
  signal: "text-signal",
  amber: "text-amber",
  rust: "text-rust",
  moss: "text-moss",
  plum: "text-plum",
};

const CATEGORY_META: Record<string, { title: string; blurb: string; hue: string; glyph: string }> = {
  "victron-official": { title: "Victron Official", blurb: "Official Victron documentation, datasheets, source repos and wikis.", hue: "signal", glyph: "Ω" },
  "community-drivers": { title: "Community Drivers", blurb: "mr-manuel, BatteryAggregator, dbus-mqtt-bridges and other community-maintained drivers.", hue: "moss", glyph: "≈" },
  "our-installation": { title: "Our Installation", blurb: "Hallbude ~90 kWh DIY-pack: settings audit, protection layers, cell topology, applied changes.", hue: "amber", glyph: "▣" },
  "findings-and-decisions": { title: "Findings & Decisions", blurb: "Hard-won discoveries, undocumented behavior, configuration deltas, persisted in memory.", hue: "rust", glyph: "✦" },
  "community-blogs": { title: "Community Blogs", blurb: "meintechblog mirrors, forum threads — practitioner knowledge surrounding Victron/Venus OS.", hue: "plum", glyph: "✎" },
  "pro-portal": { title: "Pro Portal", blurb: "Victron Professional Portal content — firmware, dropbox documents, developer resources.", hue: "signal", glyph: "⌁" },
  misc: { title: "Misc", blurb: "Uncategorized content still to be sorted.", hue: "plum", glyph: "·" },
};

export default async function CategoryPage({ params }: PageProps) {
  const { slug } = await params;
  const docs = await listDocumentsByCategory(slug);
  if (!docs || docs.length === 0) notFound();

  const meta = CATEGORY_META[slug] ?? {
    title: slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    blurb: `${docs.length} documents under this category.`,
    hue: "signal",
    glyph: "·",
  };
  const cat = { slug, ...meta };

  const docRows = docs.map((d) => ({
    slug: d.slug as string,
    title: d.title as string,
    summary: (d.summary ?? "") as string,
    category: slug as never,
    sourceType: d.sourceType as never,
    sourceUrl: (d.sourceUrl ?? undefined) as string | undefined,
    internalPath: "",
    lastUpdated: new Date(d.lastUpdated).toISOString(),
    readingTime: 3,
    tags: (d.tags ?? []) as string[],
  }));

  return (
    <>
      {/* Header */}
      <section className="relative border-b border-line overflow-hidden">
        <div
          className={cn(
            "absolute inset-x-0 top-0 h-[300px] bg-gradient-to-b to-transparent opacity-60 pointer-events-none",
            HUE_BG[cat.hue],
          )}
        />
        <div className="relative mx-auto max-w-5xl px-6 pt-12 pb-12">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 font-mono text-[11px] tracking-microcaps uppercase text-ink-faint hover:text-ink transition-colors mb-8"
          >
            <ArrowLeft className="w-3 h-3" /> Index
          </Link>

          <div className="flex items-start gap-5">
            <div
              className={cn(
                "flex items-center justify-center w-14 h-14 rounded-md border border-line bg-bg-subtle font-display text-[36px] leading-none",
                HUE_TEXT[cat.hue],
              )}
            >
              {cat.glyph}
            </div>
            <div className="flex-1">
              <div className="label-micro text-ink-faint mb-2">
                Category · {docs.length} documents
              </div>
              <h1 className="font-display text-[48px] leading-[1] tracking-tightest text-ink">
                {cat.title}
              </h1>
              <p className="mt-3 text-[15px] text-ink-muted max-w-2xl leading-relaxed">
                {cat.blurb}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Docs */}
      <section className="mx-auto max-w-5xl px-6 py-12">
        {docs.length === 0 ? (
          <div className="plate rounded-md p-10 text-center">
            <div className="label-micro text-ink-faint mb-2">Empty</div>
            <p className="text-[14px] text-ink-muted">
              No documents indexed in this category yet.
            </p>
          </div>
        ) : (
          <div>
            {docRows.map((d) => (
              <DocRow key={d.slug} doc={d} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
