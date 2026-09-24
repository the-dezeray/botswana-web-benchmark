# Botswana Web Benchmark — Full Audit Run Report

Date: 2026-09-16 (UTC times below are SAST-flavoured; codespace ran in CentralIndia)
Repo: `the-dezeray/botswana-web-benchmark`, branch `main` @ `297c010`
Operator: opencode agent (Windows 11 host, `gh` 2.96.0) driving a GitHub Codespace.

## 1. Objective

User asked for: start a GitHub Codespace via `gh`, run **one site × 1 run** as a smoke
test, wait for confirmation, then run **all sites × 3 runs**. Hold for confirmation
between stages.

## 2. Environment setup (commands)

```powershell
# Repo state (local, clean tree @ 297c010)
git remote -v            # origin = the-dezeray/botswana-web-benchmark
git status -sb           # ## main...origin/main, clean

# Existing codespace was Shutdown -> start it via API (gh 2.96 has no `start` subcommand)
gh api -X POST /user/codespaces/improved-space-carnival-g4qj6g64xv75cww7r/start
gh codespace list        # poll until Available

# Codespace: /workspaces/botswana-web-benchmark (2 cores, 8 GB RAM), node v24.14.0
gh codespace ssh -c <name> -- "cd /workspaces/botswana-web-benchmark && git pull --ff-only"
gh codespace ssh -c <name> -- "cd /workspaces/botswana-web-benchmark && npm install"
gh codespace ssh -c <name> -- "cd /workspaces/botswana-web-benchmark && npx playwright install chrome"
# -> Google Chrome 153.0.8010.47 (chrome-launcher needs a real Chrome; none preinstalled)
```

## 3. Smoke test — 1 site × 1 run: PASS

Site: Debswana Diamond Company (`https://www.debswana.com`).

```bash
node audit-resumable.js --sites single_site_test.json --runs 1 --out results_single_test.json
```

Result: **22.5 s**, Score **67**, LCP 22.79 s, 6861.6 KB / 87 reqs.
Images dominate (~84% of bytes; two images alone ~5.5 MB).
User confirmed results, then asked which command the full run would use.

## 4. Full-run command (as agreed with user)

```bash
cd /workspaces/botswana-web-benchmark \
  && nohup node audit-resumable.js --sites sites.json --runs 3 --out results.json --max-passes 3 \
  > audit_final2.log 2>&1 &
```

(`nohup` + `&` so the run survives SSH disconnects; progress is saved incrementally
to `results.json`. The `--max-passes` flag did not exist originally — added during
this session, see §6. Default `--concurrency 1`, no `--upload`.)

## 5. Timeline (what actually happened)

| # | Event | Duration / outcome |
|---|-------|--------------------|
| 1 | Full run #1 (original script) | **29 m 11 s → 8/55 saved, then ABORTED** on Choppies (degenerate 0-request LHR × all retries). Script printed "No sites completed this pass … Stopping to avoid an infinite retry loop". |
| 2 | User approved resume; relaunched (original script) | Progressed 8 → 14, still 1-site-per-pass. |
| 3 | Script fix #1 applied (`--max-passes`, retry passes, never abort early) | Synced to codespace, run restarted. |
| 4 | Script fix #2 applied (queue pump — §6 bug B) | Synced, run restarted. Ran 14 → 37/55, then **codespace container restarted (~20:26)**, killing the run mid-site (Bank of Botswana). Progress preserved in `results.json`. |
| 5 | Final run (fixed script) | **29 m 9 s → 49/55 saved, clean exit** with summary table. 6 sites unsaved after all 3 passes (listed §7). |

Total wall-clock for the session's auditing: ~2 h including debugging/fixes;
the final successful pass took ~29 min for 41 sites (most time is Lighthouse itself).

## 6. Bugs found in `audit-resumable.js` and fixes (uncommitted, local + codespace in sync, 32+/8-)

**Bug A — one bad site aborted the whole audit.**
`main()` broke out of its retry loop after a single pass that saved nothing.
Fix: `--max-passes N` (default 3); empty passes log a warning, wait 30 s, and retry;
after the last pass, remaining sites are reported by name while everything that
succeeded is kept. The run never aborts early because of one bad site.

**Bug B (deeper) — with `--concurrency 1` each "pass" audited exactly ONE site.**
In the `finally` handler, `if (active === 0) resolve(); else next();` resolved the
pass as soon as the single in-flight site finished, instead of pumping the rest of
the queue. So 8 sites = 8 passes, and one failed site = one empty pass = abort
(which is why Bug A bit so hard). Fix: `if (!stopped && queue.length) next();
else if (active === 0) resolve();` — resolve only when the queue is drained and
nothing is running. (With `--concurrency 3` the old code happened to work, which
is why this went unnoticed.)

## 7. Results (pulled to `results_codespace.json`, validated: 49 results)

- Average performance score: **46.0**
- Top 5: CA Sales Holdings **78** (4.41 s LCP, 220 KB) · Mmegi Online **74** ·
  Debswana **67.67** · BA ISAGO **65** · Limkokwing **63.67**
- Bottom 5: Botswana Power Corporation **17.67** · Botswana Life Insurance **23.33** ·
  NBFIRA **26** · Orange BW **26.33** · Botswana Accountancy College **26.33** (43.8 MB page)
- 6 persistently unsaved after 3 passes (need manual follow-up — likely bot-blocked
  or broken pages, all degenerate-LHR): **BDC Botswana, Nedbank Botswana, BBS Bank,
  MVA Fund Botswana, Bokamoso Private Hospital, Daily News BW**
- Redemption arc: Choppies, which killed run #1, eventually completed
  (32.33, LCP 47.6 s, 13 MB).
- Local artefacts: `results_codespace.json` (49 results), `audit_final.log`,
  `audit_final2.log`. Codespace originals: `results.json` (107 KB), same logs.

## 8. Notes for future-me (do this differently next time)

1. **Windows ↔ Codespace file transfer is the hard part — plan for it.**
   `gh codespace cp` on Windows mangles quoting (`dest open "'/path'"` — single
   quotes passed literally to scp). Reliable fallbacks that worked:
   - Download: `gh codespace ssh -c NAME -- "cat <file>" | Set-Content -Encoding utf8 <local>`
     (validate by parsing afterwards; watch for BOM/CRLF growth).
   - Upload small text: base64 it, `echo <chunk> >> /tmp/f` over ssh in ≤900-char
     chunks, `base64 -d`, `git apply`. Tedious — prefer the next point.
2. **Never pipe `git diff` through PowerShell** (`| Set-Content -NoNewline` strips
   ALL newlines; console decoding mojibakes ⚠/—/emoji). Use
   `git diff --output=<path> -- <file>` (raw bytes), then base64 with
   `[IO.File]` APIs only.
3. **`pkill -f <pattern>` matches your own ssh wrapper** (the remote `sh -c` cmdline
   contains the pattern) and kills your session. Use a bracket trick
   (`'audit-resumable[.]js'`) or kill by exact PID.
4. **PowerShell interpolates `$(…)` inside double-quoted remote commands.** Any ssh
   command containing `$()` runs LOCALLY. Single-quote where possible; keep `$`,
   backticks, and `"` out of remote one-liners (perl/python via single quotes).
5. **Background launches hang the ssh call** (`nohup … &` prints the echo but the
   session never exits). Treat the timeout as normal; verify with a fresh call.
6. **Codespaces stop after 30 min idle and containers can restart** (observed once,
   killing a run). Always run detached (`nohup`), always keep the resume
   invariant (skip saved sites in the output file), and re-poll — a restart costs
   only the in-flight site.
7. **Read the queue pump before trusting `--concurrency 1`.** Promise-pump loops
   that `resolve()` on `active === 0` stall after one item at concurrency 1;
   always re-prime (`next()`) while the queue is non-empty.
8. **Keep fixes uncommitted until asked** (done here), but flag them: local
   `audit-resumable.js` currently carries both fixes with no commit.
9. **Smoke-test first, agree the exact command, then go** — that part of the
   session worked perfectly and is worth repeating.
