"use client";

import { useState, useEffect, useMemo } from "react";
import { ResultsData, SiteDetail, getScoreColor } from "@/lib/data-utils";

function scoreTextClass(score: number): string {
  if (score >= 60) return "text-emerald-700";
  if (score >= 30) return "text-amber-700";
  return "text-rose-700";
}

function formatAuditDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default function SiteExplorer() {
  const [results, setResults] = useState<SiteDetail[]>([]);
  const [ranks, setRanks] = useState<Record<string, number>>({});
  const [shorthand, setShorthand] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selectedName, setSelectedName] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [res, shorthandRes] = await Promise.all([
          fetch("/results_quick.json"),
          fetch("/shorthand.json"),
        ]);
        if (!res.ok) return;
        const json: ResultsData = await res.json();
        const shorthandMap = shorthandRes.ok ? await shorthandRes.json() : {};
        setShorthand(shorthandMap);
        setResults(json.results ?? []);

        const rankMap: Record<string, number> = {};
        (json.summary?.ranking ?? []).forEach((item) => {
          rankMap[item.name] = item.rank;
        });
        setRanks(rankMap);

        // Default to the #1 ranked site
        const top = (json.summary?.ranking ?? []).find((r) => r.rank === 1);
        setSelectedName(top?.name ?? json.results?.[0]?.name ?? null);
      } catch (err) {
        console.error("Error loading site explorer data:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const displayName = (name: string) => shorthand[name] || name;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const sorted = [...results].sort(
      (a, b) => (ranks[a.name] ?? 999) - (ranks[b.name] ?? 999)
    );
    if (!q) return sorted;
    return sorted.filter(
      (site) =>
        site.name.toLowerCase().includes(q) ||
        displayName(site.name).toLowerCase().includes(q) ||
        site.industry.toLowerCase().includes(q)
    );
  }, [results, ranks, query, shorthand]);

  const selected: SiteDetail | null = useMemo(() => {
    if (!selectedName) return null;
    return results.find((site) => site.name === selectedName) ?? null;
  }, [results, selectedName]);

  if (loading) {
    return (
      <div className="w-full py-12 text-center text-xs font-mono text-stone-500">
        Loading Site Explorer...
      </div>
    );
  }

  const vitals: Array<{ label: string; value: string }> = selected
    ? [
        { label: "LCP", value: `${selected.lighthouse.lcp.toFixed(2)} s` },
        { label: "FCP", value: `${selected.lighthouse.fcp.toFixed(2)} s` },
        { label: "Speed Index", value: `${selected.lighthouse.si.toFixed(2)} s` },
        { label: "TTI", value: `${selected.lighthouse.tti.toFixed(2)} s` },
        { label: "TBT", value: `${Math.round(selected.lighthouse.tbt)} ms` },
        { label: "CLS", value: selected.lighthouse.cls.toFixed(3) },
      ]
    : [];

  const categories = selected
    ? Object.entries(selected.network.byCategory).sort((a, b) => b[1].sizeKB - a[1].sizeKB)
    : [];

  const firstParty = selected
    ? Math.max(0, selected.network.totalRequests - selected.network.thirdPartyRequests)
    : 0;

  return (
    <section id="site-explorer" className="w-full bg-[#f7f2e7] text-[#1c1917] border-t border-[#e5dcc8]">
      <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 py-12 space-y-6">
        {/* Section Header */}
        <div className="border-b border-[#0A2ADB]/15 pb-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#0A2ADB]/10 rounded-full text-xs font-mono font-medium mb-2">
            <span className="w-2 h-2 rounded-full bg-sky-500"></span>
            INDIVIDUAL SITE DETAIL
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Site Explorer
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 mt-1 max-w-2xl">
            Pick any audited site to see its full Lighthouse and network breakdown.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-8 lg:gap-12">
          {/* Site picker */}
          <div>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search sites or industries…"
              aria-label="Search sites"
              className="w-full mb-3 rounded-lg border border-[#e5dcc8] bg-transparent px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 outline-none focus:border-stone-400"
            />
            <ol className="max-h-[480px] overflow-y-auto pr-1">
              {filtered.map((site) => {
                const active = site.name === selectedName;
                return (
                  <li key={site.name} className="border-b border-[#e5dcc8] last:border-0">
                    <button
                      onClick={() => setSelectedName(site.name)}
                      className={`flex w-full items-baseline justify-between gap-3 py-1.5 text-left ${
                        active ? "font-semibold" : ""
                      }`}
                    >
                      <span className="flex min-w-0 items-baseline gap-2.5">
                        <span className="w-6 shrink-0 font-mono text-xs text-stone-400">
                          {ranks[site.name] ?? "–"}
                        </span>
                        <span
                          className={`truncate text-sm ${
                            active ? "text-stone-950" : "text-stone-700"
                          }`}
                        >
                          {displayName(site.name)}
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-1.5">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{
                            backgroundColor: getScoreColor(
                              site.lighthouse.performanceScore
                            ),
                          }}
                        />
                        <span className="font-mono text-xs text-stone-600">
                          {Math.round(site.lighthouse.performanceScore)}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
              {filtered.length === 0 && (
                <li className="py-6 text-center text-xs font-mono text-stone-500">
                  No sites match “{query}”.
                </li>
              )}
            </ol>
          </div>

          {/* Detail panel */}
          {selected ? (
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-[#e5dcc8] pb-4">
                <div className="min-w-0">
                  <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-stone-500">
                    Rank #{ranks[selected.name] ?? "–"} · {selected.industry} ·{" "}
                    {selected.network.totalSizeKB > 0
                      ? `${(selected.network.totalSizeKB / 1024).toFixed(1)} MB`
                      : "size n/a"}
                  </p>
                  <h3 className="mt-1 text-xl sm:text-2xl font-bold tracking-tight text-stone-900">
                    {selected.name}
                  </h3>
                  <a
                    href={selected.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-0.5 block truncate font-mono text-xs text-sky-800 hover:underline"
                  >
                    {selected.url}
                  </a>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-stone-500">
                    Performance
                  </p>
                  <p
                    className={`font-mono text-4xl font-bold ${scoreTextClass(
                      selected.lighthouse.performanceScore
                    )}`}
                  >
                    {Math.round(selected.lighthouse.performanceScore)}
                    <span className="text-base text-stone-400">/100</span>
                  </p>
                </div>
              </div>

              {/* Vitals */}
              <h4 className="mt-6 text-[11px] font-mono uppercase tracking-[0.2em] text-stone-500">
                Core Web Vitals &amp; timings
              </h4>
              <dl className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-x-8">
                {vitals.map((v) => (
                  <div
                    key={v.label}
                    className="flex items-baseline justify-between gap-3 py-1.5 border-b border-[#e5dcc8]"
                  >
                    <dt className="font-mono text-xs text-stone-500">{v.label}</dt>
                    <dd className="font-mono text-sm font-semibold text-stone-900">
                      {v.value}
                    </dd>
                  </div>
                ))}
              </dl>

              {/* Network */}
              <h4 className="mt-6 text-[11px] font-mono uppercase tracking-[0.2em] text-stone-500">
                Network
              </h4>
              <dl className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-x-8">
                <div className="flex items-baseline justify-between gap-3 py-1.5 border-b border-[#e5dcc8]">
                  <dt className="font-mono text-xs text-stone-500">Requests</dt>
                  <dd className="font-mono text-sm font-semibold text-stone-900">
                    {selected.network.totalRequests}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-3 py-1.5 border-b border-[#e5dcc8]">
                  <dt className="font-mono text-xs text-stone-500">1st / 3rd party</dt>
                  <dd className="font-mono text-sm font-semibold text-stone-900">
                    {firstParty} / {selected.network.thirdPartyRequests}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-3 py-1.5 border-b border-[#e5dcc8]">
                  <dt className="font-mono text-xs text-stone-500">3rd-party share</dt>
                  <dd className="font-mono text-sm font-semibold text-stone-900">
                    {Math.round(selected.network.thirdPartyRatio * 100)}%
                  </dd>
                </div>
              </dl>

              {/* Payload by category */}
              {categories.length > 0 && (
                <>
                  <h4 className="mt-6 text-[11px] font-mono uppercase tracking-[0.2em] text-stone-500">
                    Payload by resource type
                  </h4>
                  <ol className="mt-2">
                    {categories.map(([cat, info]) => (
                      <li
                        key={cat}
                        className="flex items-baseline justify-between gap-3 py-1.5 border-b border-[#e5dcc8] last:border-0"
                      >
                        <span className="font-mono text-xs text-stone-600 capitalize">
                          {cat} · {info.count} files
                        </span>
                        <span className="font-mono text-xs font-semibold text-stone-900">
                          {info.sizeKB >= 1024
                            ? `${(info.sizeKB / 1024).toFixed(1)} MB`
                            : `${Math.round(info.sizeKB)} KB`}
                        </span>
                      </li>
                    ))}
                  </ol>
                </>
              )}

              {/* Heaviest files */}
              {selected.largest_resources && selected.largest_resources.length > 0 && (
                <>
                  <h4 className="mt-6 text-[11px] font-mono uppercase tracking-[0.2em] text-stone-500">
                    Heaviest files
                  </h4>
                  <ol className="mt-2">
                    {selected.largest_resources.slice(0, 5).map((res, i) => (
                      <li
                        key={`${res.url}-${i}`}
                        className="flex items-baseline justify-between gap-3 py-1.5 border-b border-[#e5dcc8] last:border-0"
                      >
                        <span
                          className="truncate font-mono text-xs text-sky-800"
                          title={res.url}
                        >
                          {res.url}
                        </span>
                        <span className="shrink-0 font-mono text-xs font-semibold text-stone-900">
                          {res.sizeKB >= 1024
                            ? `${(res.sizeKB / 1024).toFixed(1)} MB`
                            : `${Math.round(res.sizeKB)} KB`}
                        </span>
                      </li>
                    ))}
                  </ol>
                </>
              )}

              <p className="mt-6 font-mono text-[11px] text-stone-400">
                Audited {formatAuditDate(selected.audited_at)} ·{" "}
                {selected.runs_completed} runs
              </p>
            </div>
          ) : (
            <div className="py-16 text-center text-xs font-mono text-stone-500">
              Select a site to see its detail.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
