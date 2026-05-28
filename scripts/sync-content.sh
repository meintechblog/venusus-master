#!/bin/bash
# venusus-master content sync — rsyncs all knowledge sources to the LXC
# and triggers re-ingest. Run from local Mac in venusos-master/ root.
set -euo pipefail

LXC_HOST="${LXC_HOST:-root@192.168.3.117}"
REMOTE_CONTENT="/opt/venusus-master/content"
LOCAL_ROOT="${LOCAL_ROOT:-/Users/hulki/codex/venusos-master}"
MEMORY_ROOT="${MEMORY_ROOT:-/Users/hulki/.claude/projects/-Users-hulki-codex-venusos-master/memory}"

echo "==> Ensuring remote content tree..."
ssh "$LXC_HOST" "mkdir -p $REMOTE_CONTENT/{docs,memory,reports,knowledge}"

echo "==> Syncing docs/ ..."
rsync -a --delete \
  --exclude='.DS_Store' \
  "$LOCAL_ROOT/docs/" \
  "$LXC_HOST:$REMOTE_CONTENT/docs/"

echo "==> Syncing reports/ ..."
rsync -a --delete \
  --exclude='.DS_Store' \
  "$LOCAL_ROOT/reports/" \
  "$LXC_HOST:$REMOTE_CONTENT/reports/" 2>/dev/null || true

echo "==> Syncing knowledge/ (Markdown + PDFs)..."
rsync -a --delete \
  --include='*/' \
  --include='*.md' \
  --include='*.txt' \
  --include='*.pdf' \
  --exclude='*' \
  --exclude='.DS_Store' \
  "$LOCAL_ROOT/knowledge/" \
  "$LXC_HOST:$REMOTE_CONTENT/knowledge/"

echo "==> Syncing memory/ ..."
rsync -a --delete \
  --exclude='.DS_Store' \
  "$MEMORY_ROOT/" \
  "$LXC_HOST:$REMOTE_CONTENT/memory/"

echo "==> Triggering ingest..."
ssh "$LXC_HOST" "cd /opt/venusus-master && /opt/embedding-service/bin/python3 scripts/ingest.py --content $REMOTE_CONTENT"

echo "Done."
