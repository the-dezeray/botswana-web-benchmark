# Botswana Web Performance Auditor

Quick command to locate Playwright's Chromium, make it executable, set CHROME_PATH, and run the quick audit (one line for copy/paste):

```bash
export CHROME_PATH="$(node -e 'console.log(require("playwright").chromium.executablePath())')" && chmod +x "$CHROME_PATH" || true && echo "CHROME_PATH=$CHROME_PATH" && "$CHROME_PATH" --version || true && CHROME_PATH="$CHROME_PATH" npm run audit:quick
```

Alternatively, use the helper script included in the repo:

- bash ./run_quick_audit.sh
- npm run audit:quick:playwright

Notes:
- The one-liner sets CHROME_PATH from Playwright's installed chromium and runs the quick audit (1 run per site).
- Use the helper script if permission issues occur.
- For CI, set CHROME_PATH in your environment before running audits.
