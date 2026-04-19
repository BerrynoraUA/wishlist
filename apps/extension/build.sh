#!/usr/bin/env bash
#
# Build a Chrome Web Store–ready ZIP archive for the Wishlane extension.
#
# Usage:
#   cd apps/extension
#   bash build.sh
#
# Output: wishlane-extension-<version>.zip in the current directory.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# Read version from manifest.json
VERSION=$(grep '"version"' manifest.json | head -1 | sed 's/.*: *"\(.*\)".*/\1/')
OUTPUT="wishlane-extension-v${VERSION}.zip"

echo "📦 Building Wishlane extension v${VERSION}…"

# Ensure icons exist
if [ ! -f "icons/icon-128.png" ]; then
  echo "⚠️  Icons not found. Generating from SVG…"
  if command -v node &>/dev/null && [ -f "generate-icons.js" ]; then
    node generate-icons.js
  else
    echo "❌ Node.js not available and icons are missing. Generate icons first."
    exit 1
  fi
fi

# Remove old archive if present
rm -f "$OUTPUT"

# Create ZIP excluding dev/build files
zip -r "$OUTPUT" \
  manifest.json \
  config.js \
  background/ \
  content/ \
  icons/icon-16.png \
  icons/icon-32.png \
  icons/icon-48.png \
  icons/icon-128.png \
  popup/ \
  -x "*.DS_Store"

echo ""
echo "✅ Created $OUTPUT ($(du -h "$OUTPUT" | cut -f1))"
echo ""
echo "Next steps:"
echo "  1. Go to https://chrome.google.com/webstore/devconsole"
echo "  2. Click 'New Item' → upload $OUTPUT"
echo "  3. Fill in the store listing (see STORE_LISTING.md)"
echo "  4. Submit for review"
