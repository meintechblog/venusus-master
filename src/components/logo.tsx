import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
}

// The logo: a stylized lightning glyph cut into a hairline square.
// Geometric, technical, not a "V" — distinct from Vercel and Victron.
export function Logo({ className }: LogoProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      aria-hidden
    >
      <rect
        x="1.5"
        y="1.5"
        width="21"
        height="21"
        rx="3"
        stroke="currentColor"
        strokeOpacity="0.4"
        strokeWidth="1"
      />
      <path
        d="M13.5 5L7.5 13H11L10.5 19L16.5 11H13L13.5 5Z"
        fill="currentColor"
      />
    </svg>
  );
}
