#!/usr/bin/env node
/**
 * Botswana Web Performance Auditor - Zero Scores Only
 * - Only audits sites that have a performance score of 0 in the existing results
 * - Overwrites the zero-score results with new audit data
 * - Gracefully shuts down on Ctrl+C: finishes current site, saves, exits cleanly
 *
 * Usage:
 *   node audit-zero-scores.js --sites sites.json --runs 3 --out results.json
 */

const { chromium } = require("playwright");
let chromeLauncher;
async function getChromeLauncher() {
  if (!chromeLauncher) ({ launch: chromeLauncher } = await import("chrome-launcher"));
  return chromeLauncher;
}
const fs   = require("fs");
const os   = require("os");
const path = require("path");
const { parseArgs } = require("util");

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
  },
});

const SITES_FILE  = args.sites;
const NUM_RUNS    = Math.max(1, parseInt(args.runs, 10));
const OUT_FILE    = args.out;
const CONCURRENCY = Math.max(1, parseInt(args.concurrency, 10));
const CHROME_PATH = args["chrome-path"] || process.env.CHROME_PATH || "";
if (CHROME_PATH) process.env.CHROME_PATH = CHROME_PATH;

// ─── Graceful shutdown flag ───────────────────────────────────────────────────
let shutdownRequested = false;
process.on("SIGINT",  () => { if (!shutdownRequested) { console.log("\n⚠  Shutdown requested — finishing current site then saving…"); shutdownRequested = true; } });
process.on("SIGTERM", () => { if (!shutdownRequested) { console.log("\n⚠  SIGTERM received — finishing current site then saving…");  shutdownRequested = true; } });

// ─── Lighthouse mutex ─────────────────────────────────────────────────────────
let lhMutexTail = Promise.resolve();
function withLighthouseLock(fn) {
  const next = lhMutexTail.then(() => fn());
  lhMutexTail = next.catch(() => {});
  return next;
}

// ─── Config ───────────────────────────────────────────────────────────────────
const LIGHTHOUSE_FLAGS = {
  logLevel: "error", output: "json", onlyCategories: ["performance"],
  formFactor: "mobile",
  screenEmulation: { mobile: true, width: 360, height: 640, deviceScaleFactor: 2, disabled: false },
  throttlingMethod: "simulate",
  throttling: { rttMs: 150, throughputKbps: 1638.4, cpuSlowdownMultiplier: 4 },
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

function classifyResource(url, type) {
  if (type === "script"     || url.match(/\.js(\?|$)/i))                         return "js";
  if (type === "stylesheet" || url.match(/\.css(\?|$)/i))                        return "css";
  if (type === "image"      || url.match(/\.(png|jpe?g|gif|webp|svg|avif)(\?|$)/i)) return "image";
  if (type === "font"       || url.match(/\.(woff2?|ttf|otf|eot)(\?|$)/i))      return "font";
  if (type === "media"      || url.match(/\.(mp4|webm|ogg|mp3)(\?|$)/i))        return "media";
  return "other";
}

function isThirdParty(resourceUrl, siteOrigin) {
  try {
    const rHost = new URL(resourceUrl).hostname.replace(/^www\./, "");
    const sHost = new URL(siteOrigin).hostname.replace(/^www\./, "");
    return !rHost.endsWith(sHost) && !sHost.endsWith(rHost);
  } catch { return false; }
}

// ─── Persist helpers ──────────────────────────────────────────────────────────
function loadExistingResults(outFile) {
  if (!fs.existsSync(outFile)) return { results: [], meta: {}, summary: {} };
  try {
    const data = JSON.parse(fs.readFileSync(outFile, "utf8"));
    return {
      results: Array.isArray(data) ? data : (data.results ?? []),
      meta: data.meta ?? {},
      summary: data.summary ?? {}
    };
  } catch { 
    return { results: [], meta: {}, summary: {} };
  }
}

function findZeroScoreSites(allSites, existingResults) {
  const resultsMap = {};
  for (const r of existingResults) if (r?.url) resultsMap[r.url] = r;
  
  const zeroScoreSites = [];
  for (const site of allSites) {
    const result = resultsMap[site.url];
    if (result && result.lighthouse && result.lighthouse.performanceScore === 0) {
      zeroScoreSites.push(site);
    }
  }
  return zeroScoreSites;
}

function saveResults(outFile, originalData, updatedResults) {
  // Create a map of updated results by URL
  const updatedMap = {};
  for (const result of updatedResults) {
    if (result?.url) updatedMap[result.url] = result;
  }
  
  // Update the original results array
  const finalResults = originalData.results.map(result => {
    if (result?.url && updatedMap[result.url]) {
      return updatedMap[result.url];
    }
    return result;
  });
  
  // Rebuild summary with all sites (original + updated)
  const output = {
    meta: {
      ...originalData.meta,
      generated_at: new Date().toISOString(),
      last_zero_score_audit: new Date().toISOString()
    },
    summary: buildSummary(finalResults),
    results: finalResults,
  };
  
  fs.writeFileSync(outFile, JSON.stringify(output, null, 2));
}

// ─── Playwright network capture ───────────────────────────────────────────────
async function captureNetworkData(url) {
  const browser = await chromium.launch({ headless: true, executablePath: CHROME_PATH || undefined });
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Linux; Android 9; Moto G4 Build/PPIS29.93-14.4-3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Mobile Safari/537.36",
    viewport: { width: 360, height: 640 },
  });
  const page = await context.newPage();
  const resources = [];

  page.on("response", async (response) => {
    try {
      const req = response.request();
      let size = 0;
      try {
        const headers = await response.allHeaders();
        if (headers["content-length"]) size = parseInt(headers["content-length"], 10) || 0;
        else size = (await response.body().catch(() => Buffer.alloc(0))).length;
      } catch { /* ignore */ }
      resources.push({
        url: response.url(), type: req.resourceType(),
        category: classifyResource(response.url(), req.resourceType()),
        status: response.status(), sizeBytes: size,
        thirdParty: isThirdParty(response.url(), url),
      });
    } catch { /* ignore */ }
  });

  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(1500);
  } catch (e) { console.warn(`    ⚠ Navigation warning for ${url}: ${e.message}`); }

  await browser.close();

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
    byCategory: Object.fromEntries(Object.entries(byCategory).map(([k, v]) => [k, { count: v.count, sizeKB: bytesToKB(v.sizeBytes) }])),
    largestResources: [...resources].sort((a, b) => b.sizeBytes - a.sizeBytes).slice(0, 5)
      .map((r) => ({ url: r.url.length > 80 ? r.url.slice(0, 77) + "..." : r.url, category: r.category, sizeKB: bytesToKB(r.sizeBytes) })),
  };
}

// ─── Lighthouse audit ─────────────────────────────────────────────────────────
async function runLighthouse(url) {
  const lighthouse = await getLighthouse();
  const tmpDir = path.join(os.homedir(), ".lh-tmp", `lh-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`);
  fs.mkdirSync(tmpDir, { recursive: true });

  const launch = await getChromeLauncher();
  const chrome = await launch({
    chromePath: CHROME_PATH || undefined,
    chromeFlags: ["--headless", "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage", `--user-data-dir=${tmpDir}`],
  });

  let result = null;
  try {
    const runnerResult = await lighthouse(url, { ...LIGHTHOUSE_FLAGS, port: chrome.port });
    const lhr = runnerResult?.lhr ?? runnerResult;
    if (!lhr?.categories) throw new Error("Lighthouse returned no LHR data");
    const { categories: cats, audits } = lhr;
    result = {
      performanceScore: round((cats.performance?.score ?? 0) * 100, 0),
      lcp: round((audits["largest-contentful-paint"]?.numericValue  ?? 0) / 1000, 2),
      cls: round( audits["cumulative-layout-shift"]?.numericValue   ?? 0, 3),
      tbt: round( audits["total-blocking-time"]?.numericValue       ?? 0, 0),
      fcp: round((audits["first-contentful-paint"]?.numericValue    ?? 0) / 1000, 2),
      si:  round((audits["speed-index"]?.numericValue               ?? 0) / 1000, 2),
      tti: round((audits["interactive"]?.numericValue               ?? 0) / 1000, 2),
    };
  } finally {
    try { await chrome.kill(); } catch { /* ignore */ }
    setTimeout(() => { try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* ignore */ } }, 2000);
  }
  return result;
}

// ─── Per-site runner ──────────────────────────────────────────────────────────
async function auditSite(site) {
  const { name, url, industry } = site;
  console.log(`\n▶  ${name} (${url}) - RE-AUDITING ZERO SCORE`);

  const lighthouseTrials = [], networkTrials = [];

  for (let i = 1; i <= NUM_RUNS; i++) {
    console.log(`   Run ${i}/${NUM_RUNS}…`);
    const [lhResult, netResult] = await Promise.allSettled([
      withLighthouseLock(() => runLighthouse(url)),
      captureNetworkData(url),
    ]);

    if (lhResult.status === "fulfilled") {
      lighthouseTrials.push(lhResult.value);
      const lh = lhResult.value;
      console.log(`     LH score: ${lh.performanceScore}  LCP: ${lh.lcp ?? "n/a"}s  TBT: ${lh.tbt ?? "n/a"}ms`);
    } else console.warn(`     ✗ Lighthouse failed: ${lhResult.reason.message}`);

    if (netResult.status === "fulfilled") {
      networkTrials.push(netResult.value);
      const net = netResult.value;
      console.log(`     Network: ${net.totalSizeKB} KB / ${net.totalRequests} reqs`);
    } else console.warn(`     ✗ Playwright failed: ${netResult.reason.message}`);

    if (i < NUM_RUNS) await new Promise((r) => setTimeout(r, 2000));
  }

  const lhKeys = ["performanceScore", "lcp", "cls", "tbt", "fcp", "si", "tti"];
  const lighthouse_avg = {};
  for (const key of lhKeys) {
    const vals = lighthouseTrials.map((t) => t[key]).filter((v) => v != null);
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
    runs_completed: lighthouseTrials.length,
    lighthouse: lighthouse_avg,
    network:    { ...network_avg, byCategory: byCategory_avg },
    largest_resources: networkTrials.at(-1)?.largestResources ?? [],
  };
}

// ─── Summary helpers ──────────────────────────────────────────────────────────
function buildSummary(results) {
  const valid = results.filter((r) => r.lighthouse);
  if (!valid.length) return {};
  const ranked = [...valid].sort((a, b) => (b.lighthouse.performanceScore ?? 0) - (a.lighthouse.performanceScore ?? 0));
  const byIndustry = {};
  for (const r of valid) { const ind = r.industry || "unknown"; (byIndustry[ind] = byIndustry[ind] || []).push(r.lighthouse.performanceScore ?? 0); }
  return {
    fastest_site: ranked[0]?.name, 
    slowest_site: ranked.at(-1)?.name,
    ranking: ranked.map((r, i) => ({ 
      rank: i + 1, 
      name: r.name, 
      score: r.lighthouse.performanceScore, 
      lcp: r.lighthouse.lcp, 
      totalSizeKB: r.network?.totalSizeKB 
    })),
    industry_avg_score: Object.fromEntries(Object.entries(byIndustry).map(([k, scores]) => [k, round(mean(scores), 0)])),
  };
}

function printZeroScoresSummary(zeroScoreSites, updatedResults) {
  console.log("\n┌─────────────────────────────────────────────────────────────────┐");
  console.log("│                  ZERO SCORES RE-AUDIT SUMMARY                  │");
  console.log("├──────────────────────────┬───────┬──────────┬──────────────────┤");
  console.log("│ Site                     │ Score │ LCP (s)  │ Page Size (KB)   │");
  console.log("├──────────────────────────┼───────┼──────────┼──────────────────┤");
  
  for (const result of updatedResults) {
    if (!result.lighthouse) continue;
    const name  = result.name.padEnd(24).slice(0, 24);
    const score = String(result.lighthouse.performanceScore ?? "-").padStart(5);
    const lcp   = String(result.lighthouse.lcp ?? "-").padStart(8);
    const size  = String(result.network?.totalSizeKB ?? "-").padStart(16);
    console.log(`│ ${name} │ ${score} │ ${lcp} │ ${size} │`);
  }
  console.log("└──────────────────────────┴───────┴──────────┴──────────────────┘\n");
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  if (!fs.existsSync(SITES_FILE)) {
    console.error(`✗ Sites file not found: ${SITES_FILE}`); process.exit(1);
  }
  
  if (!fs.existsSync(OUT_FILE)) {
    console.error(`✗ Results file not found: ${OUT_FILE}`);
    console.error(`   This script requires an existing results file with performance scores.`);
    console.error(`   Run the main audit script first: node audit-resumable.js`);
    process.exit(1);
  }

  const sites = JSON.parse(fs.readFileSync(SITES_FILE, "utf8"));
  const originalData = loadExistingResults(OUT_FILE);
  const zeroScoreSites = findZeroScoreSites(sites, originalData.results);

  console.log(`\n🔍 Botswana Web Performance Auditor - Zero Scores Re-audit`);
  console.log(`   Sites total:        ${sites.length}`);
  console.log(`   Sites with score 0: ${zeroScoreSites.length}`);
  console.log(`   Runs/site:          ${NUM_RUNS}`);
  console.log(`   Output:             ${OUT_FILE}\n`);

  if (zeroScoreSites.length === 0) {
    console.log("✅ No sites with zero performance scores found. Nothing to re-audit.\n");
    return;
  }

  // Show which sites will be re-audited
  console.log("🔄 Sites to re-audit:");
  for (const site of zeroScoreSites) {
    console.log(`   • ${site.name} (${site.url})`);
  }
  console.log();

  const updatedResults = [];
  let completed = 0;

  for (const site of zeroScoreSites) {
    if (shutdownRequested) break;

    try {
      const result = await auditSite(site);
      updatedResults.push(result);
      completed++;
      
      // Save progress after each site
      saveResults(OUT_FILE, originalData, updatedResults);
      console.log(`   ✓ Progress saved (${completed}/${zeroScoreSites.length} zero-score sites updated)`);
      
    } catch (e) {
      console.error(`   ✗ Fatal error for ${site.url}: ${e.message}`);
      const errorResult = { 
        name: site.name, 
        url: site.url, 
        industry: site.industry || "unknown",
        audited_at: new Date().toISOString(),
        error: e.message,
        lighthouse: { performanceScore: 0, lcp: 0, cls: 0, tbt: 0, fcp: 0, si: 0, tti: 0 },
        network: { totalSizeKB: 0, totalRequests: 0, thirdPartyRequests: 0, thirdPartyRatio: 0, byCategory: {} },
        largest_resources: []
      };
      updatedResults.push(errorResult);
      completed++;
      
      saveResults(OUT_FILE, originalData, updatedResults);
      console.log(`   ✓ Error logged and progress saved (${completed}/${zeroScoreSites.length})`);
    }
  }

  if (shutdownRequested) {
    console.log("🛑 Shutdown: remaining sites skipped. Progress saved.");
  }

  printZeroScoresSummary(zeroScoreSites, updatedResults);
  console.log(`\n✅ Zero-score re-audit complete. ${completed}/${zeroScoreSites.length} sites updated in ${OUT_FILE}\n`);
}

main().catch((e) => { console.error("Fatal:", e); process.exit(1); });