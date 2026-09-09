#!/usr/bin/env bash
#
# prepare_deploy_files.sh
# Copies index.html, all linked assets, and example data into dist/
# for standalone deployment.
#
# Usage:  bash scripts/prepare_deploy_files.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DIST="$PROJECT_ROOT/dist"

# Clean and recreate dist
rm -rf "$DIST"
mkdir -p "$DIST/src" "$DIST/data"

# Copy the entry point
cp "$PROJECT_ROOT/index.html" "$DIST/"

# Copy all linked assets referenced by index.html
cp "$PROJECT_ROOT/src/styles.css" "$DIST/src/"
cp "$PROJECT_ROOT/src/app.js"     "$DIST/src/"
cp "$PROJECT_ROOT/src/sl_icon.svg" "$DIST/src/"

# Copy example data (referenced by "Load Example" button)
cp "$PROJECT_ROOT/data/example.json" "$DIST/data/"

echo "Deploy files prepared in $DIST"
echo "  - index.html"
echo "  - src/styles.css"
echo "  - src/app.js"
echo "  - src/sl_icon.svg"
echo "  - data/example.json"
