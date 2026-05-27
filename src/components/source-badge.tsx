import { cn } from "@/lib/utils";
import { SOURCE_TYPE_HUE, SOURCE_TYPE_LABELS, type SourceType } from "@/lib/types";

interface SourceBadgeProps {
  type: SourceType;
  className?: string;
}

const HUE_CLASSES: Record<string, string> = {
  signal:
    "text-signal border-signal/30 bg-signal/[0.06] [&_.dot]:bg-signal",
  amber:
    "text-amber border-amber/30 bg-amber/[0.06] [&_.dot]:bg-amber",
  rust: "text-rust border-rust/30 bg-rust/[0.06] [&_.dot]:bg-rust",
  moss: "text-moss border-moss/30 bg-moss/[0.06] [&_.dot]:bg-moss",
  plum: "text-plum border-plum/30 bg-plum/[0.06] [&_.dot]:bg-plum",
};

export function SourceBadge({ type, className }: SourceBadgeProps) {
  const hue = SOURCE_TYPE_HUE[type];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 h-5 rounded-xs border font-mono text-[10px] tracking-microcaps uppercase",
        HUE_CLASSES[hue],
        className,
      )}
    >
      <span className="dot w-1 h-1 rounded-full" aria-hidden />
      {SOURCE_TYPE_LABELS[type]}
    </span>
  );
}
