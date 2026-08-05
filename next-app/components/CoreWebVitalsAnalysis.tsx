"use client";

import { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
  ScatterChart,
  Scatter,
  ZAxis,
} from "recharts";
import { getLcpFcpData, ResultsData } from "@/lib/data-utils";

interface LcpFcpItem {
  name: string;
  lcp: number;
  fcp: number;
  score: number;
}

export default function CoreWebVitalsAnalysis() {
  const [data, setData] = useState<LcpFcpItem[]>([]);
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
        const processed = getLcpFcpData(json, shorthandMap);
        setData(processed);
      } catch (err) {
        console.error("Error loading Core Web Vitals data:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="w-full py-12 text-center text-xs font-mono text-[#0A2ADB]/70">
        Loading Core Web Vitals Analysis...
      </div>
    );
  }

  const chartHeight = Math.max(500, data.length * 32 + 60);

  return (
    <section id="core-web-vitals" className="w-full bg-white text-slate-900 border-t border-[#0A2ADB]/10">
      <div className="w-full max-w-[98vw] mx-auto px-3 sm:px-6 py-12 space-y-8">
        
        {/* Section Header */}
        <div className="border-b border-[#0A2ADB]/15 pb-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#0A2ADB]/10 text-[#0A2ADB] rounded-full text-xs font-mono font-medium mb-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            CORE WEB VITALS METRICS
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0A2ADB]">
            Core Web Vitals Analysis
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl">
            Detailed breakdown of Largest Contentful Paint (LCP) & First Contentful Paint (FCP) timing metrics in seconds, alongside performance score correlation.
          </p>
        </div>

        {/* Chart 1: LCP & FCP (seconds) 2 Bars for each */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 shadow-sm space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              LCP & FCP Comparison (seconds)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Two bars for each audited site comparing Largest Contentful Paint vs First Contentful Paint (Lower seconds = Faster performance).
            </p>
          </div>

          <div style={{ height: `${chartHeight}px` }} className="w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                layout="vertical"
                margin={{ top: 10, right: 30, left: 140, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                <XAxis
                  type="number"
                  stroke="#64748B"
                  fontSize={11}
                  unit="s"
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke="#334155"
                  fontSize={11}
                  width={135}
                  tickLine={false}
                  tick={({ x, y, payload }) => (
                    <g transform={`translate(${x},${y})`}>
                      <text
                        x={-6}
                        y={4}
                        textAnchor="end"
                        fill="#1E293B"
                        className="font-sans text-[11px] font-medium"
                      >
                        {payload.value.length > 20 ? payload.value.slice(0, 18) + "…" : payload.value}
                      </text>
                    </g>
                  )}
                />
                <Tooltip
                  cursor={{ fill: "rgba(10, 42, 219, 0.04)" }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d: LcpFcpItem = payload[0].payload;
                      return (
                        <div className="bg-slate-900 text-white p-3 rounded-lg shadow-xl border border-slate-800 text-xs font-mono space-y-1 z-50 min-w-[190px]">
                          <div className="font-bold text-white pb-1 border-b border-slate-700">{d.name}</div>
                          <div className="flex justify-between text-slate-300">
                            <span className="text-[#3B82F6]">LCP:</span>
                            <span className="font-bold text-white">{d.lcp} s</span>
                          </div>
                          <div className="flex justify-between text-slate-300">
                            <span className="text-[#10B981]">FCP:</span>
                            <span className="font-bold text-white">{d.fcp} s</span>
                          </div>
                          <div className="flex justify-between text-slate-300 pt-1 border-t border-slate-800">
                            <span>Score:</span>
                            <span className="text-amber-400 font-bold">{d.score} / 100</span>
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
                  wrapperStyle={{ paddingBottom: "10px", fontSize: "12px", fontFamily: "monospace" }}
                />
                <Bar dataKey="lcp" name="LCP (Largest Contentful Paint)" fill="#3B82F6" radius={[0, 4, 4, 0]} barSize={10} />
                <Bar dataKey="fcp" name="FCP (First Contentful Paint)" fill="#10B981" radius={[0, 4, 4, 0]} barSize={10} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Performance vs LCP Correlation */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 shadow-sm space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Performance vs LCP Correlation
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Scatter plot displaying how LCP load time directly correlates with overall Lighthouse Performance Score.
            </p>
          </div>

          <div className="h-[380px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis
                  type="number"
                  dataKey="lcp"
                  name="LCP (seconds)"
                  unit="s"
                  stroke="#64748B"
                  fontSize={11}
                  label={{ value: "LCP (seconds)", position: "bottom", offset: 0, fontSize: 11, fill: "#64748B" }}
                />
                <YAxis
                  type="number"
                  dataKey="score"
                  name="Performance Score"
                  domain={[0, 100]}
                  stroke="#64748B"
                  fontSize={11}
                  label={{ value: "Score (0-100)", angle: -90, position: "insideLeft", fontSize: 11, fill: "#64748B" }}
                />
                <ZAxis range={[60, 60]} />
                <Tooltip
                  cursor={{ strokeDasharray: "3 3" }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d: LcpFcpItem = payload[0].payload;
                      return (
                        <div className="bg-slate-900 text-white p-3 rounded-lg shadow-xl border border-slate-800 text-xs font-mono space-y-1">
                          <div className="font-bold text-white pb-1 border-b border-slate-700">{d.name}</div>
                          <div>Performance Score: <span className="text-emerald-400 font-bold">{d.score} / 100</span></div>
                          <div>LCP Time: <span className="text-sky-400 font-bold">{d.lcp} s</span></div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Scatter name="Sites" data={data} fill="#0A2ADB" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </section>
  );
}
