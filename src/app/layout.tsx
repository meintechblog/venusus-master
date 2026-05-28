import type { Metadata } from "next";
import { JetBrains_Mono, Inter } from "next/font/google";
import "./globals.css";
import "highlight.js/styles/base16/black-metal.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { CommandPalette } from "@/components/command-palette";

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  weight: ["400", "500", "600"],
});

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const display = Inter({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: ["500", "600", "700"],
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
      className={`${mono.variable} ${sans.variable} ${display.variable} dark`}
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
