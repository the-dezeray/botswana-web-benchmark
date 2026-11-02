#!/usr/bin/env node
/**
 * Resumable Botswana Web Performance Auditor (Lighthouse-only)
 * - Single browser pass per run: Lighthouse provides both performance
 *   metrics AND network/byte breakdown (via the network-requests audit),
 *   so there's no second Playwright navigation to keep in sync.
 * - Skips sites already present in the output file (resume support)
 * - Gracefully shuts down on Ctrl+C: finishes current site, saves, exits cleanly
 *
 * Usage:
 *   node audit-resumable.js --sites sites.json --runs 3 --out results.json
 *   node audit-resumable.js --sites sites.json --runs 3 --out results.json --max-passes 5
 *
 * Failure policy: a site that fails all its runs is skipped (not saved) and
 * the audit moves on to the next site. Remaining sites are retried on up to
 * MAX_PASSES passes; anything still failing after that is reported at the end
 * while everything that succeeded is kept. The run never aborts early because
 * of one bad site.
 */

let chromeLauncher;
async function getChromeLauncher() {
  if (!chromeLauncher) ({ launch: chromeLauncher } = await import("chrome-launcher"));
  return chromeLauncher;
}
const fs   = require("fs");
const os   = require("os");
const path = require("path");
const readline = require("readline");
const { parseArgs } = require("util");
const { uploadRun } = require("./lib/upload");

async function getLighthouse() {
  const { default: lighthouse } = await import("lighthouse");
  return lighthouse;
}

// ─── CLI args ────────────────────────────────────────────────────────────────
const { values: args } = parseArgs({
  options: {
    sites:         { type: "string", default: "sites.json" },
    runs:          { type: "string", default: "3" },
    out:           { type: "string", default: "results.json" },
    concurrency:   { type: "string", default: "1" },
    "max-passes":  { type: "string", default: "3" },
    "chrome-path": { type: "string", default: "" },
    upload:        { type: "boolean", default: false },
    "no-upload":   { type: "boolean", default: false },
    verbose:       { type: "boolean", default: false },
    force:         { type: "boolean", default: false },
  },
});

function parsePositiveInt(raw, fallback) {
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? Math.max(1, n) : fallback;
}

const SITES_FILE  = args.sites;
const NUM_RUNS    = parsePositiveInt(args.runs, 3);
const OUT_FILE    = args.out;
const CONCURRENCY = parsePositiveInt(args.concurrency, 1);
const MAX_PASSES  = parsePositiveInt(args["max-passes"], 3);
const CHROME_PATH = args["chrome-path"] || process.env.CHROME_PATH || "";
if (CHROME_PATH) process.env.CHROME_PATH = CHROME_PATH;
const VERBOSE     = args.verbose;
const FORCE       = args.force;

// ─── Failure policy ──────────────────────────────────────────────────────────
// Past runs burned ~120-160s per dead site (3 runs x 3 attempts, each attempt
// relaunching Chrome). A cheap reachability probe plus per-class retry limits
// and an early bail-out cut that to ~30-60s while keeping real sites intact.
const PREFLIGHT_TIMEOUT_MS = 8000;
const SITE_BUDGET_MS       = 90000;   // only applies until the first run succeeds
const DEGENERATE_GIVE_UP   = 2;       // degenerate LHRs before abandoning a site
const KNOWN_BAD_TTL_MS     = 7 * 24 * 60 * 60 * 1000;
const RETRIES_BY_CLASS     = { transport: 3, degenerate: 1, other: 2 };
const BROWSER_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36";

// ─── Timing instrumentation (--verbose) ──────────────────────────────────────
// Pure measurement: no effect on audit behaviour or results.
const TIMING = { chromeLaunchMs: 0, chromeLaunches: 0, lighthouseMs: 0, lighthouseRuns: 0, failedRunMs: 0, failedRuns: 0, sleepMs: 0 };
function fmtSecs(ms) { return (ms / 1000).toFixed(1); }

// ─── Graceful shutdown flag ───────────────────────────────────────────────────
let shutdownRequested = false;
let forceQuitArmed = false;
process.on("SIGINT", () => {
  if (!shutdownRequested) {
    console.log("\n⚠  Shutdown requested — finishing current site then saving… (Ctrl+C again to force quit)");
    shutdownRequested = true;
    forceQuitArmed = true;
  } else if (forceQuitArmed) {
    console.log("\n🛑 Force quit.");
    closeBrowser().finally(() => process.exit(1));
  }
});
process.on("SIGTERM", () => { if (!shutdownRequested) { console.log("\n⚠  SIGTERM received — finishing current site then saving…"); shutdownRequested = true; } });

// ─── Config ───────────────────────────────────────────────────────────────────
// Concurrency is handled by the site queue in main(); each auditSite owns its
// own Chrome instance (unique debug port + temp profile), so Lighthouse runs
// execute in parallel across sites.
const LIGHTHOUSE_FLAGS = {
  logLevel: "error", output: "json", onlyCategories: ["performance"],
  formFactor: "mobile",
  screenEmulation: { mobile: true, width: 360, height: 640, deviceScaleFactor: 2, disabled: false },
  throttlingMethod: "simulate",
  // Bound the gatherer: a hanging page used to burn the 45s default on every
  // attempt, and the full-page screenshot gatherer is the expensive part on
  // multi-MB pages. None of our reported metrics come from either.
  maxWaitForLoad: 20000,
  maxWaitForFcp: 15000,
  disableFullPageScreenshot: true,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
function mean(arr)         { return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null; }
function round(n, dp = 2)  { return n == null ? null : +n.toFixed(dp); }
function bytesToKB(bytes)  { return round(bytes / 1024, 1); }

// Maps Lighthouse's own resourceType classification (from network-requests)
// onto our reporting categories. This is authoritative — no regex guessing.
function classifyResource(resourceType) {
  switch (resourceType) {
    case "Script":     return "js";
    case "Stylesheet": return "css";
    case "Image":      return "image";
    case "Font":       return "font";
    case "Media":      return "media";
    case "Document":   return "document";
    case "XHR":
    case "Fetch":      return "xhr";
    default:           return "other";
  }
}

// Fixed: previous endsWith() check misclassified any host that merely ended
// with the site's hostname as a substring (e.g. "evil-example.com" vs
// "example.com"). Now requires a proper subdomain boundary or exact match.
function isThirdParty(resourceUrl, siteOrigin) {
  try {
    const rHost = new URL(resourceUrl).hostname.replace(/^www\./, "");
    const sHost = new URL(siteOrigin).hostname.replace(/^www\./, "");
    if (rHost === sHost) return false;
    return !rHost.endsWith("." + sHost) && !sHost.endsWith("." + rHost);
  } catch { return false; }
}

// ─── Failure classification ──────────────────────────────────────────────────
function classifyFailure(e) {
  const msg = String(e?.message ?? e);
  if (/degenerate LHR/i.test(msg)) return "degenerate";
  if (/ECONNREFUSED|ECONNRESET|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|socket hang up|connect |no chrome|Chrome on port/i.test(msg)) return "transport";
  return "other";
}

// Cheap reachability probe run before any Chrome/Lighthouse work. Only a
// connection-level failure counts as a signal: any HTTP status means the host
// is alive (many sites 403 bots but still render in Chrome), and a timeout is
// ambiguous (could be a slow site, e.g. Choppies), so neither is treated as dead.
async function preflight(url) {
  const startedAt = performance.now();
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(PREFLIGHT_TIMEOUT_MS),
      headers: { "user-agent": BROWSER_UA, accept: "text/html,application/xhtml+xml,*/*" },
    });
    try { await res.body?.cancel(); } catch { /* ignore */ }
    return { ok: true, status: res.status, ms: performance.now() - startedAt };
  } catch (e) {
    const code = e?.cause?.code || e?.code || "";
    const timedOut = e?.name === "TimeoutError" || /TIMEOUT/i.test(code);
    return {
      ok: false,
      kind: timedOut ? "timeout" : "connection",
      reason: timedOut
        ? `timeout after ${PREFLIGHT_TIMEOUT_MS}ms`
        : `${e?.message || e?.name || "fetch failed"}${code ? ` (${code})` : ""}`,
      ms: performance.now() - startedAt,
    };
  }
}

// Failures persist into meta.failed_sites so a later run can skip sites that are
// still dead, instead of paying the retry cost again.
const failedSites = new Map();   // url -> { name, url, reason, at }

function recordFailure(site, reason) {
  failedSites.set(site.url, { name: site.name, url: site.url, reason, at: new Date().toISOString() });
}

function clearFailure(url) {
  failedSites.delete(url);
}

function isRecentlyUnreachable(site) {
  if (FORCE) return null;
  const f = failedSites.get(site.url);
  if (!f) return null;
  if (!/^(unreachable|blocked)/.test(f.reason || "")) return null;   // transient reasons are always retried
  const age = Date.now() - Date.parse(f.at);
  if (!Number.isFinite(age) || age > KNOWN_BAD_TTL_MS) return null;
  return f;
}

// ─── Persist helpers ──────────────────────────────────────────────────────────
function loadExistingResults(outFile) {
  if (!fs.existsSync(outFile)) return {};
  try {
    const data = JSON.parse(fs.readFileSync(outFile, "utf8"));
    const arr  = Array.isArray(data) ? data : (data.results ?? []);
    const map  = {};
    for (const r of arr) if (r?.url) map[r.url] = r;
    return map;
  } catch (e) {
    console.warn(`⚠  Could not parse existing ${outFile} (${e.message}) — starting fresh instead of overwriting silently.`);
    return {};
  }
}

function loadExistingFailures(outFile) {
  if (!fs.existsSync(outFile)) return;
  try {
    const data = JSON.parse(fs.readFileSync(outFile, "utf8"));
    for (const f of data?.meta?.failed_sites ?? []) if (f?.url) failedSites.set(f.url, f);
  } catch { /* loadExistingResults already warned about this file */ }
}

function saveResults(outFile, allSites, resultsMap) {
  const ordered = allSites.map((s) => resultsMap[s.url]).filter(Boolean);
  const output = {
    meta: {
      ...buildMeta(allSites.length, NUM_RUNS),
      failed_sites: [...failedSites.values()]
        .filter((f) => !resultsMap[f.url])
        .sort((a, b) => a.name.localeCompare(b.name)),
    },
    summary: buildSummary(ordered),
    results: ordered,
  };
  fs.writeFileSync(outFile, JSON.stringify(output, null, 2));
}

// ─── Chrome lifecycle ────────────────────────────────────────────────────────
// One Chrome instance is reused across sites: launching per site costs ~0.6–1.3s
// and leaks temp profiles on Windows. It is recycled every N runs to bound
// memory growth, and relaunched after a failed run.
const CHROME_RECYCLE_EVERY_RUNS = 30;
const LIGHTHOUSE_CHROME_FLAGS = [
  "--headless", "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage",
  "--no-first-run", "--disable-extensions", "--disable-background-networking",
  "--disable-component-update", "--disable-default-apps", "--disable-sync",
  "--metrics-recording-only",
];

function makeTmpDir() {
  return path.join(os.homedir(), ".lh-tmp", `lh-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`);
}

async function launchChrome(tmpDir) {
  const launch = await getChromeLauncher();
  const startedAt = performance.now();
  const chrome = await launch({
    chromePath: CHROME_PATH || undefined,
    chromeFlags: [...LIGHTHOUSE_CHROME_FLAGS, `--user-data-dir=${tmpDir}`],
  });
  const ms = performance.now() - startedAt;
  TIMING.chromeLaunchMs += ms;
  TIMING.chromeLaunches++;
  if (VERBOSE) console.log(`   ⏱ chrome launch ${fmtSecs(ms)}s (port ${chrome.port})`);
  return chrome;
}

// chrome-launcher resolves before the DevTools endpoint accepts connections,
// which showed up as "connect ECONNREFUSED 127.0.0.1:<port>" in past runs.
async function waitForChrome(port, timeoutMs = 5000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`, { signal: AbortSignal.timeout(1000) });
      if (res.ok) return;
    } catch { /* not listening yet */ }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`Chrome on port ${port} was not ready within ${timeoutMs}ms`);
}

let sharedBrowser = null;   // { chrome, tmpDir, uses }

async function getBrowser() {
  if (sharedBrowser && sharedBrowser.uses >= CHROME_RECYCLE_EVERY_RUNS) {
    if (VERBOSE) console.log(`   ⏱ recycling Chrome after ${sharedBrowser.uses} runs`);
    await closeBrowser();
  }
  if (!sharedBrowser) {
    const tmpDir = makeTmpDir();
    fs.mkdirSync(tmpDir, { recursive: true });
    const chrome = await launchChrome(tmpDir);
    await waitForChrome(chrome.port);
    sharedBrowser = { chrome, tmpDir, uses: 0 };
  }
  sharedBrowser.uses++;
  return sharedBrowser;
}

async function closeBrowser() {
  if (!sharedBrowser) return;
  const { chrome, tmpDir } = sharedBrowser;
  sharedBrowser = null;
  try { await chrome.kill(); } catch { /* ignore */ }
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* ignore */ }
}

// ─── Lighthouse audit (performance + network, single pass) ───────────────────
async function runLighthouse(url, chrome, overrides = {}) {
  const lighthouse = await getLighthouse();
  const flags = Object.keys(overrides).length ? { ...LIGHTHOUSE_FLAGS, ...overrides } : LIGHTHOUSE_FLAGS;
  const runnerResult = await lighthouse(url, { ...flags, port: chrome.port });
  const lhr = runnerResult?.lhr ?? runnerResult;
  if (!lhr?.categories) throw new Error("Lighthouse returned no LHR data");

  const { categories: cats, audits } = lhr;
  const perf = {
    performanceScore: round((cats.performance?.score ?? 0) * 100, 0),
    lcp: round((audits["largest-contentful-paint"]?.numericValue ?? 0) / 1000, 2),
    cls: round( audits["cumulative-layout-shift"]?.numericValue  ?? 0, 3),
    tbt: round( audits["total-blocking-time"]?.numericValue      ?? 0, 0),
    fcp: round((audits["first-contentful-paint"]?.numericValue   ?? 0) / 1000, 2),
    si:  round((audits["speed-index"]?.numericValue              ?? 0) / 1000, 2),
    tti: round((audits["interactive"]?.numericValue              ?? 0) / 1000, 2),
  };

  const network = extractNetworkData(lhr, url);
  // A healthy page always produces ≥1 network request (its document) and a
  // first-contentful-paint. Zero requests means the gatherer failed (blocked
  // bot, broken LHR); no paint means the trace engine crashed and Lighthouse
  // still handed back an LHR full of zeros. Both are failures, not scores of 0.
  if (!(network.totalRequests > 0) || !(perf.fcp > 0)) {
    throw new Error(`Lighthouse returned a degenerate LHR (0 network requests or no paint) for ${url}`);
  }
  return { perf, network };
}

// Pull byte/request breakdown out of Lighthouse's network-requests audit
// instead of running a separate Playwright pass. transferSize (over-the-wire,
// post-compression) is used consistently for every resource, avoiding the
// old script's mixed content-length-vs-buffered-body units.
function extractNetworkData(lhr, requestedUrl) {
  const items = lhr.audits?.["network-requests"]?.details?.items ?? [];
  const siteOrigin = lhr.finalDisplayedUrl || lhr.finalUrl || requestedUrl;

  const resources = items
    .filter((it) => it.url && !it.url.startsWith("data:"))
    .map((it) => {
      const sizeBytes = it.transferSize ?? it.resourceSize ?? 0;
      return {
        url: it.url,
        category: classifyResource(it.resourceType),
        sizeBytes,
        thirdParty: isThirdParty(it.url, siteOrigin),
      };
    });

  const totalBytes = resources.reduce((s, r) => s + r.sizeBytes, 0);
  const byCategory = {};
  for (const r of resources) {
    if (!byCategory[r.category]) byCategory[r.category] = { count: 0, sizeBytes: 0 };
    byCategory[r.category].count++;
    byCategory[r.category].sizeBytes += r.sizeBytes;
  }
  const thirdPartyCount = resources.filter((r) => r.thirdParty).length;

  return {
    totalSizeKB:        bytesToKB(totalBytes),
    totalRequests:      resources.length,
    thirdPartyRequests: thirdPartyCount,
    thirdPartyRatio:    round(thirdPartyCount / Math.max(resources.length, 1), 3),
    byCategory: Object.fromEntries(
      Object.entries(byCategory).map(([k, v]) => [k, { count: v.count, sizeKB: bytesToKB(v.sizeBytes) }])
    ),
    largestResources: [...resources].sort((a, b) => b.sizeBytes - a.sizeBytes).slice(0, 5)
      .map((r) => ({ url: r.url.length > 80 ? r.url.slice(0, 77) + "..." : r.url, category: r.category, sizeKB: bytesToKB(r.sizeBytes) })),
  };
}

// Picks the trial whose totalSizeKB is closest to the median, rather than
// always taking the last run — avoids reporting an outlier run's resource list.
function representativeLargestResources(networkTrials) {
  const valid = networkTrials.filter((t) => t && Number.isFinite(t.totalSizeKB));
  if (!valid.length) return [];
  const sizes = valid.map((t) => t.totalSizeKB).sort((a, b) => a - b);
  const median = sizes[Math.floor(sizes.length / 2)];
  const closest = valid.reduce((best, t) =>
    Math.abs(t.totalSizeKB - median) < Math.abs(best.totalSizeKB - median) ? t : best
  );
  return closest.largestResources ?? [];
}

// ─── Per-site runner ──────────────────────────────────────────────────────────
async function auditSite(site) {
  const { name, url, industry } = site;
  const siteStart = performance.now();
  console.log(`\n▶  ${name} (${url})`);

  // Cheap reachability probe before spending a Chrome launch and up to 9
  // Lighthouse runs. A connection failure doesn't skip the site — it starts on
  // a single run/attempt and only completes the rest if that run works.
  const probe = await preflight(url);
  let suspect = !probe.ok && probe.kind === "connection";
  if (VERBOSE || !probe.ok) {
    console.log(`   ⏱ preflight ${fmtSecs(probe.ms)}s ${probe.ok ? `HTTP ${probe.status}` : `failed: ${probe.reason}`}`);
  }
  if (suspect) console.log(`   ⚠ Connection failed — trying one short run before giving up`);

  const perfTrials = [], networkTrials = [];
  let targetRuns = suspect ? 1 : NUM_RUNS;
  let degenerates = 0;
  let giveUpReason = null;

  try {
    for (let i = 1; i <= targetRuns && !giveUpReason; i++) {
      console.log(`   Run ${i}/${targetRuns}…`);
      let ok = false;
      let attempts = 0;
      let maxAttempts = suspect ? 1 : 2;

      while (!ok && !giveUpReason && attempts < maxAttempts) {
        // The budget only guards sites that have not produced a single result;
        // a healthy-but-heavy page (20 MB) must be allowed to finish its runs.
        if (!perfTrials.length && performance.now() - siteStart > SITE_BUDGET_MS) {
          giveUpReason = `budget exceeded after ${fmtSecs(performance.now() - siteStart)}s without a result`;
          break;
        }
        attempts++;
        const attemptStart = performance.now();
        try {
          const runStart = performance.now();
          const { chrome } = await getBrowser();
          const { perf, network } = await runLighthouse(url, chrome,
            suspect ? { maxWaitForLoad: 8000, maxWaitForFcp: 5000 } : {});
          const runMs = performance.now() - runStart;
          TIMING.lighthouseMs += runMs;
          TIMING.lighthouseRuns++;
          perfTrials.push(perf);
          networkTrials.push(network);
          console.log(`     Score: ${perf.performanceScore}  LCP: ${perf.lcp ?? "n/a"}s  TBT: ${perf.tbt ?? "n/a"}ms  |  ${network.totalSizeKB} KB / ${network.totalRequests} reqs${VERBOSE ? `  ⏱ ${fmtSecs(runMs)}s` : ""}`);
          ok = true;
          if (suspect) {
            suspect = false;
            targetRuns = NUM_RUNS;
            console.log(`   ✓ Probe suspect cleared — completing all ${NUM_RUNS} runs`);
          }
        } catch (e) {
          const kind = classifyFailure(e);
          TIMING.failedRunMs += performance.now() - attemptStart;
          TIMING.failedRuns++;
          if (kind === "degenerate") degenerates++;
          maxAttempts = suspect ? 1 : (RETRIES_BY_CLASS[kind] ?? 2);
          console.warn(`     ✗ Run failed (${kind}): ${e.message}`);
          if (degenerates >= DEGENERATE_GIVE_UP) {
            giveUpReason = `blocked: ${degenerates} degenerate LHRs (0 requests / no paint)`;
            break;
          }
          if (attempts < maxAttempts) {
            console.warn(`     ↻ retrying with a fresh Chrome (attempt ${attempts}/${maxAttempts})`);
            await closeBrowser();
          }
        }
      }

      if (i < targetRuns && !giveUpReason) {
        const sleepStart = performance.now();
        await new Promise((r) => setTimeout(r, 250));
        TIMING.sleepMs += performance.now() - sleepStart;
      }
    }
  } finally {
    // The shared Chrome outlives this site; it is recycled by getBrowser().
  }

  if (VERBOSE) console.log(`   ⏱ site total ${fmtSecs(performance.now() - siteStart)}s`);

  if (!perfTrials.length) {
    const probeReason = !probe.ok
      ? (probe.kind === "connection" ? `unreachable (${probe.reason})` : `probe timeout (${probe.reason})`)
      : null;
    const reason = giveUpReason ?? probeReason ?? "no successful run";
    console.warn(`   ⚠ No successful Lighthouse run for ${name} — not saving (${reason}).`);
    recordFailure(site, reason);
    return null;
  }

  clearFailure(url);

  const perfKeys = ["performanceScore", "lcp", "cls", "tbt", "fcp", "si", "tti"];
  const lighthouse_avg = {};
  for (const key of perfKeys) {
    const vals = perfTrials.map((t) => t[key]).filter((v) => v != null);
    lighthouse_avg[key] = round(median(vals), key === "tbt" ? 0 : key === "cls" ? 3 : 2);
  }

  const netKeys = ["totalSizeKB", "totalRequests", "thirdPartyRequests", "thirdPartyRatio"];
  const network_avg = {};
  for (const key of netKeys) {
    const vals = networkTrials.map((t) => t[key]).filter((v) => v != null);
    network_avg[key] = round(median(vals), key === "thirdPartyRatio" ? 3 : 1);
  }

  const allCategories = [...new Set(networkTrials.flatMap((t) => Object.keys(t.byCategory || {})))];
  const byCategory_avg = {};
  for (const cat of allCategories) {
    byCategory_avg[cat] = {
      count:  round(median(networkTrials.map((t) => t.byCategory?.[cat]?.count ?? 0)), 0),
      sizeKB: round(median(networkTrials.map((t) => t.byCategory?.[cat]?.sizeKB ?? 0)), 1),
    };
  }

  return {
    name, url, industry: industry || "unknown",
    audited_at: new Date().toISOString(),
    runs_completed: perfTrials.length,   // now one true "run" = one Lighthouse pass covering both metrics
    lighthouse: lighthouse_avg,
    network:    { ...network_avg, byCategory: byCategory_avg },
    largest_resources: representativeLargestResources(networkTrials),
  };
}

// ─── Summary helpers ──────────────────────────────────────────────────────────
function buildMeta(siteCount, runs) {
  return {
    generated_at: new Date().toISOString(),
    tool_versions: { lighthouse: "12.x" },
    methodology: "mobile-simulated, lighthouse-only (simulated throttling; network data from network-requests audit)",
    runs_per_site: runs, outlier_method: "median", sites_audited: siteCount, concurrency: CONCURRENCY,
  };
}

function buildSummary(results) {
  const valid = results.filter((r) => r.lighthouse);
  if (!valid.length) return {};
  const ranked = [...valid].sort((a, b) => (b.lighthouse.performanceScore ?? 0) - (a.lighthouse.performanceScore ?? 0));
  const byIndustry = {};
  for (const r of valid) { const ind = r.industry || "unknown"; (byIndustry[ind] = byIndustry[ind] || []).push(r.lighthouse.performanceScore ?? 0); }
  return {
    fastest_site: ranked[0]?.name, slowest_site: ranked.at(-1)?.name,
    ranking: ranked.map((r, i) => ({ rank: i + 1, name: r.name, score: r.lighthouse.performanceScore, lcp: r.lighthouse.lcp, totalSizeKB: r.network?.totalSizeKB })),
    industry_avg_score: Object.fromEntries(Object.entries(byIndustry).map(([k, scores]) => [k, round(mean(scores), 0)])),
  };
}

function printSummaryTable(results) {
  const valid = results.filter((r) => r.lighthouse);
  if (!valid.length) return;
  const ranked = [...valid].sort((a, b) => (b.lighthouse.performanceScore ?? 0) - (a.lighthouse.performanceScore ?? 0));
  console.log("\n┌─────────────────────────────────────────────────────────────────┐");
  console.log("│                     PERFORMANCE SUMMARY                        │");
  console.log("├──────────────────────────┬───────┬──────────┬──────────────────┤");
  console.log("│ Site                     │ Score │ LCP (s)  │ Page Size (KB)   │");
  console.log("├──────────────────────────┼───────┼──────────┼──────────────────┤");
  for (const r of ranked) {
    const name  = r.name.padEnd(24).slice(0, 24);
    const score = String(r.lighthouse.performanceScore ?? "-").padStart(5);
    const lcp   = String(r.lighthouse.lcp ?? "-").padStart(8);
    const size  = String(r.network?.totalSizeKB ?? "-").padStart(16);
    console.log(`│ ${name} │ ${score} │ ${lcp} │ ${size} │`);
  }
  console.log("└──────────────────────────┴───────┴──────────┴──────────────────┘\n");
}

// ─── Result sharing (opt-in, anonymous) ──────────────────────────────────────
function envFlag(name) { return /^(1|true|yes|on)$/i.test(process.env[name] || ""); }

async function askToShare() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await new Promise((resolve) =>
    rl.question("Share anonymous results to improve the report (no personal data)? [Y/n] ", resolve)
  );
  rl.close();
  const a = String(answer).trim().toLowerCase();
  return a === "" || a === "y" || a === "yes";
}

async function maybeShare(output) {
  if (args["no-upload"] || envFlag("BW_NO_UPLOAD")) return;
  let share = args.upload || envFlag("BW_UPLOAD");
  try {
    if (!share && process.stdin.isTTY && process.stdout.isTTY) share = await askToShare();
  } catch { share = false; }
  if (!share) {
    console.log("Results kept local. Re-run with --upload to share them anytime.\n");
    return;
  }

  console.log("⬆  Sharing anonymous results…");
  try {
    const runId = await uploadRun(output);
    console.log(`✓ Shared. Run id: ${runId}\n`);
  } catch (e) {
    console.warn(`⚠  Could not share results (${e.message}). Local results are unaffected.\n`);
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const startedAt = Date.now();
  if (!fs.existsSync(SITES_FILE)) {
    console.error(`✗ Sites file not found: ${SITES_FILE}`); process.exit(1);
  }

  const rawSites = JSON.parse(fs.readFileSync(SITES_FILE, "utf8"));
  const sites = rawSites.filter((s) => {
    if (!s?.url) { console.warn(`⚠  Skipping malformed site entry (missing url): ${JSON.stringify(s)}`); return false; }
    return true;
  });

  const resultsMap = loadExistingResults(OUT_FILE);
  loadExistingFailures(OUT_FILE);
  const skipped    = Object.keys(resultsMap).length;
  const knownBad   = sites.filter((s) => !resultsMap[s.url] && isRecentlyUnreachable(s));
  const initialTodo = sites.filter((s) => !resultsMap[s.url] && !isRecentlyUnreachable(s));

  console.log(`\n🔍 Botswana Web Performance Auditor (Lighthouse-only, resumable)`);
  console.log(`   Sites total:  ${sites.length}`);
  console.log(`   Already done: ${skipped}${skipped ? " (skipping)" : ""}`);
  if (knownBad.length) {
    console.log(`   Known bad:    ${knownBad.length} (unreachable in the last 7 days — skipped, use --force to retry)`);
  }
  console.log(`   To audit:     ${initialTodo.length}`);
  console.log(`   Runs/site:    ${NUM_RUNS}`);
  console.log(`   Max passes:   ${MAX_PASSES}`);
  console.log(`   Output:       ${OUT_FILE}\n`);

  let pass = 0;
  while (!shutdownRequested) {
    const todo = sites.filter((s) => !resultsMap[s.url] && !isRecentlyUnreachable(s));
    if (!todo.length) break;

    pass++;
    if (pass > MAX_PASSES) break;
    if (pass > 1) {
      console.log(`\n↻ Retry pass ${pass}/${MAX_PASSES}: ${todo.length} site(s) remaining… (waiting 30s for transient issues to clear)`);
      await new Promise((r) => setTimeout(r, 30000));
      if (shutdownRequested) break;
    }

    const queue = [...todo];
    let active  = 0;
    let stopped = false;
    let savedThisPass = 0;

    await new Promise((resolve) => {
      function next() {
        while (!stopped && active < CONCURRENCY && queue.length) {
          const site = queue.shift();
          active++;
          auditSite(site)
            .then((result) => {
              if (result) { resultsMap[site.url] = result; savedThisPass++; }
            })
            .catch((e) => {
              console.error(`   ✗ Fatal error for ${site.url}: ${e.message}`);
            })
            .finally(() => {
              saveResults(OUT_FILE, sites, resultsMap);
              const done = Object.keys(resultsMap).length;
              console.log(`   ✓ Saved (${done}/${sites.length})`);
              active--;

              if (shutdownRequested && !stopped) {
                stopped = true;
                queue.length = 0;
                console.log("🛑 Shutdown: remaining sites skipped. Progress saved.");
              }

              // Keep the pump primed: resolve the pass only after the queue
              // is drained and idle. Otherwise one site ends the whole pass.
              if (!stopped && queue.length) next();
              else if (active === 0) resolve();
            });
        }
        if (active === 0) resolve();
      }
      next();
    });

    if (shutdownRequested) break;

    // A pass that saves nothing just means the remaining sites are failing
    // persistently right now (blocked bots, dead hosts, transient flakiness).
    // Keep going until passes run out — never abort the whole audit early.
    if (savedThisPass === 0) {
      const remaining = sites.filter((s) => !resultsMap[s.url]).length;
      console.warn(`   ⚠ Pass ${pass}/${MAX_PASSES} completed 0 new sites (${remaining} remain) — ${pass < MAX_PASSES ? "will retry on next pass." : "out of passes, wrapping up."}`);
    }
  }

  const elapsedSeconds = round((Date.now() - startedAt) / 1000, 1);
  const mins = Math.floor(elapsedSeconds / 60);
  const secs = +(elapsedSeconds % 60).toFixed(1);

  const remaining = sites.filter((s) => !resultsMap[s.url]);
  if (remaining.length) {
    console.warn(`\n⚠ ${remaining.length} site(s) not saved:`);
    for (const s of remaining) {
      const f = failedSites.get(s.url);
      console.warn(`   • ${s.name}${f ? ` — ${f.reason}` : ""}`);
    }
    console.warn(`   Re-run later to retry them (--force ignores the 7-day known-bad cache).\n`);
  }

  printSummaryTable(sites.map((s) => resultsMap[s.url]).filter(Boolean));
  saveResults(OUT_FILE, sites, resultsMap);
  console.log(`\n✅ Audit complete in ${mins ? `${mins}m ` : ""}${secs}s. Results saved to ${OUT_FILE}`);

  if (VERBOSE) {
    console.log(`\n⏱  Timing breakdown`);
    console.log(`   Chrome launches: ${TIMING.chromeLaunches} in ${fmtSecs(TIMING.chromeLaunchMs)}s`);
    console.log(`   Lighthouse runs: ${TIMING.lighthouseRuns} in ${fmtSecs(TIMING.lighthouseMs)}s`);
    console.log(`   Failed runs:     ${TIMING.failedRuns} in ${fmtSecs(TIMING.failedRunMs)}s`);
    console.log(`   Inter-run sleep: ${fmtSecs(TIMING.sleepMs)}s`);
    console.log(`   Other/overhead:  ${fmtSecs(Math.max(0, (Date.now() - startedAt) - TIMING.chromeLaunchMs - TIMING.lighthouseMs - TIMING.failedRunMs - TIMING.sleepMs))}s`);
    console.log(`   Wall clock:      ${fmtSecs(Date.now() - startedAt)}s\n`);
  }

  const ordered = sites.map((s) => resultsMap[s.url]).filter(Boolean);
  await closeBrowser();
  await maybeShare({
    meta: { ...buildMeta(sites.length, NUM_RUNS), duration_seconds: elapsedSeconds },
    summary: buildSummary(ordered),
    results: ordered,
  });
}

main().catch(async (e) => { console.error("Fatal:", e); await closeBrowser(); process.exit(1); });