import Link from "next/link";
import { HeroSearch } from "@/components/hero-search";
import { CategoryTile } from "@/components/category-tile";
import { SourceBadge } from "@/components/source-badge";
import { LiveStats } from "@/components/live-stats";
import { CATEGORIES, DOCS, getFindings } from "@/lib/data";
import { ArrowRight, Cpu, GitPullRequest, Zap } from "lucide-react";
import { formatDate, timeAgo } from "@/lib/utils";
import { getStats } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  // Server-rendered initial snapshot (avoids empty-state flicker); the LiveStats
  // client component then subscribes to /api/stats/stream for live updates.
  let initialStats = {};
  try {
    const s = await getStats();
    initialStats = {
      document_count: s.documentCount,
      chunk_count: s.chunkCount,
      source_type_count: s.sourceTypeCount,
      victron_official_count: s.victronOfficialCount,
      community_driver_count: s.communityDriverCount,
      own_findings_count: s.ownFindingsCount,
      pdf_count: s.pdfCount,
      pro_portal_count: s.proPortalCount,
      live_doc_count: s.liveDocCount,
      memory_count: s.memoryCount,
      source_repo_count: s.sourceRepoCount,
      db_size_bytes: s.dbSizeBytes,
      last_ingest_at: s.lastIngestAt,
    };
  } catch {
    // DB not reachable in dev — LiveStats falls back to em-dashes.
  }
  const recent = [...DOCS]
    .sort(
      (a, b) =>
        new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime(),
    )
    .slice(0, 5);
  const latestFinding = getFindings()[0];

  return (
    <>
      {/* HERO */}
      <section className="relative border-b border-line overflow-hidden">
        {/* grid background */}
        <div className="absolute inset-0 bg-grid opacity-40 [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_75%)]" />
        {/* spotlight wash */}
        <div className="absolute inset-x-0 top-0 h-[480px] bg-[radial-gradient(ellipse_at_50%_0%,hsl(var(--signal)/0.08),transparent_60%)]" />

        <div className="relative mx-auto max-w-7xl px-6 pt-20 pb-24">
          {/* deck headline */}
          <div className="flex items-center gap-3 mb-10">
            <span
              className="w-1.5 h-1.5 rounded-full bg-signal animate-pulse"
              aria-hidden
            />
            <span className="font-mono text-[11px] tracking-microcaps uppercase text-ink-muted">
              Venus OS · Knowledge Base · Operator-grade
            </span>
          </div>

          <h1 className="font-display text-[68px] md:text-[92px] leading-[0.95] tracking-tightest text-ink max-w-4xl">
            The reference{" "}
            <span className="text-ink-subtle italic font-display">we wish</span>
            <br />
            had{" "}
            <span className="relative inline-block">
              <span className="text-signal">existed</span>
              <span
                className="absolute -bottom-1 left-0 right-0 h-px bg-signal/40"
                aria-hidden
              />
            </span>{" "}
            in 2024.
          </h1>

          <p className="mt-6 max-w-2xl text-[17px] leading-relaxed text-ink-muted">
            Searchable archive of everything we&apos;ve learned operating a{" "}
            <span className="text-ink">~90 kWh</span> DIY-pack on Victron Venus OS
            — official manuals, community drivers, and the hard-won findings
            from our own four-stack Hallbude installation.
          </p>

          {/* Search */}
          <div className="mt-10 max-w-2xl">
            <HeroSearch />
            <div className="mt-3 flex items-center gap-2.5 flex-wrap font-mono text-[11px] text-ink-faint">
              <span className="tracking-microcaps uppercase">Try:</span>
              {[
                "cell balance regression",
                "VE.Bus parallel",
                "systemcalc SoC",
                "JK-BMS",
              ].map((s) => (
                <Link
                  key={s}
                  href={`/search?q=${encodeURIComponent(s)}`}
                  className="px-2 py-0.5 rounded-xs border border-line bg-bg-subtle hover:border-signal/40 hover:text-signal transition-colors"
                >
                  {s}
                </Link>
              ))}
            </div>
          </div>

          {/* Live stats — server-rendered initial + SSE live updates */}
          <div className="mt-16">
            <LiveStats initial={initialStats} />
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="flex items-end justify-between mb-10 border-b border-line pb-5">
          <div>
            <div className="label-micro text-ink-faint mb-2">§01 — Index</div>
            <h2 className="font-display text-[36px] tracking-tighter text-ink">
              Categories
            </h2>
          </div>
          <Link
            href="/search?q="
            className="hidden md:inline-flex items-center gap-1.5 text-[12px] text-ink-muted hover:text-signal font-mono transition-colors"
          >
            Browse all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {CATEGORIES.map((c, i) => (
            <CategoryTile key={c.slug} category={c} index={i} />
          ))}
        </div>
      </section>

      {/* TWO-COL BLOCK: recent updates + featured finding */}
      <section className="mx-auto max-w-7xl px-6 pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Recent updates */}
          <div className="lg:col-span-2">
            <div className="flex items-end justify-between mb-6 border-b border-line pb-4">
              <div>
                <div className="label-micro text-ink-faint mb-2">
                  §02 — Recent
                </div>
                <h2 className="font-display text-[28px] tracking-tighter text-ink">
                  Last updated
                </h2>
              </div>
            </div>

            <ul className="divide-y divide-line border-b border-line">
              {recent.map((d, i) => (
                <li key={d.slug}>
                  <Link
                    href={`/doc/${d.slug}`}
                    className="group grid grid-cols-[auto_1fr_auto] items-center gap-5 py-4 hover:bg-bg-subtle/40 -mx-2 px-2 transition-colors duration-150"
                  >
                    <span className="font-mono text-[11px] text-ink-faint tabular-nums w-10">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <SourceBadge type={d.sourceType} />
                      </div>
                      <div className="text-[15px] text-ink group-hover:text-signal transition-colors truncate">
                        {d.title}
                      </div>
                    </div>
                    <span className="font-mono text-[11px] text-ink-faint shrink-0">
                      {timeAgo(d.lastUpdated)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Featured Finding card */}
          <div className="relative">
            <div className="label-micro text-ink-faint mb-4">
              §03 — Featured Finding
            </div>

            {latestFinding && (
              <Link
                href={`/doc/${latestFinding.slug}`}
                className="block group plate rounded-md p-6 hover:border-signal/40 transition-colors"
              >
                <div className="flex items-center gap-2 mb-5">
                  <Zap className="w-4 h-4 text-amber" />
                  <span className="font-mono text-[10px] tracking-microcaps uppercase text-amber">
                    Own Finding
                  </span>
                </div>

                <h3 className="font-display text-[24px] leading-tight tracking-tighter text-ink group-hover:text-signal transition-colors">
                  {latestFinding.title}
                </h3>

                <p className="mt-3 text-[13px] leading-relaxed text-ink-muted line-clamp-4">
                  {latestFinding.summary}
                </p>

                <div className="mt-6 pt-5 border-t border-line flex items-center justify-between font-mono text-[10px] tracking-microcaps uppercase text-ink-faint">
                  <span>{formatDate(latestFinding.lastUpdated)}</span>
                  <span className="text-signal opacity-0 group-hover:opacity-100 transition-opacity">
                    READ →
                  </span>
                </div>
              </Link>
            )}

            <div className="mt-3 grid grid-cols-2 gap-2">
              <MiniCard
                href="/category/hallbude"
                icon={<Cpu className="w-3.5 h-3.5" />}
                label="Hallbude"
                value="4 stacks"
              />
              <MiniCard
                href="/category/bug-reports"
                icon={<GitPullRequest className="w-3.5 h-3.5" />}
                label="Upstream"
                value="7 PRs"
              />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function MiniCard({
  href,
  icon,
  label,
  value,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center justify-between px-3 py-2.5 rounded-sm border border-line bg-bg-subtle hover:border-line-strong hover:bg-bg-muted transition-colors"
    >
      <div className="flex items-center gap-2 text-ink-muted group-hover:text-ink transition-colors">
        {icon}
        <span className="text-[11px] font-mono tracking-microcaps uppercase">
          {label}
        </span>
      </div>
      <span className="text-[12px] text-ink font-mono">{value}</span>
    </Link>
  );
}
