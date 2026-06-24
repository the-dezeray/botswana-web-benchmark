#!/usr/bin/env bash
set -euo pipefail

# Locate Playwright's Chromium binary
P=$(node -e 'try{console.log(require("playwright").chromium.executablePath())}catch(e){console.error("Playwright chromium not found"); process.exit(1)}')

if [ -z "$P" ] || [ ! -f "$P" ]; then
  echo "Playwright Chromium not found at: $P" >&2
  exit 1
fi

# Ensure executable
chmod +x "$P" || true

# Export CHROME_PATH for Lighthouse
export CHROME_PATH="$P"
echo "CHROME_PATH=$CHROME_PATH"

# Print chromium version (best-effort)
"$CHROME_PATH" --version || true

# Run the project's quick audit (1 run per site)
CHROME_PATH="$CHROME_PATH" npm run audit:quick
