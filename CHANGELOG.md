# Changelog

Alle nennenswerten Änderungen an dieser App werden hier dokumentiert.
Format orientiert sich an [Keep a Changelog](https://keepachangelog.com/),
Versionierung nach [Semantic Versioning](https://semver.org/).

## [0.2.0] - 2026-05-31

### Added
- Ingest: Eigene Anzeige-Kategorie `research-papers` für `knowledge/research-papers/<topic>/`.
  Markdown-Artikel landen als `live-doc`, PDFs bleiben `pdf-manual` — peer-reviewte
  wissenschaftliche LFP-Literatur ist damit als dedizierter Bereich durchsuchbar
  (ohne Schema-/Frontend-Änderung).
- Suche: Doc-Level-Dedup, Live-⌘K-Command-Palette, match-aware Snippets.

### Notes
- Erster ehrlicher Semver-Stand nach mehreren Feature-Einheiten, die zuvor auf 0.1.0 hingen
  (Fleet-Versionierungs-Policy 2026-05-31).
