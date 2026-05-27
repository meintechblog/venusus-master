import Link from "next/link";
import { CommandPaletteTrigger } from "./command-palette-trigger";
import { Logo } from "./logo";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line glass">
      <div className="mx-auto max-w-7xl px-6 h-14 flex items-center justify-between gap-6">
        <Link
          href="/"
          className="flex items-center gap-2.5 group"
          aria-label="Venusus home"
        >
          <Logo className="w-6 h-6 text-signal" />
          <span className="font-mono text-[13px] tracking-tighter font-semibold">
            VENUSUS
          </span>
          <span className="label-micro text-ink-faint ml-1 hidden sm:inline">
            v0.1 · KB
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-[13px] text-ink-muted">
          <Link
            href="/"
            className="hover:text-ink transition-colors duration-150"
          >
            Index
          </Link>
          <Link
            href="/findings"
            className="hover:text-ink transition-colors duration-150"
          >
            Findings
          </Link>
          <Link
            href="/category/bug-reports"
            className="hover:text-ink transition-colors duration-150"
          >
            Upstream
          </Link>
          <Link
            href="/category/hallbude"
            className="hover:text-ink transition-colors duration-150"
          >
            Anlage
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <CommandPaletteTrigger />
          <div className="hidden md:flex items-center gap-2 text-[11px] font-mono text-ink-faint">
            <span
              className="w-1.5 h-1.5 rounded-full bg-signal animate-pulse"
              aria-hidden
            />
            <span>SYS:OK</span>
          </div>
        </div>
      </div>
    </header>
  );
}
