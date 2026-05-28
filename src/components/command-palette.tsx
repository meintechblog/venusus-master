"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import {
  Search,
  ArrowRight,
  Hash,
  FileText,
  Clock,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { categoryMeta } from "@/lib/categories";
import { cn } from "@/lib/utils";

const RECENT_KEY = "venusus:recent-searches";

type LiveHit = {
  slug: string;
  title: string;
  summary: string;
  sourceType: string;
  category: string;
};

type CatHit = { slug: string; count: number; title: string };

function getRecent(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
  } catch {
    return [];
  }
}

function pushRecent(q: string) {
  if (!q.trim()) return;
  const prev = getRecent().filter((r) => r !== q);
  const next = [q, ...prev].slice(0, 5);
  localStorage.setItem(RECENT_KEY, JSON.stringify(next));
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [recent, setRecent] = useState<string[]>([]);
  const [hits, setHits] = useState<LiveHit[]>([]);
  const [cats, setCats] = useState<CatHit[]>([]);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // open via ⌘K / ctrl-K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("venusus:open-palette", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("venusus:open-palette", onOpen);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setRecent(getRecent());
      setQuery("");
      setHits([]);
      // small delay so the dialog mounts before focus
      requestAnimationFrame(() => inputRef.current?.focus());
      // Load real categories once (cheap; cached in state for the session).
      if (cats.length === 0) {
        fetch("/api/categories")
          .then((r) => r.json())
          .then((d: { categories?: { slug: string; count: number }[] }) => {
            setCats(
              (d.categories ?? []).map((c) => ({
                slug: c.slug,
                count: c.count,
                title: categoryMeta(c.slug).title,
              })),
            );
          })
          .catch(() => {});
      }
    }
  }, [open, cats.length]);

  // Debounced live typeahead against the real index (titles + summaries).
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setHits([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const resp = await fetch(
          `/api/search/live?q=${encodeURIComponent(trimmed)}&limit=7`,
        );
        const data = (await resp.json()) as { results?: LiveHit[] };
        setHits(data.results ?? []);
      } catch {
        setHits([]);
      }
    }, 130);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const go = useCallback(
    (href: string, andRemember?: string) => {
      if (andRemember) pushRecent(andRemember);
      setOpen(false);
      router.push(href);
    },
    [router],
  );

  const submitSearch = useCallback(() => {
    if (!query.trim()) return;
    go(`/search?q=${encodeURIComponent(query)}`, query);
  }, [query, go]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center pt-[12vh] px-4 animate-fade-up"
      role="dialog"
      aria-modal
      aria-label="Search"
    >
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-bg/60 backdrop-blur-md"
        onClick={() => setOpen(false)}
      />

      <div className="relative w-full max-w-2xl glass rounded-md overflow-hidden shadow-plate">
        {/* hairline scan-bar */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-signal/60 to-transparent" />

        <Command shouldFilter={false} className="bg-transparent">
          <div className="flex items-center gap-3 px-4 h-12 border-b border-line">
            <Search className="w-4 h-4 text-ink-subtle shrink-0" />
            <Command.Input
              ref={inputRef}
              value={query}
              onValueChange={setQuery}
              placeholder="Search the knowledge base…"
              className="flex-1 h-full bg-transparent text-[14px] text-ink placeholder:text-ink-faint outline-none border-0"
              onKeyDown={(e) => {
                if (
                  e.key === "Enter" &&
                  query.trim() &&
                  !document
                    .querySelector('[cmdk-item][data-selected="true"]')
                ) {
                  e.preventDefault();
                  submitSearch();
                }
              }}
            />
            <kbd className="hidden sm:inline-flex items-center gap-1 px-1.5 h-5 rounded-xs bg-bg border border-line font-mono text-[10px] text-ink-faint">
              ESC
            </kbd>
          </div>

          <Command.List className="max-h-[420px] overflow-y-auto p-2">
            <Command.Empty className="px-3 py-8 text-center text-[13px] text-ink-subtle">
              <div className="font-mono text-[10px] tracking-microcaps text-ink-faint uppercase mb-1">
                Nothing matched
              </div>
              Press{" "}
              <kbd className="px-1 py-0.5 rounded-xs bg-bg-subtle border border-line font-mono text-[11px]">
                ↵
              </kbd>{" "}
              to run a full search
            </Command.Empty>

            {!query && recent.length > 0 && (
              <Section label="Recent">
                {recent.map((r) => (
                  <PaletteItem
                    key={r}
                    value={`recent:${r}`}
                    icon={Clock}
                    label={r}
                    onSelect={() => go(`/search?q=${encodeURIComponent(r)}`)}
                  />
                ))}
              </Section>
            )}

            {!query && cats.length > 0 && (
              <Section label="Jump to category">
                {cats.map((c) => (
                  <PaletteItem
                    key={c.slug}
                    value={`cat:${c.slug}`}
                    icon={Hash}
                    label={c.title}
                    hint={`${c.count} docs`}
                    onSelect={() => go(`/category/${c.slug}`)}
                  />
                ))}
              </Section>
            )}

            {query && hits.length > 0 && (
              <Section label="Documents">
                {hits.map((d) => (
                  <PaletteItem
                    key={d.slug}
                    value={`doc:${d.slug}`}
                    icon={FileText}
                    label={d.title}
                    hint={categoryMeta(d.category).title}
                    onSelect={() => go(`/doc/${d.slug}`, query)}
                  />
                ))}
              </Section>
            )}

            {query && (
              <Section label="Action">
                <PaletteItem
                  value="action:run"
                  icon={Zap}
                  label={`Run full search for “${query}”`}
                  hint="↵"
                  variant="primary"
                  onSelect={submitSearch}
                />
              </Section>
            )}
          </Command.List>

          <div className="flex items-center justify-between px-4 h-9 border-t border-line text-[10px] font-mono text-ink-faint tracking-microcaps uppercase">
            <span>VENUSUS · cmdk</span>
            <span className="flex items-center gap-3">
              <span>
                <kbd className="font-sans normal-case tracking-normal">↑↓</kbd>{" "}
                navigate
              </span>
              <span>
                <kbd className="font-sans normal-case tracking-normal">↵</kbd>{" "}
                select
              </span>
            </span>
          </div>
        </Command>
      </div>
    </div>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Command.Group className="mb-2">
      <div className="px-3 pt-2 pb-1.5 text-[10px] font-mono tracking-microcaps uppercase text-ink-faint">
        {label}
      </div>
      {children}
    </Command.Group>
  );
}

function PaletteItem({
  icon: Icon,
  label,
  hint,
  onSelect,
  value,
  variant = "default",
}: {
  icon: LucideIcon;
  label: string;
  hint?: string;
  onSelect: () => void;
  value?: string;
  variant?: "default" | "primary";
}) {
  return (
    <Command.Item
      value={value}
      onSelect={onSelect}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-sm cursor-pointer text-[13px]",
        "data-[selected=true]:bg-bg-elevated data-[selected=true]:text-ink",
        "text-ink-muted",
        variant === "primary" && "text-signal data-[selected=true]:text-signal",
      )}
    >
      <Icon className="w-3.5 h-3.5 shrink-0 opacity-70" />
      <span className="flex-1 truncate">{label}</span>
      {hint && (
        <span className="font-mono text-[10px] text-ink-faint tracking-microcaps uppercase">
          {hint}
        </span>
      )}
      <ArrowRight className="w-3 h-3 opacity-0 group-data-[selected=true]:opacity-100" />
    </Command.Item>
  );
}
