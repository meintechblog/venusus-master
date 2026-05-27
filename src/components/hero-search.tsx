"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, CornerDownLeft } from "lucide-react";

const PLACEHOLDERS = [
  "dbus-serialbattery cell balance regression",
  "MultiPlus-II VE.Bus terminator placement",
  "systemcalc SoC pinning",
  "ESS three-phase imbalance L2",
  "JK-BMS active balance current path",
];

export function HeroSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const placeholder = PLACEHOLDERS[0];

  const submit = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault();
      if (!q.trim()) return;
      router.push(`/search?q=${encodeURIComponent(q)}`);
    },
    [q, router],
  );

  const openPalette = useCallback(() => {
    window.dispatchEvent(new CustomEvent("venusus:open-palette"));
  }, []);

  return (
    <form
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
          placeholder={placeholder}
          className="flex-1 h-full bg-transparent text-[15px] text-ink placeholder:text-ink-faint outline-none border-0"
          autoComplete="off"
          spellCheck={false}
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
    </form>
  );
}
