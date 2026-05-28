export type SourceType =
  | "victron-official"
  | "community-driver"
  | "own-findings"
  | "pdf-manual"
  | "live-doc"
  | "pro-portal"
  | "source-repo"
  | "memory";

export type CategorySlug =
  | "venus-os-dbus"
  | "ess-multi-phase"
  | "dbus-serialbattery"
  | "battery-aggregator"
  | "multiplus-ii"
  | "hallbude"
  | "findings"
  | "bug-reports";

export interface Category {
  slug: CategorySlug;
  title: string;
  blurb: string;
  count: number;
  hue: "signal" | "amber" | "rust" | "moss" | "plum";
  glyph: string; // single-character monogram for the tile
}

export interface Doc {
  slug: string;
  title: string;
  summary: string;
  category: CategorySlug;
  sourceType: SourceType;
  sourceUrl?: string;
  internalPath: string;
  lastUpdated: string; // ISO
  readingTime: number; // minutes
  tags: string[];
  body?: string; // markdown — only loaded for /doc/[slug]
}

export interface SearchResult {
  id: string;
  title: string;
  snippet: string; // contains <mark>…</mark>
  category: CategorySlug;
  sourceType: SourceType;
  sourceUrl?: string;
  internalPath: string;
  matchScore: number;
  lastUpdated: string;
}

export const SOURCE_TYPE_LABELS: Record<SourceType, string> = {
  "victron-official": "Victron · Official",
  "community-driver": "Community Driver",
  "own-findings": "Own Findings",
  "pdf-manual": "PDF Manual",
  "live-doc": "Live Doc",
  "pro-portal": "Pro Portal",
  "source-repo": "Source Repo",
  memory: "Memory",
};

export const SOURCE_TYPE_HUE: Record<SourceType, string> = {
  "victron-official": "signal",
  "community-driver": "moss",
  "own-findings": "amber",
  "pdf-manual": "plum",
  "live-doc": "rust",
  "pro-portal": "signal",
  "source-repo": "moss",
  memory: "amber",
};
