export function SiteFooter() {
  return (
    <footer className="border-t border-line mt-16">
      <div className="mx-auto max-w-7xl px-6 py-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-[12px] font-mono text-ink-faint">
        <div className="flex items-center gap-4">
          <span>VENUSUS · KB · BUILD 0001</span>
          <span className="hidden md:inline">·</span>
          <span className="hidden md:inline">~90 kWh · HALLBUDE</span>
        </div>
        <div className="flex items-center gap-4">
          <span>raspberrypi5-2.local</span>
          <span>·</span>
          <span>venus-os v3.55</span>
          <span>·</span>
          <span className="text-signal">●</span>
        </div>
      </div>
    </footer>
  );
}
