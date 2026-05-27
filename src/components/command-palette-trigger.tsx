"use client";

import { Search } from "lucide-react";
import { useCallback } from "react";

export function CommandPaletteTrigger() {
  const open = useCallback(() => {
    window.dispatchEvent(new CustomEvent("venusus:open-palette"));
  }, []);

  return (
    <button
      type="button"
      onClick={open}
      className="group flex items-center gap-3 h-8 px-2.5 rounded-sm border border-line bg-bg-subtle hover:bg-bg-muted hover:border-line-strong transition-colors duration-150 text-[12px] text-ink-subtle"
      aria-label="Open command palette"
    >
      <Search className="w-3.5 h-3.5" strokeWidth={2.25} />
      <span className="hidden sm:inline">Search</span>
      <kbd className="hidden sm:inline-flex items-center gap-1 px-1.5 h-5 rounded-xs bg-bg border border-line font-mono text-[10px] text-ink-faint">
        <span>⌘</span>
        <span>K</span>
      </kbd>
    </button>
  );
}
