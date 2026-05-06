#!/usr/bin/env bash
# Run ONCE before the per-author commit scripts.
# Snapshots the final code tree, wipes git history, reinits, sets remote.
#
# Run this from your account (e.g., Nihar's machine).
# After this you run commits_nihar.sh, then change git identity / clone elsewhere
# for commits_soham.sh, etc.

set -euo pipefail

REPO="$(cd "$(dirname "$0")/../.." && pwd)"
SNAPSHOT="${SNAPSHOT_DIR:-/tmp/zestify_snapshot}"
REMOTE_URL="${REMOTE_URL:-https://github.com/Nihar4/202_final_test.git}"

echo "==> Snapshotting tree to $SNAPSHOT"
rm -rf "$SNAPSHOT"
mkdir -p "$SNAPSHOT"
rsync -a \
  --exclude='.git' --exclude='node_modules' --exclude='.next' \
  --exclude='dist'  --exclude='.DS_Store' \
  "$REPO/" "$SNAPSHOT/"

echo "==> Wiping working tree (snapshot is safe)"
cd "$REPO"
find . -mindepth 1 -maxdepth 1 \
  ! -name '.git' ! -name 'node_modules' ! -name '.next' \
  -exec rm -rf {} +

rm -rf .git
git init -b main >/dev/null
git remote add origin "$REMOTE_URL"

# Restore the per-author scripts so the user can run them in place.
mkdir -p "$REPO/scripts/history"
cp -R "$SNAPSHOT/scripts/history/." "$REPO/scripts/history/"
chmod +x "$REPO/scripts/history/"*.sh

echo "==> Ready. Snapshot at: $SNAPSHOT"
echo "==> Remote: $REMOTE_URL"
echo
echo "Next steps (sequence):"
echo "  1) Set Nihar's git config:"
echo "       git config user.name  \"Nihar Patel\""
echo "       git config user.email \"<nihar's email>\""
echo "     ./scripts/history/commits_nihar.sh"
echo
echo "  2) Set Soham's git config (or run on Soham's machine after pull):"
echo "       git config user.name  \"Soham Patel\""
echo "       git config user.email \"<soham's email>\""
echo "     ./scripts/history/commits_soham.sh"
echo
echo "  3) Set Kalhar's git config (or run on Kalhar's machine after pull):"
echo "       git config user.name  \"Kalhar Patel\""
echo "       git config user.email \"<kalhar's email>\""
echo "     ./scripts/history/commits_kalhar.sh"
echo
echo "  4) Push:    git push -u origin main --force"
