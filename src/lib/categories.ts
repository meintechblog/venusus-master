// Single source of truth for category display metadata, keyed by the REAL
// category slugs that exist in the database (victron-official, community-drivers,
// our-installation, …). Used by the homepage, search results and the command
// palette so the three surfaces stay in sync and unknown slugs degrade gracefully.

export type CategoryHue = "signal" | "amber" | "rust" | "moss" | "plum";

export type CategoryMeta = {
  slug: string;
  title: string;
  blurb: string;
  hue: CategoryHue;
  glyph: string; // single-character monogram for tiles
};

const META: Record<string, Omit<CategoryMeta, "slug">> = {
  "victron-official": {
    title: "Victron Official",
    blurb: "Datasheets, source repos, wikis, live docs.",
    hue: "signal",
    glyph: "Ω",
  },
  "community-drivers": {
    title: "Community Drivers",
    blurb: "mr-manuel, BatteryAggregator, mqtt-bridges.",
    hue: "moss",
    glyph: "≈",
  },
  "our-installation": {
    title: "Our Installation",
    blurb: "Hallbude ~90 kWh DIY-pack — audit, protection, applied changes.",
    hue: "amber",
    glyph: "▣",
  },
  "findings-and-decisions": {
    title: "Findings & Decisions",
    blurb: "Undocumented behavior, deltas, persisted memory.",
    hue: "rust",
    glyph: "✦",
  },
  "community-blogs": {
    title: "Community Blogs",
    blurb: "meintechblog mirrors, forum threads.",
    hue: "plum",
    glyph: "✎",
  },
  "pro-portal": {
    title: "Pro Portal",
    blurb: "Victron Professional — firmware, dropbox, developer docs.",
    hue: "signal",
    glyph: "⌁",
  },
  misc: {
    title: "Misc",
    blurb: "Uncategorized — still to be sorted.",
    hue: "plum",
    glyph: "·",
  },
};

function titleCase(slug: string): string {
  return slug.replace(/-/g, " ").replace(/\b\w/g, (x) => x.toUpperCase());
}

// Always returns a usable meta object — known slugs get curated copy, unknown
// slugs fall back to a title-cased label so nothing renders blank.
export function categoryMeta(slug: string): CategoryMeta {
  const m = META[slug];
  if (m) return { slug, ...m };
  return { slug, title: titleCase(slug), blurb: "", hue: "signal", glyph: "·" };
}
