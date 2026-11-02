#!/usr/bin/env bash
# Locate Playwright's Chromium, make it executable, and run the quick audit.
# Lighthouse 12.x needs a Chromium it understands; a bleeding-edge system Chrome
# (e.g. 156) crashes its trace engine and yields score-0 results.
set -euo pipefail

CHROME_PATH="$(node -e 'console.log(require("playwright").chromium.executablePath())')"
export CHROME_PATH

chmod +x "$CHROME_PATH" 2>/dev/null || true
echo "CHROME_PATH=$CHROME_PATH"

exec node audit-resumable.js --sites sites.json --runs 1 --out results_quick.json "$@"
