import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Category } from "@/lib/types";

const HUE_BG: Record<Category["hue"], string> = {
  signal: "from-signal/10 to-transparent text-signal",
  amber: "from-amber/10 to-transparent text-amber",
  rust: "from-rust/10 to-transparent text-rust",
  moss: "from-moss/10 to-transparent text-moss",
  plum: "from-plum/10 to-transparent text-plum",
};

const HUE_DOT: Record<Category["hue"], string> = {
  signal: "bg-signal",
  amber: "bg-amber",
  rust: "bg-rust",
  moss: "bg-moss",
  plum: "bg-plum",
};

interface CategoryTileProps {
  category: Category;
  index: number;
}

export function CategoryTile({ category, index }: CategoryTileProps) {
  return (
    <Link
      href={`/category/${category.slug}`}
      className={cn(
        "group relative block rounded-md border border-line bg-bg-subtle p-5",
        "hover:border-line-strong hover:bg-bg-muted transition-all duration-200",
        "animate-fade-up",
      )}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* hue-gradient haze on hover */}
      <div
        className={cn(
          "absolute inset-0 rounded-md bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none",
          HUE_BG[category.hue],
        )}
        aria-hidden
      />

      <div className="relative flex items-start justify-between gap-4">
        <div
          className={cn(
            "flex items-center justify-center w-9 h-9 rounded-sm border border-line bg-bg font-display text-[22px] leading-none",
            HUE_BG[category.hue],
          )}
          aria-hidden
        >
          {category.glyph}
        </div>

        <div className="flex items-center gap-2">
          <span
            className={cn(
              "w-1 h-1 rounded-full",
              HUE_DOT[category.hue],
            )}
            aria-hidden
          />
          <span className="font-mono text-[11px] text-ink-subtle tabular-nums">
            {String(category.count).padStart(2, "0")}
          </span>
          <ArrowUpRight className="w-3.5 h-3.5 text-ink-faint group-hover:text-ink group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform duration-200" />
        </div>
      </div>

      <h3 className="relative mt-5 font-display text-[22px] leading-[1.1] tracking-tighter text-ink">
        {category.title}
      </h3>

      <p className="relative mt-2 text-[13px] leading-relaxed text-ink-muted line-clamp-3">
        {category.blurb}
      </p>

      <div className="relative mt-4 flex items-center justify-between font-mono text-[10px] tracking-microcaps uppercase text-ink-faint">
        <span>/category/{category.slug}</span>
        <span className="opacity-0 group-hover:opacity-100 transition-opacity">
          OPEN →
        </span>
      </div>
    </Link>
  );
}
