import Link from "next/link";
import { ArrowUpRight, Clock } from "lucide-react";
import { SourceBadge } from "./source-badge";
import { formatDate } from "@/lib/utils";
import type { Doc } from "@/lib/types";

export function DocRow({ doc }: { doc: Doc }) {
  return (
    <Link
      href={`/doc/${doc.slug}`}
      className="group block border-b border-line py-5 px-1 -mx-1 hover:bg-bg-subtle/40 transition-colors duration-150"
    >
      <div className="flex items-start gap-5">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 mb-2 flex-wrap">
            <SourceBadge type={doc.sourceType} />
            <span className="font-mono text-[10px] tracking-microcaps uppercase text-ink-faint">
              {formatDate(doc.lastUpdated)}
            </span>
            <span className="font-mono text-[10px] tracking-microcaps uppercase text-ink-faint flex items-center gap-1">
              <Clock className="w-2.5 h-2.5" /> {doc.readingTime}m
            </span>
          </div>

          <h3 className="font-display text-[20px] leading-tight tracking-tighter text-ink group-hover:text-signal transition-colors duration-200">
            {doc.title}
          </h3>

          <p className="mt-1.5 text-[13px] text-ink-muted leading-relaxed line-clamp-2">
            {doc.summary}
          </p>

          <div className="mt-2.5 flex items-center gap-2 flex-wrap">
            {doc.tags.map((t) => (
              <span
                key={t}
                className="font-mono text-[10px] text-ink-subtle"
              >
                #{t}
              </span>
            ))}
          </div>
        </div>

        <ArrowUpRight
          className="w-4 h-4 text-ink-faint group-hover:text-signal group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all duration-200 shrink-0 mt-1"
        />
      </div>
    </Link>
  );
}
