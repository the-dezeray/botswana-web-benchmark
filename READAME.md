# Botswana Web Performance Auditor

Web performance auditor for Botswana company websites. Runs Lighthouse audits against the sites listed in `sites.json` and renders the results in a React frontend.

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
| `audit:quick:parallel` | `npm run audit:quick:parallel` | Quick audit, concurrency 3 |
| `audit:zero-scores` | `npm run audit:zero-scores` | Quick audit that re-checks zero-score sites |

### Notes

- The one-liner sets `CHROME_PATH` from Playwright's installed Chromium and runs the quick audit (1 run per site).
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

## Frontend (React + Vite + Tailwind)

Located in `frontend/`. A Vite/React dashboard that visualizes the audit results from `results_quick.json`.

### Startup

```bash
cd frontend
npm install
npm run dev
```

The dev server runs at `http://localhost:5173` and reads `/results_quick.json` from `frontend/public/`.

### Refreshing the displayed data

After running a quick audit, copy the latest results into the frontend's public directory:

```bash
npm run update-data
```

This copies `../results_quick.json` into `frontend/public/results_quick.json`.

### Build & preview

```bash
npm run build     # type-check + production build (outputs to dist/)
npm run preview   # preview the production build locally
```

### Other scripts

- `npm run lint` — run ESLint
