# VENUSUS · Knowledge Base

Operator-grade reference for Victron Venus OS, dbus-serialbattery (mr-manuel),
BatteryAggregator and a ~90 kWh DIY-pack Hallbude installation. Searchable.
Offline-first. No fluff.

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

- `npm run dev` — Next.js dev server with HMR
- `npm run build` — production build (static where possible)
- `npm run start` — serve the production build
- `npm run lint` — ESLint (Next + TypeScript)
- `npm run typecheck` — `tsc --noEmit`

## Architecture

```
src/
├─ app/                       App Router pages
│  ├─ page.tsx                Home — hero search + category grid
│  ├─ search/page.tsx         Result page (uses /api/search)
│  ├─ category/[slug]/page.tsx
│  ├─ doc/[slug]/page.tsx     Markdown reader with sticky TOC
│  ├─ findings/page.tsx       Chronological own-findings stream
│  └─ api/search/route.ts     POST/GET search stub
├─ components/                UI primitives (header, palette, badges)
├─ lib/
│  ├─ data.ts                 Categories + DOCS fixture
│  ├─ types.ts                Shared types
│  └─ utils.ts                cn(), formatDate(), timeAgo()
└─ app/globals.css            The design system
```

## Design system

Aesthetic: **graphite & voltage-cyan**. Warm-leaning near-black surfaces
(HSL 28/9/5 → 13), hairline borders, a single bold accent (`--signal`,
HSL 176/92/56, a green-shifted cyan that reads as *electricity* — not
corporate blue).

Typography:
- **Display**: Instrument Serif (editorial, distinctive, italics for emphasis)
- **Body**: IBM Plex Sans / system fallback
- **Mono**: JetBrains Mono — used aggressively for metadata, labels, IDs

Hairlines over shadows. Microcaps labels over icons. The grain overlay
is a single inline-SVG noise pattern at 3.5% opacity.

## Search backend

`/api/search` returns a `SearchResult[]` payload. The current implementation
scores against an in-memory fixture (`src/lib/data.ts`). Swap with SQLite
FTS5 by replacing the body of `POST` in `src/app/api/search/route.ts` — the
response contract is stable.

## License

Private. Hallbude · ~90 kWh · raspberrypi5-2.local · Venus OS v3.55.
