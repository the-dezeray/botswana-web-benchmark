# Botswana Web Performance Auditor

Web performance auditor for Botswana company websites. Runs Lighthouse audits against the sites listed in `sites.json` and renders the results in a Next.js dashboard.

## Backend / Auditing

### Quick audit

One-liner that locates Playwright's Chromium, makes it executable, sets `CHROME_PATH`, and runs the quick audit:

```bash
export CHROME_PATH="$(node -e 'console.log(require("playwright").chromium.executablePath())')" && chmod +x "$CHROME_PATH" || true && echo "CHROME_PATH=$CHROME_PATH" && "$CHROME_PATH" --version || true && CHROME_PATH="$CHROME_PATH" npm run audit:quick
```

Alternatively, use the helper script included in the repo:

- `bash ./run_quick_audit.sh`
- `npm run audit:quick:playwright`

### Available audit scripts

| Script | Command | Description |
| --- | --- | --- |
| `audit` | `npm run audit` | Full audit, 3 runs per site |
| `audit:5runs` | `npm run audit:5runs` | Full audit, 5 runs per site |
| `audit:quick` | `npm run audit:quick` | Quick audit, 1 run per site |
| `audit:quick:parallel` | `npm run audit:quick:parallel` | Quick audit, concurrent sites (3 Chrome instances) |
| `audit:zero-scores` | `npm run audit:zero-scores` | Quick audit that re-checks zero-score sites |

### Performance notes

- Audits run with **simulated throttling** (`throttlingMethod: "simulate"`) for deterministic timings.
- Each site's metrics are the **median of its runs** (default 3). The previous mean + IQR filter never actually dropped anything: the filter needs 4+ values, so 3 runs were always a plain mean.
- A **single headless Chrome instance is reused across sites** and recycled every 30 runs to bound memory. Launching per site cost ~1 s each and leaked temp profiles on Windows.
- Chrome readiness is polled before the first run, which removes the intermittent `connect ECONNREFUSED 127.0.0.1:<port>` failures.
- Page waits are bounded: `maxWaitForLoad` 20 s and `maxWaitForFcp` 15 s (defaults are 45 s / 30 s), so a hanging site can't stall the queue.
- The full-page screenshot gatherer is disabled (`disableFullPageScreenshot: true`). None of the reported metrics come from it, and it is the most expensive phase on multi-MB pages.
- Chrome launches lean: extensions, background networking, component updates, and sync are disabled.
- `--verbose` prints per-phase timings (Chrome launch, each Lighthouse run, sleeps) plus a run summary.
- `--concurrency N` runs N sites in parallel, each with its own Chrome instance and temp profile. **It is not recommended for published numbers:** `simulate` throttling traces the page on the real CPU, so parallel runs inflate TBT/TTI and shift scores relative to a sequential baseline.

### Failure handling

- A cheap HTTP **preflight** runs before any Chrome work. A connection-level failure (DNS, refused, reset, bad certificate) starts that site on a single, time-capped run instead of 3 runs × 3 attempts. A timeout is treated as ambiguous (slow site, not dead) and audited normally.
- Retries are per failure class: transport 3, degenerate LHR 1, other 2.
- Two degenerate LHRs (0 requests or no paint) abandon the site: bot-blocked hosts used to burn ~2 minutes each.
- A 90 s budget applies only until a site produces its first result, so genuinely heavy pages (20 MB) still finish all runs.
- Unsaved sites and their reasons are written to `meta.failed_sites`. On later runs, sites marked `unreachable` or `blocked` are skipped for 7 days; `--force` re-tries them immediately.

### Notes

- The one-liner sets `CHROME_PATH` from Playwright's installed Chromium and runs the quick audit (1 run per site).
- **Use Playwright's Chromium, not a bleeding-edge system Chrome.** Lighthouse 12.8.2's bundled trace engine crashes on Chrome 156 (`LanternComputationData.js` → `Cannot read properties of undefined (reading 'url')`), producing an LHR with score 0. Playwright's bundled Chromium 147 and 153 both work.
- Use the helper script if permission issues occur.
- For CI, set `CHROME_PATH` in your environment before running audits.
- Quick audit output is written to `results_quick.json`; the frontend reads this file.

## Sharing results (optional)

At the end of an audit you'll be asked whether to share **anonymous** results (site scores, page weights, tool versions — no personal data). Answer `n` or press Ctrl+C to keep everything local; local files are always saved first either way.

- Flags: `--upload` to share without prompting, `--no-upload` to never prompt.
- Env vars: `BW_UPLOAD=1` / `BW_NO_UPLOAD=1` behave like the flags.
- Re-running a resumed audit with `--upload` shares the whole current result file in one go.

### One-time setup

1. Create a free project at [supabase.com](https://supabase.com).
2. Paste `supabase/schema.sql` into the project's SQL Editor and run it.
3. Copy the Project URL + anon key (Dashboard → Settings → API) into `config.js`, or set `SUPABASE_URL` / `SUPABASE_ANON_KEY`.

Data is insert-only: the anon key cannot read anything back.

## Frontend (Next.js + Tailwind)

Located in `next-app/`. A Next.js dashboard that visualizes the audit results from `results_quick.json`.

### Startup

```bash
cd next-app
npm install
npm run dev
```

The dev server runs at `http://localhost:3000`.

### Refreshing the displayed data

After running a quick audit, copy the latest results into the app's public directory:

```bash
npm run update-data
```

This copies `results_quick.json` into `next-app/public/results_quick.json`.

### Build & run

```bash
cd next-app
npm run build
npm start
```

### Other scripts

- `npm run lint` — run ESLint
