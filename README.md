# VENUSUS · Knowledge Base

Operator-grade reference for Victron Venus OS, dbus-serialbattery (mr-manuel),
BatteryAggregator and a ~90 kWh DIY-pack Hallbude installation.

Hybrid search (semantic + full-text via pgvector + tsvector). Live stats over
SSE. Offline-first. No fluff.

## Stack

- **Next.js 15** App Router + TypeScript + Tailwind v3 + shadcn-style UI
- **PostgreSQL 17 + pgvector** (multilingual-e5-small, 384-dim embeddings)
- **Python FastAPI embedding service** (sentence-transformers)
- **nginx** reverse proxy with SSE-aware buffering disabled
- **systemd** units for app + embedding-service

## Search architecture — Hybrid pgvector + tsvector with RRF

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

The query embedding and the FTS query are computed on the SAME chunks
table. Each scoring source produces a ranked list; the rank-positions
are inverted (1/(60+rank)) and summed. Final ranking is that summed
score. This works much better than either method alone for technical
documentation where exact keywords AND conceptual queries both matter.

Fallback: if Postgres is unreachable (e.g. fresh dev install), the
search route uses an in-memory stub in `src/lib/data.ts` so the UI
still renders.

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
│  ├─ page.tsx                Hero + LiveStats + categories + recent updates
│  ├─ search/page.tsx         Hybrid search result UI
│  ├─ category/[slug]/page.tsx
│  ├─ doc/[slug]/page.tsx     Markdown reader with sticky TOC
│  ├─ findings/page.tsx       Chronological own-findings stream
│  ├─ api/
│  │  ├─ search/route.ts      POST/GET hybrid search
│  │  ├─ stats/route.ts       Snapshot stats (JSON)
│  │  └─ stats/stream/route.ts SSE channel
│  └─ globals.css             Design tokens
├─ components/
│  ├─ live-stats.tsx          EventSource subscriber, 4-tile dashboard
│  ├─ hero-search.tsx, command-palette.tsx, ...
├─ lib/
│  ├─ db.ts                   pg pool, getStats, embedQuery, hybridSearch
│  ├─ data.ts                 Fallback fixture for dev
│  └─ types.ts
scripts/
├─ schema.sql                 PostgreSQL DDL (documents + chunks + pgvector + tsv + triggers)
├─ embedding-service.py       FastAPI wrapper for sentence-transformers
├─ ingest.py                  Markdown → chunks → embeddings → Postgres pipeline
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

Typography: Instrument Serif (display, with italic for emphasis) +
JetBrains Mono (used aggressively for metadata) + IBM Plex Sans fallback.
Hairlines over shadows, microcaps labels, tabular numerals, SVG noise
grain at 3.5% opacity.

## Quick start (local dev)

```bash
npm install
# Without a Postgres backend the search route falls back to the in-memory stub.
npm run dev
```

## Deploy (to LXC under Proxmox)

The target environment is an LXC container with Debian 13 + Node 20 +
nginx + PostgreSQL 17 + pgvector + a Python venv at `/opt/embedding-service/`.

```bash
# From the local Mac:
./scripts/deploy.sh
./scripts/sync-content.sh
```

`deploy.sh` clones (or pulls) the repo into `/opt/venusus-master`,
installs systemd units + nginx config, builds, restarts services, and
smoke-tests `/api/stats` + the embedding `/health`.

`sync-content.sh` rsyncs the knowledge sources from the operator repo
(`venusos-master/docs`, `venusos-master/knowledge`, `venusos-master/reports`,
plus the local Claude memory tree) into `/opt/venusus-master/content/`
and triggers `scripts/ingest.py`.

## Operating model

- **External sources** (Victron docs, mr-manuel READMEs, blog mirrors)
  are stored with their `source_url` intact for citation.
- **Own findings** (memory entries + the operator repo's `docs/`)
  have no source URL but are tagged `source_type='own-findings'` and
  surfaced in `/findings`.
- New findings flow in by adding a Markdown file under
  `venusos-master/knowledge/own-findings/` or by writing a Claude
  memory entry — both are picked up by `sync-content.sh` + `ingest.py`.

## License

Private. Hallbude · ~90 kWh · Pi5 Venus OS v3.73.
