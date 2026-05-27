"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export interface TocHeading {
  id: string;
  text: string;
  level: number;
}

export function DocToc({ headings }: { headings: TocHeading[] }) {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    if (!headings.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort(
            (a, b) =>
              a.boundingClientRect.top - b.boundingClientRect.top,
          );
        if (visible.length) setActive(visible[0].target.id);
      },
      {
        rootMargin: "-72px 0px -65% 0px",
        threshold: [0, 1],
      },
    );
    headings.forEach((h) => {
      const el = document.getElementById(h.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [headings]);

  if (!headings.length) return null;

  return (
    <nav className="hidden lg:block sticky top-24" aria-label="Table of contents">
      <div className="label-micro text-ink-faint mb-3">On this page</div>
      <ul className="space-y-1.5 border-l border-line pl-3">
        {headings.map((h) => (
          <li key={h.id} style={{ paddingLeft: `${(h.level - 1) * 10}px` }}>
            <a
              href={`#${h.id}`}
              className={cn(
                "block text-[12px] leading-snug py-0.5 -ml-3 pl-3 border-l border-transparent transition-colors duration-150",
                active === h.id
                  ? "text-signal border-signal"
                  : "text-ink-subtle hover:text-ink",
              )}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
