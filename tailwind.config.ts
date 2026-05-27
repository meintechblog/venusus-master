import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx,mdx}"],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: {
        "2xl": "1320px",
      },
    },
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular"],
        display: ["var(--font-display)", "var(--font-sans)", "system-ui"],
      },
      colors: {
        // Surfaces — five steps of depth, intentionally warm-leaning near-black
        bg: {
          DEFAULT: "hsl(var(--bg))",
          subtle: "hsl(var(--bg-subtle))",
          muted: "hsl(var(--bg-muted))",
          elevated: "hsl(var(--bg-elevated))",
          overlay: "hsl(var(--bg-overlay))",
        },
        line: {
          DEFAULT: "hsl(var(--line))",
          strong: "hsl(var(--line-strong))",
        },
        ink: {
          DEFAULT: "hsl(var(--ink))",
          muted: "hsl(var(--ink-muted))",
          subtle: "hsl(var(--ink-subtle))",
          faint: "hsl(var(--ink-faint))",
        },
        // The single bold accent — Victron-Voltage Cyan
        signal: {
          DEFAULT: "hsl(var(--signal))",
          dim: "hsl(var(--signal-dim))",
          glow: "hsl(var(--signal-glow))",
        },
        // Semantic state hues — desaturated, archival
        amber: {
          DEFAULT: "hsl(var(--amber))",
          dim: "hsl(var(--amber-dim))",
        },
        rust: {
          DEFAULT: "hsl(var(--rust))",
          dim: "hsl(var(--rust-dim))",
        },
        moss: {
          DEFAULT: "hsl(var(--moss))",
          dim: "hsl(var(--moss-dim))",
        },
        plum: {
          DEFAULT: "hsl(var(--plum))",
          dim: "hsl(var(--plum-dim))",
        },
      },
      borderRadius: {
        xs: "4px",
        sm: "6px",
        md: "8px",
        lg: "12px",
      },
      letterSpacing: {
        tightest: "-0.04em",
        tighter: "-0.025em",
        microcaps: "0.14em",
      },
      boxShadow: {
        hairline: "0 0 0 1px hsl(var(--line))",
        "hairline-strong": "0 0 0 1px hsl(var(--line-strong))",
        glow: "0 0 0 1px hsl(var(--signal) / 0.35), 0 8px 32px -8px hsl(var(--signal) / 0.25)",
        plate:
          "0 1px 0 0 hsl(var(--line)) inset, 0 0 0 1px hsl(var(--line)), 0 20px 40px -20px rgb(0 0 0 / 0.5)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "scan-line": {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" },
        },
        pulse: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.4" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) both",
        "scan-line": "scan-line 8s ease-in-out infinite",
        pulse: "pulse 2.4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      typography: () => ({
        invert: {
          css: {
            "--tw-prose-body": "hsl(var(--ink-muted))",
            "--tw-prose-headings": "hsl(var(--ink))",
            "--tw-prose-lead": "hsl(var(--ink))",
            "--tw-prose-links": "hsl(var(--signal))",
            "--tw-prose-bold": "hsl(var(--ink))",
            "--tw-prose-counters": "hsl(var(--ink-subtle))",
            "--tw-prose-bullets": "hsl(var(--ink-faint))",
            "--tw-prose-hr": "hsl(var(--line))",
            "--tw-prose-quotes": "hsl(var(--ink))",
            "--tw-prose-quote-borders": "hsl(var(--signal-dim))",
            "--tw-prose-captions": "hsl(var(--ink-subtle))",
            "--tw-prose-code": "hsl(var(--signal))",
            "--tw-prose-pre-code": "hsl(var(--ink))",
            "--tw-prose-pre-bg": "hsl(var(--bg-subtle))",
            "--tw-prose-th-borders": "hsl(var(--line-strong))",
            "--tw-prose-td-borders": "hsl(var(--line))",
          },
        },
      }),
    },
  },
  plugins: [require("@tailwindcss/typography"), require("tailwindcss-animate")],
};

export default config;
