"use client";

import { useEffect, useState } from "react";

type Stats = {
  document_count?: number;
  chunk_count?: number;
  source_type_count?: number;
  victron_official_count?: number;
  community_driver_count?: number;
  own_findings_count?: number;
  pdf_count?: number;
  pro_portal_count?: number;
  live_doc_count?: number;
  memory_count?: number;
  source_repo_count?: number;
  db_size_bytes?: number;
  last_ingest_at?: string;
};

function formatBytes(b: number | undefined) {
  if (!b) return "—";
  const units = ["B", "kB", "MB", "GB"];
  let n = b;
  let u = 0;
  while (n > 1024 && u < units.length - 1) {
    n /= 1024;
    u++;
  }
  return `${n.toFixed(n < 10 ? 1 : 0)} ${units[u]}`;
}

function formatRelTime(iso?: string) {
  if (!iso) return "never";
  const t = new Date(iso).getTime();
  const diff = Date.now() - t;
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

type Props = { initial?: Stats };

export function LiveStats({ initial = {} }: Props) {
  const [stats, setStats] = useState<Stats>(initial);
  const [live, setLive] = useState(false);

  useEffect(() => {
    const es = new EventSource("/api/stats/stream");
    es.addEventListener("stats", (ev) => {
      try {
        setStats(JSON.parse((ev as MessageEvent).data));
        setLive(true);
      } catch {
        /* ignore */
      }
    });
    es.onerror = () => setLive(false);
    return () => es.close();
  }, []);

  const tiles: Array<{ label: string; value: string; sub?: string; accent?: boolean }> = [
    {
      label: "Documents",
      value: String(stats.document_count ?? "—"),
      sub: "indexed across all sources",
      accent: true,
    },
    {
      label: "Chunks",
      value: String(stats.chunk_count ?? "—"),
      sub: "with vector embeddings",
    },
    {
      label: "Source Types",
      value: String(stats.source_type_count ?? "—"),
      sub: `${stats.victron_official_count ?? 0} victron · ${stats.community_driver_count ?? 0} community · ${stats.own_findings_count ?? 0} own`,
    },
    {
      label: "Database",
      value: formatBytes(stats.db_size_bytes),
      sub: `last ingest ${formatRelTime(stats.last_ingest_at)}`,
    },
  ];

  return (
    <section className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
      {tiles.map((tile, i) => (
        <div
          key={tile.label}
          className="relative overflow-hidden rounded-lg border border-[color:var(--line)] bg-[color:var(--surface-1)]/60 p-4 transition-colors hover:border-[color:var(--line-strong)] sm:p-5"
          style={{ animation: `fadeUp 600ms ${i * 60}ms both ease-out` }}
        >
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--muted)]">
              {tile.label}
            </span>
            {tile.accent && (
              <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-[color:var(--muted)]">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${live ? "bg-[color:var(--signal)]" : "bg-[color:var(--muted)]"}`}
                  style={live ? { boxShadow: "0 0 8px var(--signal)" } : undefined}
                />
                {live ? "live" : "offline"}
              </span>
            )}
          </div>
          <div className="mt-3 font-serif text-3xl tabular-nums tracking-tight sm:text-4xl">
            {tile.value}
          </div>
          {tile.sub && (
            <div className="mt-2 font-mono text-[10px] leading-relaxed text-[color:var(--muted)]">
              {tile.sub}
            </div>
          )}
        </div>
      ))}
    </section>
  );
}
