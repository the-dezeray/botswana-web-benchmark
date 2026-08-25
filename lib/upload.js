const os = require("os");
const pkg = require("../package.json");
const { url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY } = require("../config");

function buildPayload(output) {
  const meta = output?.meta ?? {};
  return {
    meta: {
      cli_version: pkg.version,
      node_version: process.version,
      os: `${os.platform()} ${os.release()}`,
      lighthouse_version: meta.tool_versions?.lighthouse ?? null,
      runs_per_site: meta.runs_per_site ?? null,
      sites_audited: meta.sites_audited ?? null,
      duration_seconds: meta.duration_seconds ?? null,
    },
    results: (output?.results ?? []).map((r) => ({
      name: r.name ?? "unknown",
      url: r.url ?? "unknown",
      industry: r.industry ?? "unknown",
      score: r.lighthouse?.performanceScore ?? null,
      lcp: r.lighthouse?.lcp ?? null,
      cls: r.lighthouse?.cls ?? null,
      tbt: r.lighthouse?.tbt ?? null,
      fcp: r.lighthouse?.fcp ?? null,
      si: r.lighthouse?.si ?? null,
      tti: r.lighthouse?.tti ?? null,
      total_size_kb: r.network?.totalSizeKB ?? null,
      total_requests: r.network?.totalRequests != null ? Math.round(r.network.totalRequests) : null,
      third_party_ratio: r.network?.thirdPartyRatio ?? null,
      raw: r,
    })),
  };
}

async function uploadRun(output) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
      "Supabase is not configured — set SUPABASE_URL and SUPABASE_ANON_KEY (see config.js)"
    );
  }
  const payload = buildPayload(output);
  if (!payload.results.length) throw new Error("no results to share");

  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/submit_run`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ payload }),
    signal: AbortSignal.timeout(20000),
  });

  if (!res.ok) {
    const detail = (await res.text().catch(() => "")).slice(0, 200);
    throw new Error(`Supabase responded ${res.status}${detail ? `: ${detail}` : ""}`);
  }
  return res.json();
}

module.exports = { buildPayload, uploadRun };
