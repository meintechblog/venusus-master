# VENUSUS · Knowledge Base

Operator-grade reference for Victron Venus OS, dbus-serialbattery (mr-manuel),
BatteryAggregator and a ~90 kWh DIY-pack Hallbude installation.

Hybrid search (semantic + full-text via pgvector + tsvector) plus a cheap
typeahead via trigram. Live stats over SSE. Offline-first. No fluff.

**Live at** http://192.168.3.117/ (LXC 138 on the Hofmann Proxmox cluster).
**Content:** 116 documents · 1416 chunks · 7 source-types · daily re-ingest @03:15.

## Stack

- **Next.js 15** App Router + TypeScript + Tailwind v3 + shadcn-style UI
- **PostgreSQL 17 + pgvector 0.8** (multilingual-e5-small, 384-dim embeddings)
- **Python FastAPI embedding service** (sentence-transformers 5.5)
- **pypdf** for PDF text extraction (datasheets + reports auto-ingested)
- **nginx** reverse proxy with SSE-aware buffering disabled
- **systemd** units for app + embedding-service
- **cron** daily re-ingest (`/usr/local/bin/venusus-ingest.sh`)

All pages render from PostgreSQL — no mock-data fallbacks in the page layer.
`src/lib/data.ts` survives only as a type-definitions module.

## Search architecture

Two complementary search APIs:

### `/api/search` — Hybrid pgvector + tsvector with RRF

```
Query → Embedding service (FastAPI, e5-small) → 384-d vector
                                              ↘
                                                Postgres
                                              ↗
        Full-text tsvector (Postgres simple) ─┘
                                              ↓
                         Reciprocal Rank Fusion (RRF, k=60)
                                              ↓
                             Top-20 → highlight snippets → JSON
```

Best for full-content retrieval — recall both exact keywords AND conceptual matches.

### `/api/search/live` — Cheap typeahead

```
Query (≥ 2 chars) → tokenize on whitespace
                  → AND-ILIKE every token against title || ' ' || summary
                  → pg_trgm similarity() ranking
                  → Top-8 → JSON (no embedding call, < 5ms)
```

Powers the dropdown under the Hero-Search (140 ms debounce, ↑↓ navigate, ↵
direct-to-doc or full-search, esc dismiss).

## Live stats via Server-Sent Events

- Initial snapshot rendered server-side in the homepage (no flicker)
- Client `<LiveStats />` opens `/api/stats/stream`
- Server subscribes to PostgreSQL `LISTEN doc_change`; trigger on
  `documents` insert/update/delete fires `pg_notify`
- On notify, server recomputes `v_stats` and pushes a `stats` event
- 25-second heartbeat keeps the channel alive through proxies

No polling. Updates appear in clients within ~50 ms of a content change.

## Layout

```
src/
├─ app/
│  ├─ page.tsx                Hero + LiveStats + categories + recent + featured finding
│  ├─ search/page.tsx         Hybrid search result UI
│  ├─ category/[slug]/page.tsx   Category landing (DB-driven, slug = DB category string)
│  ├─ doc/[slug]/page.tsx     Markdown reader with sticky TOC (body via string_agg(chunks))
│  ├─ findings/page.tsx       Chronological own-findings + memory stream
│  ├─ api/
│  │  ├─ search/route.ts            POST/GET hybrid search (embedding + tsvector + RRF)
│  │  ├─ search/live/route.ts       GET typeahead (trigram + ILIKE)
│  │  ├─ stats/route.ts             Snapshot stats (JSON)
│  │  └─ stats/stream/route.ts      SSE channel
│  └─ globals.css             Design tokens
├─ components/
│  ├─ live-stats.tsx          EventSource subscriber, 4-tile dashboard
│  ├─ hero-search.tsx         Input + live dropdown (debounced, keyboard-navigable)
│  ├─ command-palette.tsx     ⌘K modal (currently still on stub — polish open)
│  └─ ...
├─ lib/
│  ├─ db.ts                   pg pool, getStats, embedQuery, hybridSearch,
│  │                          listDocumentsByCategory, getDocumentBySlug,
│  │                          listAllCategories, listRecentDocuments,
│  │                          listFindingsChronological, liveSearchTitles
│  ├─ types.ts                SourceType + Category + Doc + label/hue maps
│  └─ data.ts                 (legacy stub — types only)
scripts/
├─ schema.sql                 PostgreSQL DDL (documents + chunks + pgvector + tsv + triggers + v_stats view)
├─ embedding-service.py       FastAPI wrapper for sentence-transformers
├─ ingest.py                  Markdown + PDF → chunks → embeddings → Postgres
├─ venusus-master.service     systemd unit (Next.js app, port 3000)
├─ venusus-embedding.service  systemd unit (embedding service, port 8765)
├─ nginx-venusus-master.conf  reverse proxy
├─ deploy.sh                  pulls + builds + restarts + smoke tests
└─ sync-content.sh            rsyncs knowledge tree + triggers ingest
```

## Design system — "graphite & voltage"

Warm-leaning near-black surfaces (HSL 28/9/5 → 16), hairline borders, a
single bold accent (`--signal`, HSL 176/92/56, a green-shifted cyan that
reads as *electricity* — not corporate blue).

Typography: **Inter** for display + body (via `next/font/google`) +
**JetBrains Mono** for metadata. Hairlines over shadows, microcaps labels,
tabular numerals, SVG noise grain at 3.5% opacity.

(Earlier iterations used Instrument Serif for display — felt too editorial
for technical content, swapped to Inter on 2026-05-28.)

## Source-type categories (7 buckets, derived from `infer_source()` in ingest.py)

| source_type | typical content |
|---|---|
| `victron-official` | datasheets, source-repo READMEs, wiki entries |
| `community-driver` | mr-manuel forks, BatteryAggregator, dbus-mqtt-bridges |
| `own-findings` | `docs/*.md` from `venusos-master/`, hand-written reports |
| `pdf-manual` | extracted PDFs from datasheets/ and reports/ |
| `live-doc` | live-scraped Victron wiki + ESS docs + meintechblog mirrors |
| `pro-portal` | Victron Professional Portal content |
| `source-repo` | per-repo READMEs from `knowledge/victron-official/source-repos/` |
| `memory` | Claude's persisted memory entries |

## Quick start (local dev)

```bash
npm install
# Without a Postgres backend, pages will 404 / show no data — there is no
# longer an in-memory stub fallback on the page layer. Set DATABASE_URL.
npm run dev
```

## Deploy (to LXC under Proxmox)

Target: an LXC container with Debian 13 + Node 20 + nginx + PostgreSQL 17 +
pgvector + a Python venv at `/opt/embedding-service/`.

**Memory:** allocate at least 4 GB RAM to the LXC (the embedding service
peaks at ~1.1 GB while sentence-transformers loads its model). The original
1 GB allocation caused OOM during torch install.

```bash
# From the local Mac:
./scripts/deploy.sh           # build app + restart services
./scripts/sync-content.sh     # rsync content + trigger ingest
```

`deploy.sh` clones (or pulls) the repo into `/opt/venusus-master`,
installs systemd units + nginx config, builds, restarts services, and
smoke-tests `/api/stats` + the embedding `/health`.

`sync-content.sh` rsyncs the knowledge sources from the operator repo
(`venusos-master/docs`, `venusos-master/knowledge`, `venusos-master/reports`,
plus the local Claude memory tree) into `/opt/venusus-master/content/`
and triggers `scripts/ingest.py`. The cron at `/usr/local/bin/venusus-ingest.sh`
@03:15 daily handles the LXC-side re-ingest of whatever is already in place.

## Operating model

- **External sources** (Victron docs, mr-manuel READMEs, blog mirrors)
  are stored with their `source_url` intact for citation.
- **Own findings** (memory entries + the operator repo's `docs/`)
  have no source URL but are tagged `source_type='own-findings'` and
  surfaced in `/findings`.
- New findings flow in by adding a Markdown file under
  `venusos-master/knowledge/own-findings/` or by writing a Claude
  memory entry — both are picked up by `sync-content.sh` + `ingest.py`
  (or, after a delay, by the daily cron).
- PDFs in `reports/` and `knowledge/victron-official/datasheets/` are
  extracted via pypdf and chunked just like Markdown.

## Known limitations

- `victron-professional/{blog,developers,dropbox}` content trees are
  empty — only `firmware/` has 5 manually-extracted files. A login-aware
  scraper would add ~10-20 docs; deferred until needed.
- 2 of 8 PDF titles have edge cases (`VENUSOS-MASTER` report-header
  instead of the real title, `/4 How to update a GX device` page-counter
  leftover). Heuristic improvements welcome.
- `command-palette.tsx` still uses the legacy stub data; the hero-search
  dropdown is the primary live-search surface.

## License

Private. Hallbude · ~90 kWh · Pi5 Venus OS v3.73.
