import type { Metadata } from "next";
import { JetBrains_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";
import "highlight.js/styles/base16/black-metal.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { CommandPalette } from "@/components/command-palette";

// Body sans: declared inline via CSS custom property below — we lean on
// IBM Plex Sans / system stack to avoid a fetched Inter / Geist that would
// flatten this design into generic AI-template territory.

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  weight: ["400", "500", "600"],
});

// Display: Instrument Serif — editorial, distinctive, not Inter/Space-Grotesk
const display = Instrument_Serif({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: ["400"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "VENUSUS — Venus OS Knowledge Base",
  description:
    "Operator-grade reference for Victron Venus OS, dbus-serialbattery, BatteryAggregator and a ~90 kWh Hallbude installation. Searchable. Offline-first. No fluff.",
  metadataBase: new URL("https://venusus.local"),
  openGraph: {
    title: "VENUSUS",
    description: "Venus OS Knowledge Base",
    type: "website",
  },
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${mono.variable} ${display.variable} dark`}
      style={
        {
          // Inline declaration so the --font-sans variable resolves without a fetched font.
          // System font stack — but we lean on IBM Plex Sans + Geist if locally installed.
          ["--font-sans" as string]:
            '"IBM Plex Sans", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
        } as React.CSSProperties
      }
      suppressHydrationWarning
    >
      <body className="font-sans grain min-h-screen flex flex-col antialiased">
        <CommandPalette />
        <SiteHeader />
        <main className="flex-1 flex flex-col">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
