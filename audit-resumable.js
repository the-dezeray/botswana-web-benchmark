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
    "chrome-path": { type: "string", default: "" },
    upload:        { type: "boolean", default: false },
    "no-upload":   { type: "boolean", default: false },
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
const CHROME_PATH = args["chrome-path"] || process.env.CHROME_PATH || "";
if (CHROME_PATH) process.env.CHROME_PATH = CHROME_PATH;

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
    process.exit(1);
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
 
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function dropOutliers(values) {
  if (values.length < 4) return values;
  const sorted = [...values].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  const iqr = q3 - q1;
  return sorted.filter((v) => v >= q1 - 1.5 * iqr && v <= q3 + 1.5 * iqr);
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

function saveResults(outFile, allSites, resultsMap) {
  const ordered = allSites.map((s) => resultsMap[s.url]).filter(Boolean);
  const output = {
    meta:    buildMeta(allSites.length, NUM_RUNS),
    summary: buildSummary(ordered),
    results: ordered,
  };
  fs.writeFileSync(outFile, JSON.stringify(output, null, 2));
}

// ─── Chrome lifecycle (one instance shared across a site's runs, relaunched
//     on failure — concurrent Chrome instances can flake intermittently)
const RETRIES_PER_RUN = 3;
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
  return launch({
    chromePath: CHROME_PATH || undefined,
    chromeFlags: [...LIGHTHOUSE_CHROME_FLAGS, `--user-data-dir=${tmpDir}`],
  });
}

function scheduleCleanup(tmpDir) {
  setTimeout(() => { try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* ignore */ } }, 2000);
}

// ─── Lighthouse audit (performance + network, single pass) ───────────────────
async function runLighthouse(url, chrome) {
  const lighthouse = await getLighthouse();
  const runnerResult = await lighthouse(url, { ...LIGHTHOUSE_FLAGS, port: chrome.port });
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
  // A healthy page always produces ≥1 network request (its document). Zero
  // requests means Lighthouse's gatherer failed (concurrent-instance flake,
  // blocked bot, or broken LHR) — treat it as a failed run, not a score of 0.
  if (!(network.totalRequests > 0)) {
    throw new Error(`Lighthouse returned a degenerate LHR (0 network requests) for ${url}`);
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
  console.log(`\n▶  ${name} (${url})`);

  const perfTrials = [], networkTrials = [];
  let tmpDir = makeTmpDir();
  fs.mkdirSync(tmpDir, { recursive: true });
  let chrome = await launchChrome(tmpDir);

  try {
    for (let i = 1; i <= NUM_RUNS; i++) {
      console.log(`   Run ${i}/${NUM_RUNS}…`);
      let ok = false;
      for (let attempt = 1; attempt <= RETRIES_PER_RUN && !ok; attempt++) {
        try {
          const { perf, network } = await runLighthouse(url, chrome);
          perfTrials.push(perf);
          networkTrials.push(network);
          console.log(`     Score: ${perf.performanceScore}  LCP: ${perf.lcp ?? "n/a"}s  TBT: ${perf.tbt ?? "n/a"}ms  |  ${network.totalSizeKB} KB / ${network.totalRequests} reqs`);
          ok = true;
        } catch (e) {
          console.warn(`     ✗ Lighthouse run failed: ${e.message}${attempt < RETRIES_PER_RUN ? " (retrying with a fresh Chrome)" : ""}`);
          if (attempt < RETRIES_PER_RUN) {
            try { await chrome.kill(); } catch { /* ignore */ }
            scheduleCleanup(tmpDir);
            tmpDir = makeTmpDir();
            fs.mkdirSync(tmpDir, { recursive: true });
            chrome = await launchChrome(tmpDir);
          }
        }
      }
      if (i < NUM_RUNS) await new Promise((r) => setTimeout(r, 2000));
    }
  } finally {
    try { await chrome.kill(); } catch { /* ignore */ }
    scheduleCleanup(tmpDir);
  }

  if (!perfTrials.length) {
    console.warn(`   ⚠ No successful Lighthouse run for ${name} — not saving so it retries next time.`);
    return null;
  }

  const perfKeys = ["performanceScore", "lcp", "cls", "tbt", "fcp", "si", "tti"];
  const lighthouse_avg = {};
  for (const key of perfKeys) {
    const vals = perfTrials.map((t) => t[key]).filter((v) => v != null);
    lighthouse_avg[key] = round(mean(dropOutliers(vals)), key === "tbt" ? 0 : key === "cls" ? 3 : 2);
  }

  const netKeys = ["totalSizeKB", "totalRequests", "thirdPartyRequests", "thirdPartyRatio"];
  const network_avg = {};
  for (const key of netKeys) {
    const vals = networkTrials.map((t) => t[key]).filter((v) => v != null);
    network_avg[key] = round(mean(dropOutliers(vals)), key === "thirdPartyRatio" ? 3 : 1);
  }

  const allCategories = [...new Set(networkTrials.flatMap((t) => Object.keys(t.byCategory || {})))];
  const byCategory_avg = {};
  for (const cat of allCategories) {
    byCategory_avg[cat] = {
      count:  round(mean(dropOutliers(networkTrials.map((t) => t.byCategory?.[cat]?.count ?? 0))), 0),
      sizeKB: round(mean(dropOutliers(networkTrials.map((t) => t.byCategory?.[cat]?.sizeKB ?? 0))), 1),
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
    runs_per_site: runs, outlier_method: "IQR", sites_audited: siteCount,
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
  const skipped    = Object.keys(resultsMap).length;
  const initialTodo = sites.filter((s) => !resultsMap[s.url]);

  console.log(`\n🔍 Botswana Web Performance Auditor (Lighthouse-only, resumable)`);
  console.log(`   Sites total:  ${sites.length}`);
  console.log(`   Already done: ${skipped}${skipped ? " (skipping)" : ""}`);
  console.log(`   To audit:     ${initialTodo.length}`);
  console.log(`   Runs/site:    ${NUM_RUNS}`);
  console.log(`   Output:       ${OUT_FILE}\n`);

  while (!shutdownRequested) {
    const todo = sites.filter((s) => !resultsMap[s.url]);
    if (!todo.length) break;

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

              if (active === 0) resolve();
              else next();
            });
        }
        if (active === 0) resolve();
      }
      next();
    });

    if (shutdownRequested) break;

    // If a full pass produced zero new results, the remaining sites are
    // failing persistently (blocked bots, dead hosts, etc.). Stop rather than
    // looping forever; they can be retried on a later run.
    if (savedThisPass === 0) {
      const remaining = sites.filter((s) => !resultsMap[s.url]).map((s) => s.name);
      console.warn(`\n⚠ No sites completed this pass. ${remaining.length} site(s) remain unsaved:\n   ${remaining.join(", ")}\n   Stopping to avoid an infinite retry loop — re-run to retry them.\n`);
      break;
    }
  }

  const elapsedSeconds = round((Date.now() - startedAt) / 1000, 1);
  const mins = Math.floor(elapsedSeconds / 60);
  const secs = +(elapsedSeconds % 60).toFixed(1);

  printSummaryTable(sites.map((s) => resultsMap[s.url]).filter(Boolean));
  saveResults(OUT_FILE, sites, resultsMap);
  console.log(`\n✅ Audit complete in ${mins ? `${mins}m ` : ""}${secs}s. Results saved to ${OUT_FILE}`);

  const ordered = sites.map((s) => resultsMap[s.url]).filter(Boolean);
  await maybeShare({
    meta: { ...buildMeta(sites.length, NUM_RUNS), duration_seconds: elapsedSeconds },
    summary: buildSummary(ordered),
    results: ordered,
  });
}

main().catch((e) => { console.error("Fatal:", e); process.exit(1); });