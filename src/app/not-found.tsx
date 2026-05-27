import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-32 text-center">
      <div className="label-micro text-ink-faint mb-3">404 · Not Indexed</div>
      <h1 className="font-display text-[80px] md:text-[120px] leading-[0.9] tracking-tightest text-ink">
        Not in
        <br />
        the index.
      </h1>
      <p className="mt-6 text-[16px] text-ink-muted max-w-md mx-auto leading-relaxed">
        Either it was never written, or the URL is wrong. Try the search.
      </p>
      <div className="mt-8 flex items-center justify-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center h-9 px-4 rounded-sm border border-line bg-bg-subtle hover:bg-bg-muted text-[13px] font-mono transition-colors"
        >
          ← Index
        </Link>
        <Link
          href="/search"
          className="inline-flex items-center h-9 px-4 rounded-sm border border-signal/40 bg-signal/10 text-signal text-[13px] font-mono hover:bg-signal/20 transition-colors"
        >
          Search
        </Link>
      </div>
    </div>
  );
}
