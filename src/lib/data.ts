import type { Category, Doc } from "./types";

export const CATEGORIES: Category[] = [
  {
    slug: "venus-os-dbus",
    title: "Venus OS · dbus API",
    blurb:
      "System service tree, com.victronenergy.* namespaces, settings paths, and the canonical signals every driver must expose.",
    count: 28,
    hue: "signal",
    glyph: "Ω",
  },
  {
    slug: "ess-multi-phase",
    title: "ESS & Multi-Phase",
    blurb:
      "Energy storage scheduling, three-phase balancing pitfalls, grid-setpoint behavior and the AssistantId quirks.",
    count: 17,
    hue: "amber",
    glyph: "ϟ",
  },
  {
    slug: "dbus-serialbattery",
    title: "dbus-serialbattery",
    blurb:
      "mr-manuel fork: BMS protocols, CAN/UART tuning, install paths, version pinning and the mid-2025 cell-balance bug.",
    count: 22,
    hue: "moss",
    glyph: "≈",
  },
  {
    slug: "battery-aggregator",
    title: "BatteryAggregator",
    blurb:
      "Sum-up of multiple parallel BMS instances. Weighted SoC, current summing, error propagation across drivers.",
    count: 9,
    hue: "plum",
    glyph: "Σ",
  },
  {
    slug: "multiplus-ii",
    title: "MultiPlus-II · Hardware",
    blurb:
      "48/5000/70 + 48/8000/110 inverters: VE.Bus topology, parallel/3-phase wiring, AC-coupling, thermal limits.",
    count: 14,
    hue: "rust",
    glyph: "⌁",
  },
  {
    slug: "hallbude",
    title: "Hallbude · Anlage",
    blurb:
      "Our installation. ~90 kWh DIY-pack, four-stack topology, breaker layout, PT100 thermal logging.",
    count: 19,
    hue: "signal",
    glyph: "▣",
  },
  {
    slug: "findings",
    title: "Own Findings",
    blurb:
      "Hard-won discoveries. Imbalance signatures, undocumented dbus paths, what the manuals don't tell you.",
    count: 31,
    hue: "amber",
    glyph: "✦",
  },
  {
    slug: "bug-reports",
    title: "Bug Reports & PRs",
    blurb:
      "Filed upstream — what was rejected, what got merged, current state per ticket.",
    count: 7,
    hue: "rust",
    glyph: "✕",
  },
];

export const DOCS: Doc[] = [
  {
    slug: "dbus-service-tree-overview",
    title: "The Venus OS dbus Service Tree — A Complete Map",
    summary:
      "Every com.victronenergy.* service, what publishes them, the canonical paths under /Dc, /Ac, /Settings, and how the systemcalc service synthesizes aggregate values.",
    category: "venus-os-dbus",
    sourceType: "live-doc",
    sourceUrl: "https://github.com/victronenergy/venus/wiki/dbus",
    internalPath: "docs/venus-os/dbus-service-tree.md",
    lastUpdated: "2026-05-22T14:00:00Z",
    readingTime: 18,
    tags: ["dbus", "systemcalc", "service-discovery"],
    body: `# The Venus OS dbus Service Tree

> A concrete map of every service Venus OS publishes on the system bus, written from observed behavior on \`raspberrypi5-2.local\` running v3.55.

## TL;DR

Venus OS exposes everything — every measurement, every setpoint, every config — under the **\`com.victronenergy.*\`** namespace. The service name encodes *what kind of device* publishes it; the object paths encode *what is measured*.

\`\`\`
com.victronenergy.battery.ttyUSB0   ← dbus-serialbattery instance #1
com.victronenergy.battery.ttyUSB1   ← dbus-serialbattery instance #2
com.victronenergy.battery.aggregator ← BatteryAggregator synthetic
com.victronenergy.system            ← systemcalc — aggregate of everything
com.victronenergy.vebus.ttyO1       ← MultiPlus-II VE.Bus interface
com.victronenergy.solarcharger.*    ← MPPT chargers
com.victronenergy.grid.*            ← grid meters (e.g. EM24)
com.victronenergy.settings          ← persistent settings tree
\`\`\`

## The Five Service Types You Actually Care About

### 1. \`com.victronenergy.system\`

The single source of truth for *the installation as a whole*. \`systemcalc\` reads every other service, applies priority rules, and re-publishes:

- \`/Dc/Battery/Soc\` — winning SoC
- \`/Dc/Battery/Voltage\` — winning voltage
- \`/Ac/Consumption/Total/Power\` — household load
- \`/Ac/Grid/Total/Power\` — grid in/out
- \`/Ac/PvOnOutput/Total/Power\` — AC-coupled PV behind the inverter

> **Finding** — if multiple battery services exist and none is marked as primary, \`systemcalc\` will pick one *non-deterministically* on boot. Always pin via \`Settings/SystemSetup/BatteryService\`.

### 2. \`com.victronenergy.battery.*\`

Published per BMS. Path layout:

\`\`\`
/Dc/0/Voltage            (V)
/Dc/0/Current            (A, positive = charge)
/Soc                     (%)
/System/MinCellVoltage   (V)
/System/MaxCellVoltage   (V)
/Voltages/Cell{1..N}     (V)
/Balancing               (0/1)
\`\`\`

dbus-serialbattery additionally exposes the BMS protocol parameters under \`/Info/*\` — these are read-only.

### 3. \`com.victronenergy.vebus.*\`

The Multi/Quattro family. The big one is **\`/Hub4/L{1,2,3}/AcPowerSetpoint\`** — three writeable paths, one per phase, the only way to command grid-setpoint from outside ESS.

## Common Mistakes

1. Confusing \`/Dc/0/Power\` (computed = V × I) with measured power. On many BMS drivers it is computed downstream.
2. Reading \`SoC\` from a battery service while ESS is configured to use a *different* battery as primary — you'll get drift.
3. Writing to \`/Settings/*\` without committing — settings need an explicit \`SetValue\` call against \`com.victronenergy.settings\`, not a per-service write.

## See Also

- [dbus-serialbattery install guide](/doc/dbus-serialbattery-install)
- [Three-phase balancing pitfalls](/doc/ess-three-phase-imbalance)
`,
  },
  {
    slug: "ess-three-phase-imbalance",
    title: "Three-Phase Imbalance with MultiPlus-II Stacks",
    summary:
      "Why phase L2 drifts ~3% high under heavy AC-out load on parallel stacks, observed in our 4× MP-II 48/5000 configuration. Includes the workaround.",
    category: "ess-multi-phase",
    sourceType: "own-findings",
    internalPath: "docs/findings/three-phase-imbalance.md",
    lastUpdated: "2026-05-19T08:30:00Z",
    readingTime: 12,
    tags: ["multiplus", "imbalance", "vebus", "ess"],
  },
  {
    slug: "dbus-serialbattery-install",
    title: "Installing dbus-serialbattery (mr-manuel fork) — Production Recipe",
    summary:
      "Cold-install on Raspberry Pi 5 + Venus OS 3.55. Pin to v1.5.20231215, fix the cell-balance regression, set CAN/UART params.",
    category: "dbus-serialbattery",
    sourceType: "community-driver",
    sourceUrl: "https://github.com/mr-manuel/venus-os_dbus-serialbattery",
    internalPath: "docs/drivers/dbus-serialbattery-install.md",
    lastUpdated: "2026-05-14T11:45:00Z",
    readingTime: 22,
    tags: ["dbus-serialbattery", "install", "bms"],
  },
  {
    slug: "battery-aggregator-weighted-soc",
    title: "BatteryAggregator: Weighted SoC Across Parallel Packs",
    summary:
      "How the aggregator combines SoC from N parallel BMS instances. Why simple averaging misleads. Capacity-weighted vs. current-weighted approaches.",
    category: "battery-aggregator",
    sourceType: "community-driver",
    sourceUrl: "https://github.com/pulquero/BatteryAggregator",
    internalPath: "docs/drivers/battery-aggregator-soc.md",
    lastUpdated: "2026-05-10T16:12:00Z",
    readingTime: 9,
    tags: ["aggregator", "soc"],
  },
  {
    slug: "hallbude-topology",
    title: "Hallbude Stack Topology — Wiring & Breakers",
    summary:
      "Schematic of the four-stack ~90 kWh installation: AC side, DC bus, BMS daisy-chain, the 250A class-T fuse layout.",
    category: "hallbude",
    sourceType: "own-findings",
    internalPath: "docs/hallbude/topology.md",
    lastUpdated: "2026-05-25T09:00:00Z",
    readingTime: 8,
    tags: ["hallbude", "wiring", "topology"],
  },
  {
    slug: "multiplus-ii-vebus-cabling",
    title: "VE.Bus Cabling for Parallel MultiPlus-II Stacks",
    summary:
      "Master/slave designation, RJ45 daisy-chain rules, what the manual misses about terminator placement on 4-unit stacks.",
    category: "multiplus-ii",
    sourceType: "pdf-manual",
    sourceUrl:
      "https://www.victronenergy.com/upload/documents/MultiPlus-II/MultiPlus-II-manual.pdf",
    internalPath: "docs/multiplus/vebus-cabling.md",
    lastUpdated: "2026-05-02T10:00:00Z",
    readingTime: 14,
    tags: ["vebus", "wiring", "multiplus"],
  },
  {
    slug: "finding-cell-balance-regression",
    title: "dbus-serialbattery v1.5.2024xxxx — Cell Balance Regression",
    summary:
      "After v1.5.20240120 the driver stops triggering balance when one cell crosses the threshold while neighbors are above it. Reproducer + diff.",
    category: "findings",
    sourceType: "own-findings",
    internalPath: "docs/findings/cell-balance-regression.md",
    lastUpdated: "2026-05-17T13:22:00Z",
    readingTime: 7,
    tags: ["regression", "balance", "dbus-serialbattery"],
  },
  {
    slug: "finding-systemcalc-soc-pinning",
    title: "Pinning the systemcalc SoC Source — A Footgun",
    summary:
      "Why the system service can swap your primary battery on reboot, how to lock it, and how to detect drift in logs.",
    category: "findings",
    sourceType: "own-findings",
    internalPath: "docs/findings/systemcalc-soc-pinning.md",
    lastUpdated: "2026-05-11T07:50:00Z",
    readingTime: 5,
    tags: ["systemcalc", "soc", "dbus"],
  },
  {
    slug: "finding-vrm-cloud-upload-throttle",
    title: "VRM Cloud Upload Throttles Above 5Hz Sampling",
    summary:
      "Observed: high-frequency dbus mutations get rate-limited at the portal. The hidden 200ms-min publish interval.",
    category: "findings",
    sourceType: "own-findings",
    internalPath: "docs/findings/vrm-throttle.md",
    lastUpdated: "2026-05-08T19:14:00Z",
    readingTime: 6,
    tags: ["vrm", "throttle"],
  },
  {
    slug: "pr-serialbattery-1247",
    title: "PR #1247 — Add JK-BMS Active-Balance Telemetry",
    summary:
      "Filed against mr-manuel/dbus-serialbattery. Status: merged 2026-04-30. Adds /System/ActiveBalanceCurrent.",
    category: "bug-reports",
    sourceType: "community-driver",
    sourceUrl:
      "https://github.com/mr-manuel/venus-os_dbus-serialbattery/pull/1247",
    internalPath: "docs/upstream/pr-serialbattery-1247.md",
    lastUpdated: "2026-04-30T15:00:00Z",
    readingTime: 4,
    tags: ["pr", "merged", "jk-bms"],
  },
];

export function getCategory(slug: string): Category | undefined {
  return CATEGORIES.find((c) => c.slug === slug);
}

export function getDoc(slug: string): Doc | undefined {
  return DOCS.find((d) => d.slug === slug);
}

export function getDocsByCategory(slug: string): Doc[] {
  return DOCS.filter((d) => d.category === slug);
}

export function getFindings(): Doc[] {
  return DOCS.filter((d) => d.sourceType === "own-findings").sort(
    (a, b) =>
      new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime(),
  );
}
