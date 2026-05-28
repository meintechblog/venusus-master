"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, CornerDownLeft } from "lucide-react";
import { SourceBadge } from "./source-badge";

const PLACEHOLDERS = [
  "dbus-serialbattery cell balance regression",
  "MultiPlus-II VE.Bus terminator placement",
  "systemcalc SoC pinning",
  "ESS three-phase imbalance L2",
  "JK-BMS active balance current path",
];

type LiveHit = {
  slug: string;
  title: string;
  summary: string;
  sourceType: string;
  category: string;
};

export function HeroSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<LiveHit[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const placeholder = PLACEHOLDERS[0];
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLFormElement | null>(null);

  // Debounced live search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = q.trim();
    if (trimmed.length < 2) {
      setHits([]);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const resp = await fetch(`/api/search/live?q=${encodeURIComponent(trimmed)}`);
        const data = (await resp.json()) as { results: LiveHit[] };
        setHits(data.results ?? []);
        setOpen((data.results ?? []).length > 0);
        setActiveIdx(0);
      } catch {
        setHits([]);
        setOpen(false);
      }
    }, 140);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [q]);

  // Click outside closes dropdown
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    window.addEventListener("mousedown", onDocClick);
    return () => window.removeEventListener("mousedown", onDocClick);
  }, []);

  const submit = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault();
      const trimmed = q.trim();
      if (!trimmed) return;
      if (open && hits[activeIdx]) {
        router.push(`/doc/${hits[activeIdx].slug}`);
        return;
      }
      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    },
    [q, router, open, hits, activeIdx],
  );

  const openPalette = useCallback(() => {
    window.dispatchEvent(new CustomEvent("venusus:open-palette"));
  }, []);

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || hits.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => (i + 1) % hits.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => (i - 1 + hits.length) % hits.length);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <form
      ref={containerRef}
      onSubmit={submit}
      className="group relative"
      role="search"
      aria-label="Knowledge base search"
    >
      <div className="absolute -inset-px rounded-lg bg-gradient-to-r from-signal/20 via-transparent to-signal/20 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300" />
      <div className="relative flex items-center gap-3 h-14 px-5 rounded-lg border border-line glass shadow-plate transition-colors duration-200 group-focus-within:border-signal/50">
        <Search
          className="w-4 h-4 text-ink-subtle shrink-0"
          strokeWidth={2.25}
        />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => hits.length > 0 && setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          className="flex-1 h-full bg-transparent text-[15px] text-ink placeholder:text-ink-faint outline-none border-0"
          autoComplete="off"
          spellCheck={false}
          aria-autocomplete="list"
          aria-controls="hero-search-listbox"
        />
        <button
          type="button"
          onClick={openPalette}
          className="hidden sm:flex items-center gap-1.5 px-2 h-7 rounded-xs border border-line bg-bg-subtle hover:bg-bg-muted text-[11px] font-mono text-ink-subtle transition-colors"
          aria-label="Open full command palette"
        >
          <kbd>⌘K</kbd>
        </button>
        {q && (
          <button
            type="submit"
            className="flex items-center gap-1.5 px-2.5 h-7 rounded-xs bg-signal/15 border border-signal/40 text-signal text-[11px] font-mono hover:bg-signal/25 transition-colors"
          >
            Run
            <CornerDownLeft className="w-3 h-3" />
          </button>
        )}
      </div>

      {open && hits.length > 0 && (
        <ul
          id="hero-search-listbox"
          role="listbox"
          className="absolute z-30 top-[calc(100%+6px)] left-0 right-0 max-h-[420px] overflow-y-auto rounded-lg border border-line bg-bg-subtle/95 backdrop-blur shadow-plate divide-y divide-line"
        >
          {hits.map((h, i) => (
            <li key={h.slug} role="option" aria-selected={i === activeIdx}>
              <Link
                href={`/doc/${h.slug}`}
                onClick={() => setOpen(false)}
                onMouseEnter={() => setActiveIdx(i)}
                className={
                  "block px-4 py-3 transition-colors " +
                  (i === activeIdx
                    ? "bg-signal/10 text-ink"
                    : "text-ink-muted hover:bg-bg-muted")
                }
              >
                <div className="flex items-center gap-2 mb-1">
                  <SourceBadge type={h.sourceType as never} />
                  <span className="font-mono text-[10px] tracking-microcaps uppercase text-ink-faint">
                    {h.category}
                  </span>
                </div>
                <div className="text-[14px] text-ink leading-snug">
                  {h.title}
                </div>
                {h.summary && (
                  <div className="text-[12px] text-ink-faint mt-0.5 line-clamp-1">
                    {h.summary}
                  </div>
                )}
              </Link>
            </li>
          ))}
          <li className="px-4 py-2 text-[11px] font-mono text-ink-faint flex items-center justify-between">
            <span>↑↓ navigate · ↵ open · esc dismiss</span>
            <button
              type="submit"
              className="text-signal hover:opacity-80"
            >
              Full search →
            </button>
          </li>
        </ul>
      )}
    </form>
  );
}
