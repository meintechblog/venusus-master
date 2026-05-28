import { listFindingsChronological } from "@/lib/db";
import { DocRow } from "@/components/doc-row";
import { Zap } from "lucide-react";

// Render on demand: this page is DB-backed, so don't prerender it at build time
// (a DB blip during build must not fail the whole deploy). Mirrors the homepage.
export const dynamic = "force-dynamic";

export default async function FindingsPage() {
  let rows: Awaited<ReturnType<typeof listFindingsChronological>> = [];
  try {
    rows = await listFindingsChronological();
  } catch {
    // DB unreachable — render an empty findings list rather than 500.
  }
  const findings = rows.map((r) => ({
    slug: r.slug as string,
    title: r.title as string,
    summary: (r.summary ?? "") as string,
    category: (r.category ?? "findings-and-decisions") as never,
    sourceType: (r.sourceType ?? "own-findings") as never,
    sourceUrl: (r.sourceUrl ?? undefined) as string | undefined,
    internalPath: (r.internalPath ?? "") as string,
    lastUpdated: new Date(r.lastUpdated).toISOString(),
    readingTime: 3,
    tags: (r.tags ?? []) as string[],
  }));

  const groups = new Map<string, typeof findings>();
  for (const f of findings) {
    const d = new Date(f.lastUpdated);
    const key = d.toLocaleDateString("en-GB", {
      year: "numeric",
      month: "long",
    });
    const existing = groups.get(key) ?? [];
    existing.push(f);
    groups.set(key, existing);
  }

  return (
    <>
      <section className="relative border-b border-line overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-[280px] bg-[radial-gradient(ellipse_at_30%_0%,hsl(var(--amber)/0.12),transparent_60%)]" />

        <div className="relative mx-auto max-w-5xl px-6 pt-14 pb-14">
          <div className="flex items-center gap-2 mb-6">
            <Zap className="w-4 h-4 text-amber" />
            <span className="font-mono text-[11px] tracking-microcaps uppercase text-amber">
              Own findings · Chronological
            </span>
          </div>

          <h1 className="font-display text-[56px] md:text-[72px] leading-[0.95] tracking-tightest text-ink max-w-3xl">
            What the manuals{" "}
            <span className="italic text-ink-subtle">don&apos;t</span> tell you.
          </h1>

          <p className="mt-5 max-w-2xl text-[16px] text-ink-muted leading-relaxed">
            Every undocumented dbus path, every silent regression, every
            three-AM bisect — captured here before it slips through the cracks.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-12">
        {Array.from(groups.entries()).map(([month, docs]) => (
          <div key={month} className="mb-10">
            <div className="sticky top-14 z-10 bg-bg/80 backdrop-blur-sm border-b border-line pb-2 mb-3 flex items-baseline justify-between">
              <h2 className="font-display text-[20px] tracking-tighter text-ink">
                {month}
              </h2>
              <span className="font-mono text-[10px] tracking-microcaps uppercase text-ink-faint">
                {docs.length} entries
              </span>
            </div>
            <div>
              {docs.map((d) => (
                <DocRow key={d.slug} doc={d} />
              ))}
            </div>
          </div>
        ))}
      </section>
    </>
  );
}
