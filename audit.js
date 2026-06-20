#!/usr/bin/env node

/**
 * Botswana Web Performance Auditor
 * Combines Lighthouse (lab scores) + Playwright (network data)
 * Runs N trials per site, drops outliers, averages results → JSON
 *
 * Usage:
 *   node audit.js --sites sites.json --runs 3 --out results.json
 *
 * Install deps first:
 *   npm install playwright lighthouse chrome-launcher axios
 *   npx playwright install chromium
 */

    const { chromium } = require("playwright");
    let chromeLauncher;
    async function getChromeLauncher() {
      if (!chromeLauncher) ({ launch: chromeLauncher } = await import("chrome-launcher"));
      return chromeLauncher;
    }
    const fs = require("fs");
    const os = require("os");
    const path = require("path");
    const { parseArgs } = require("util");

    // Lighthouse 12+ uses ES modules - need dynamic import
    async function getLighthouse() {
      const { default: lighthouse } = await import('lighthouse');
      return lighthouse;
    }

    // ─── CLI args ────────────────────────────────────────────────────────────────
    const { values: args } = parseArgs({
      options: {
        sites: { type: "string", default: "sites.json" },
        runs:  { type: "string", default: "3" },
        out:   { type: "string", default: "results.json" },
      },
    });

    const SITES_FILE = args.sites;
    const NUM_RUNS   = Math.max(1, parseInt(args.runs, 10));
    const OUT_FILE   = args.out;

    // ─── Config ──────────────────────────────────────────────────────────────────
    const LIGHTHOUSE_FLAGS = {
      logLevel: "error",
      output: "json",
      onlyCategories: ["performance"],
      // Mobile config (Moto G4 throttling)
      formFactor: "mobile",
      screenEmulation: {
        mobile: true,
        width: 360,
        height: 640,
        deviceScaleFactor: 2,
        disabled: false,
      },
      throttlingMethod: "simulate",
      throttling: {
        rttMs: 150,
        throughputKbps: 1638.4,
        cpuSlowdownMultiplier: 4,
      },
    };

    // ─── Helpers ─────────────────────────────────────────────────────────────────

    /** Remove statistical outliers using IQR method */
    function dropOutliers(values) {
      if (values.length < 4) return values;
      const sorted = [...values].sort((a, b) => a - b);
      const q1 = sorted[Math.floor(sorted.length * 0.25)];
      const q3 = sorted[Math.floor(sorted.length * 0.75)];
      const iqr = q3 - q1;
      return sorted.filter((v) => v >= q1 - 1.5 * iqr && v <= q3 + 1.5 * iqr);
    }

    function mean(arr) {
      if (!arr.length) return null;
      return arr.reduce((a, b) => a + b, 0) / arr.length;
    }

    function round(n, dp = 2) {
      return n == null ? null : +n.toFixed(dp);
    }

    function bytesToKB(bytes) {
      return round(bytes / 1024, 1);
    }

    /** Classify a resource URL into a category */
    function classifyResource(url, type) {
      if (type === "script" || url.match(/\.js(\?|$)/i)) return "js";
      if (type === "stylesheet" || url.match(/\.css(\?|$)/i)) return "css";
      if (type === "image" || url.match(/\.(png|jpe?g|gif|webp|svg|avif)(\?|$)/i)) return "image";
      if (type === "font" || url.match(/\.(woff2?|ttf|otf|eot)(\?|$)/i)) return "font";
      if (type === "media" || url.match(/\.(mp4|webm|ogg|mp3)(\?|$)/i)) return "media";
      return "other";
    }

    /** Detect third-party origin: anything not on site's own hostname */
    function isThirdParty(resourceUrl, siteOrigin) {
      try {
        const rHost = new URL(resourceUrl).hostname.replace(/^www\./, "");
        const sHost = new URL(siteOrigin).hostname.replace(/^www\./, "");
        return !rHost.endsWith(sHost) && !sHost.endsWith(rHost);
      } catch {
        return false;
      }
    }

    // ─── Playwright network capture ───────────────────────────────────────────────
    async function captureNetworkData(url) {
      const browser = await chromium.launch({ headless: true });
      const context = await browser.newContext({
        userAgent:
          "Mozilla/5.0 (Linux; Android 9; Moto G4 Build/PPIS29.93-14.4-3) " +
          "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Mobile Safari/537.36",
        viewport: { width: 360, height: 640 },
      });

      const page = await context.newPage();
      const resources = [];

      page.on("response", async (response) => {
        try {
          const req    = response.request();
          const status = response.status();
          const resUrl = response.url();
          let size = 0;

          try {
            const headers = await response.allHeaders();
            if (headers["content-length"]) {
              size = parseInt(headers["content-length"], 10) || 0;
            } else {
              const body = await response.body().catch(() => Buffer.alloc(0));
              size = body.length;
            }
          } catch { /* ignore body errors */ }

          resources.push({
            url:      resUrl,
            type:     req.resourceType(),
            category: classifyResource(resUrl, req.resourceType()),
            status,
            sizeBytes: size,
            thirdParty: isThirdParty(resUrl, url),
          });
        } catch { /* ignore response processing errors */ }
      });

      try {
        await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
        // Small wait to catch any late-loading resources
        await page.waitForTimeout(1500);
      } catch (e) {
        console.warn(`    ⚠ Navigation warning for ${url}: ${e.message}`);
      }

      await browser.close();

      // Aggregate
      const totalBytes     = resources.reduce((s, r) => s + r.sizeBytes, 0);
      const totalRequests  = resources.length;
      const thirdPartyCount = resources.filter((r) => r.thirdParty).length;

      const byCategory = {};
      for (const r of resources) {
        if (!byCategory[r.category]) byCategory[r.category] = { count: 0, sizeBytes: 0 };
        byCategory[r.category].count++;
        byCategory[r.category].sizeBytes += r.sizeBytes;
      }

      // Top 5 largest resources
      const largest = [...resources]
        .sort((a, b) => b.sizeBytes - a.sizeBytes)
        .slice(0, 5)
        .map((r) => ({
          url:      r.url.length > 80 ? r.url.slice(0, 77) + "..." : r.url,
          category: r.category,
          sizeKB:   bytesToKB(r.sizeBytes),
        }));

      return {
        totalSizeKB:       bytesToKB(totalBytes),
        totalRequests,
        thirdPartyRequests: thirdPartyCount,
        thirdPartyRatio:   round(thirdPartyCount / Math.max(totalRequests, 1), 3),
        byCategory: Object.fromEntries(
          Object.entries(byCategory).map(([k, v]) => [
            k,
            { count: v.count, sizeKB: bytesToKB(v.sizeBytes) },
          ])
        ),
        largestResources: largest,
      };
    }

    // ─── Lighthouse audit ─────────────────────────────────────────────────────────
    async function runLighthouse(url) {
      const lighthouse = await getLighthouse();

      // Windows fix: use a writable dir we own, avoiding EPERM on system temp
      // Create unique temp dir per run to avoid conflicts
      const tmpBase = path.join(os.homedir(), ".lh-tmp");
      const tmpDir = path.join(tmpBase, `lh-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`);
      if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

  const launch = await getChromeLauncher();
  const chrome = await launch({
        chromeFlags: [
          "--headless",
          "--no-sandbox",
          "--disable-gpu",
          "--disable-dev-shm-usage",
          `--user-data-dir=${tmpDir}`,
        ],
        // Prevent chrome-launcher from trying to clean up temp dirs (causes EPERM on Windows)
      });

      let result = null;

      try {
        const lighthouse = await getLighthouse();
        const runnerResult = await lighthouse(url, {
          ...LIGHTHOUSE_FLAGS,
          port: chrome.port,
        });

        // Lighthouse 12 wraps result differently — handle both shapes
        const lhr = runnerResult?.lhr ?? runnerResult;
        if (!lhr?.categories) throw new Error("Lighthouse returned no LHR data");

        const cats   = lhr.categories;
        const audits = lhr.audits;

        result = {
          performanceScore: round((cats.performance?.score ?? 0) * 100, 0),
          lcp: round((audits["largest-contentful-paint"]?.numericValue ?? 0) / 1000, 2),
          cls: round(audits["cumulative-layout-shift"]?.numericValue ?? 0, 3),
          tbt: round(audits["total-blocking-time"]?.numericValue ?? 0, 0),
          fcp: round((audits["first-contentful-paint"]?.numericValue ?? 0) / 1000, 2),
          si:  round((audits["speed-index"]?.numericValue ?? 0) / 1000, 2),
          tti: round((audits["interactive"]?.numericValue ?? 0) / 1000, 2),
        };
      } catch (lighthouseError) {
        console.error(`Lighthouse error for ${url}:`, lighthouseError.message);
        throw lighthouseError;
      } finally {
        // Kill Chrome and clean up
        try {
          await chrome.kill();
        } catch (killError) {
          // Ignore kill errors
        }

        // Clean up temp directory after a brief delay
        setTimeout(() => {
          try {
            if (fs.existsSync(tmpDir)) {
              fs.rmSync(tmpDir, { recursive: true, force: true });
            }
          } catch (cleanupError) {
            // Ignore cleanup errors
          }
        }, 2000);
      }

      return result;
    }

    // ─── Per-site runner (N trials) ───────────────────────────────────────────────
    async function auditSite(site) {
      const { name, url, industry } = site;
      console.log(`\n▶  ${name} (${url})`);

      const lighthouseTrials = [];
      const networkTrials    = [];

      for (let i = 1; i <= NUM_RUNS; i++) {
        console.log(`   Run ${i}/${NUM_RUNS}...`);

        // Lighthouse
        try {
          const lh = await runLighthouse(url);
          lighthouseTrials.push(lh);
          console.log(`     LH score: ${lh.performanceScore}  LCP: ${lh.lcp ?? "n/a"}s  TBT: ${lh.tbt ?? "n/a"}ms`);
        } catch (e) {
          console.warn(`     ✗ Lighthouse failed: ${e.message}`);
        }

        // Network via Playwright
        try {
          const net = await captureNetworkData(url);
          networkTrials.push(net);
          console.log(`     Network: ${net.totalSizeKB} KB / ${net.totalRequests} reqs`);
        } catch (e) {
          console.warn(`     ✗ Playwright failed: ${e.message}`);
        }

        // Brief cooldown between runs
        if (i < NUM_RUNS) await new Promise((r) => setTimeout(r, 2000));
      }

      // ── Average Lighthouse metrics (with outlier removal) ──
      const lhKeys = ["performanceScore", "lcp", "cls", "tbt", "fcp", "si", "tti"];
      const lighthouse_avg = {};
      for (const key of lhKeys) {
        const vals = lighthouseTrials.map((t) => t[key]).filter((v) => v != null);
        const clean = dropOutliers(vals);
        lighthouse_avg[key] = round(mean(clean), key === "tbt" ? 0 : key === "cls" ? 3 : 2);
      }

      // ── Average network metrics ──
      const netKeys = ["totalSizeKB", "totalRequests", "thirdPartyRequests", "thirdPartyRatio"];
      const network_avg = {};
      for (const key of netKeys) {
        const vals = networkTrials.map((t) => t[key]).filter((v) => v != null);
        const clean = dropOutliers(vals);
        network_avg[key] = round(mean(clean), key === "thirdPartyRatio" ? 3 : 1);
      }

      // Category breakdown averaged
      const allCategories = [
        ...new Set(networkTrials.flatMap((t) => Object.keys(t.byCategory || {}))),
      ];
      const byCategory_avg = {};
      for (const cat of allCategories) {
        const counts = networkTrials.map((t) => t.byCategory?.[cat]?.count ?? 0);
        const sizes  = networkTrials.map((t) => t.byCategory?.[cat]?.sizeKB ?? 0);
        byCategory_avg[cat] = {
          count:  round(mean(dropOutliers(counts)), 0),
          sizeKB: round(mean(dropOutliers(sizes)), 1),
        };
      }

      // Use last run's largestResources as representative sample
      const largestResources = networkTrials.at(-1)?.largestResources ?? [];

      return {
        name,
        url,
        industry: industry || "unknown",
        audited_at: new Date().toISOString(),
        runs_completed: lighthouseTrials.length,
        lighthouse:     lighthouse_avg,
        network:        { ...network_avg, byCategory: byCategory_avg },
        largest_resources: largestResources,
      };
    }

    // ─── Main ─────────────────────────────────────────────────────────────────────
    async function main() {
      if (!fs.existsSync(SITES_FILE)) {
        console.error(`✗ Sites file not found: ${SITES_FILE}`);
        console.error(
          `  Create a sites.json like:\n  ${JSON.stringify(
            [{ name: "Example Corp", url: "https://example.co.bw", industry: "finance" }],
            null,
            2
          )}`
        );
        process.exit(1);
      }

      const sites = JSON.parse(fs.readFileSync(SITES_FILE, "utf8"));
      console.log(`\n🔍 Botswana Web Performance Auditor`);
      console.log(`   Sites:  ${sites.length}`);
      console.log(`   Runs:   ${NUM_RUNS} per site`);
      console.log(`   Output: ${OUT_FILE}\n`);

      const results = [];

      for (const site of sites) {
        try {
          const result = await auditSite(site);
          results.push(result);
          // Save incrementally in case of crash
          fs.writeFileSync(OUT_FILE, JSON.stringify({ meta: buildMeta(sites.length, NUM_RUNS), results }, null, 2));
          console.log(`   ✓ Saved`);
        } catch (e) {
          console.error(`   ✗ Fatal error for ${site.url}: ${e.message}`);
          results.push({ name: site.name, url: site.url, error: e.message });
        }
      }

      // Final write with analysis summary
      const output = {
        meta:     buildMeta(sites.length, NUM_RUNS),
        summary:  buildSummary(results),
        results,
      };

      fs.writeFileSync(OUT_FILE, JSON.stringify(output, null, 2));
      console.log(`\n✅ Done → ${OUT_FILE}`);
      printSummaryTable(results);
    }

    function buildMeta(siteCount, runs) {
      return {
        generated_at:   new Date().toISOString(),
        tool_versions:  { lighthouse: "12.x", playwright: "1.x" },
        methodology:    "mobile-simulated",
        runs_per_site:  runs,
        outlier_method: "IQR",
        sites_audited:  siteCount,
      };
    }

    function buildSummary(results) {
      const valid = results.filter((r) => r.lighthouse);
      if (!valid.length) return {};

      const ranked = [...valid].sort(
        (a, b) => (b.lighthouse.performanceScore ?? 0) - (a.lighthouse.performanceScore ?? 0)
      );

      const byIndustry = {};
      for (const r of valid) {
        const ind = r.industry || "unknown";
        if (!byIndustry[ind]) byIndustry[ind] = [];
        byIndustry[ind].push(r.lighthouse.performanceScore ?? 0);
      }

      return {
        fastest_site:  ranked[0]?.name,
        slowest_site:  ranked.at(-1)?.name,
        ranking: ranked.map((r, i) => ({
          rank: i + 1,
          name: r.name,
          score: r.lighthouse.performanceScore,
          lcp:   r.lighthouse.lcp,
          totalSizeKB: r.network?.totalSizeKB,
        })),
        industry_avg_score: Object.fromEntries(
          Object.entries(byIndustry).map(([k, scores]) => [k, round(mean(scores), 0)])
        ),
      };
    }

    function printSummaryTable(results) {
      const valid = results.filter((r) => r.lighthouse);
      if (!valid.length) return;

      console.log("\n┌─────────────────────────────────────────────────────────────────┐");
      console.log("│                     PERFORMANCE SUMMARY                        │");
      console.log("├──────────────────────────┬───────┬──────────┬──────────────────┤");
      console.log("│ Site                     │ Score │ LCP (s)  │ Page Size (KB)   │");
      console.log("├──────────────────────────┼───────┼──────────┼──────────────────┤");

      const ranked = [...valid].sort(
        (a, b) => (b.lighthouse.performanceScore ?? 0) - (a.lighthouse.performanceScore ?? 0)
      );

      for (const r of ranked) {
        const name    = r.name.padEnd(24).slice(0, 24);
        const score   = String(r.lighthouse.performanceScore ?? "-").padStart(5);
        const lcp     = String(r.lighthouse.lcp ?? "-").padStart(8);
        const size    = String(r.network?.totalSizeKB ?? "-").padStart(16);
        console.log(`│ ${name} │ ${score} │ ${lcp} │ ${size} │`);
      }

      console.log("└──────────────────────────┴───────┴──────────┴──────────────────┘\n");
    }

    main().catch((e) => {
      console.error("Fatal:", e);
      process.exit(1);
    });
