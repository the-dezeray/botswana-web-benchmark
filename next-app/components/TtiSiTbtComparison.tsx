"use client";

import { useState, useEffect, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { getTtiSiTbtData, ResultsData } from "@/lib/data-utils";

interface TtiSiTbtItem {
  name: string;
  tti: number;
  si: number;
  tbt: number;
  score: number;
}

export default function TtiSiTbtComparison() {
  const [data, setData] = useState<TtiSiTbtItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [res, shorthandRes] = await Promise.all([
          fetch("/results_quick.json"),
          fetch("/shorthand.json")
        ]);
        if (!res.ok) return;
        const json: ResultsData = await res.json();
        const shorthandMap = shorthandRes.ok ? await shorthandRes.json() : {};
        const processed = getTtiSiTbtData(json, shorthandMap);
        setData(processed);
      } catch (err) {
        console.error("Error loading TTI/SI/TBT data:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const tbtSortedData = useMemo(() => {
    return [...data].sort((a, b) => b.tbt - a.tbt);
  }, [data]);

  if (loading) {
    return (
      <div className="w-full py-12 text-center text-xs font-mono /70">
        Loading TTI, Speed Index &amp; TBT Comparison...
      </div>
    );
  }

  // Shared angled X-axis label renderer (no rank, small text)
  const renderXTick = ({ x, y, payload }: { x: string | number; y: string | number; payload: { value: string } }) => {
    const label = payload.value.length > 20 ? payload.value.slice(0, 18) + "…" : payload.value;
    return (
      <g transform={`translate(${x},${y})`}>
        <text
          x={0}
          y={0}
          dy={12}
          textAnchor="end"
          fill="#57534e"
          fontSize={9}
          transform="rotate(-50)"
        >
          {label}
        </text>
      </g>
    );
  };

  return (
    <section id="tti-si-tbt" className="w-full bg-[#f7f2e7] text-[#1c1917] border-t border-[#e5dcc8]">
      <div className="w-full max-w-[98vw] mx-auto px-3 sm:px-6 py-12 space-y-6">

        {/* Section Header */}
        <div className="border-b border-[#0A2ADB]/15 pb-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#0A2ADB]/10  rounded-full text-xs font-mono font-medium mb-2">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            INTERACTIVITY &amp; SPEED TIMINGS
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight ">
            TTI / SI / TBT Comparison
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 mt-1 max-w-2xl">
            Split graphs to isolate high-magnitude Total Blocking Time (TBT in milliseconds) from Time to Interactive (TTI) and Speed Index (SI in seconds) to avoid visual scale distortion.
          </p>
        </div>

        {/* Chart 1: TTI & SI (Seconds) — Stacked / Grouped Layout matching Requests & 3rd Party Ratio */}
        <div className="rounded-2xl p-4 sm:p-6 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-[#1c1917] tracking-tight">
                1. Time to Interactive (TTI) &amp; Speed Index (SI)
              </h3>
              <p className="text-xs text-stone-500 font-mono mt-0.5">
                TTI measures when a page becomes fully interactive; SI measures how quickly content is visually displayed. (Lower = Faster)
              </p>
            </div>
            <span className="shrink-0 px-2.5 py-1 bg-stone-900/5 text-stone-700 font-mono text-[10px] rounded-full border border-[#e5dcc8] font-semibold">
              Scale: Seconds (s)
            </span>
          </div>

          <div className="w-full overflow-x-auto">
            <div className="h-[420px] min-w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data}
                  layout="horizontal"
                  margin={{ top: 10, right: 20, left: 10, bottom: 95 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E7E0CF" />
                  <XAxis
                    dataKey="name"
                    stroke="#78716c"
                    fontSize={11}
                    interval={0}
                    tick={renderXTick}
                    tickLine={false}
                  />
                  <YAxis
                    type="number"
                    stroke="#78716c"
                    fontSize={11}
                    unit="s"
                    width={45}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(10, 42, 219, 0.04)" }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d: TtiSiTbtItem = payload[0].payload;
                        return (
                          <div className="bg-[#fffef9] text-stone-800 p-3 rounded-lg shadow-xl border border-[#e5dcc8] text-xs font-mono space-y-1 min-w-[180px]">
                            <div className="font-bold text-stone-900 pb-1 border-b border-stone-200 truncate">{d.name}</div>
                            <div className="flex justify-between gap-4 text-stone-600">
                              <span className="text-indigo-700">TTI (Interactive):</span>
                              <span className="font-bold text-stone-900">{d.tti} s</span>
                            </div>
                            <div className="flex justify-between gap-4 text-stone-600">
                              <span className="text-cyan-700">Speed Index (SI):</span>
                              <span className="font-bold text-stone-900">{d.si} s</span>
                            </div>
                            <div className="flex justify-between gap-4 text-stone-600 pt-1 border-t border-stone-200">
                              <span>Combined Time:</span>
                              <span className="font-bold text-emerald-700">{(d.tti + d.si).toFixed(2)} s</span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    wrapperStyle={{ paddingBottom: "10px", fontSize: "11px", fontFamily: "monospace" }}
                  />
                  <Bar dataKey="tti" name="TTI (Interactive)" fill="#6366F1" barSize={11} stackId="a" />
                  <Bar dataKey="si" name="Speed Index (SI)" fill="#06B6D4" barSize={11} stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Chart 2: TBT (Milliseconds) — Ranked by TBT, Reverse Diagonal Hatch & Grown Logarithmic Y-Axis */}
        <div className="rounded-2xl p-4 sm:p-6 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-[#1c1917] tracking-tight">
                2. Total Blocking Time (TBT) — Ranked
              </h3>
              <p className="text-xs text-stone-500 font-mono mt-0.5">
                Ranked breakdown of total main thread blocking time (ms) between FCP and TTI. (Lower = Better)
              </p>
            </div>
            <span className="shrink-0 px-2.5 py-1 bg-rose-500/10 text-rose-800 font-mono text-[10px] rounded-full border border-rose-500/25 font-semibold">
              Scale: Logarithmic Milliseconds (ms)
            </span>
          </div>

          <div className="w-full overflow-x-auto">
            <div className="h-[520px] min-w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={tbtSortedData}
                  layout="horizontal"
                  margin={{ top: 25, right: 20, left: 10, bottom: 100 }}
                >
                  <defs>
                    <pattern
                      id="reverseDiagonalHatchTbt"
                      width="8"
                      height="8"
                      patternTransform="rotate(-45 0 0)"
                      patternUnits="userSpaceOnUse"
                    >
                      <rect width="8" height="8" fill="#E11D48" />
                      <line x1="0" y1="0" x2="0" y2="8" stroke="rgba(255, 255, 255, 0.45)" strokeWidth="2.5" />
                    </pattern>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E7E0CF" />
                  <XAxis
                    dataKey="name"
                    stroke="#78716c"
                    fontSize={11}
                    interval={0}
                    tick={renderXTick}
                    tickLine={false}
                  />
                  <YAxis
                    type="number"
                    scale="log"
                    domain={[10, 15000]}
                    ticks={[10, 100, 300, 600, 1000, 3000, 10000]}
                    allowDataOverflow={true}
                    stroke="#78716c"
                    fontSize={11}
                    unit="ms"
                    width={60}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(225, 29, 72, 0.04)" }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d: TtiSiTbtItem = payload[0].payload;
                        return (
                          <div className="bg-[#fffef9] text-stone-800 p-3 rounded-lg shadow-xl border border-[#e5dcc8] text-xs font-mono space-y-1 min-w-[180px]">
                            <div className="font-bold text-stone-900 pb-1 border-b border-stone-200 truncate">{d.name}</div>
                            <div className="flex justify-between gap-4 text-stone-600">
                              <span className="text-rose-700">TBT:</span>
                              <span className="font-bold text-rose-700">{d.tbt} ms</span>
                            </div>
                            <div className="text-[10px] text-stone-500 pt-0.5">
                              {d.tbt < 200 ? "✓ Good (<200ms)" : d.tbt < 600 ? "⚠ Needs Improvement" : "✗ Poor (>600ms)"}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar
                    dataKey="tbt"
                    name="TBT (Total Blocking Time)"
                    fill="url(#reverseDiagonalHatchTbt)"
                    barSize={14}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
