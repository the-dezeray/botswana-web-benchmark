"use client";

import { useState, useEffect, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  CartesianGrid,
  LabelList,
} from "recharts";

interface RankingItem {
  rank: number;
  name: string;
  score: number;
  lcp: number;
  totalSizeKB: number;
  industry?: string;
}

interface ResultsData {
  summary?: {
    ranking?: RankingItem[];
  };
  results?: Array<{
    name: string;
    industry: string;
  }>;
}

const COLOR_PALETTE = [
  "#0A2ADB", "#2563EB", "#3B82F6", "#0284C7", "#06B6D4", 
  "#0D9488", "#10B981", "#059669", "#16A34A", "#65A30D", 
  "#84CC16", "#CA8A04", "#D97706", "#F97316", "#EA580C", 
  "#DC2626", "#E11D48", "#BE185D", "#DB2777", "#D946EF", 
  "#C084FC", "#9333EA", "#7C3AED", "#6366F1", "#4F46E5"
];

export default function PerformanceChart() {
  const [data, setData] = useState<RankingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shorthand, setShorthand] = useState<Record<string, string>>({});

  // Layout mode: "horizontal" (X-axis sites, vertical columns) vs "vertical" (Y-axis sites, horizontal rows)
  const [orientation, setOrientation] = useState<"horizontal" | "vertical">("horizontal");
  // Filtering limit
  const [filterLimit, setFilterLimit] = useState<number | "all">("all");
  // Show score labels on bars
  const [showValues, setShowValues] = useState(true);
  // Diagonal hatch texture mode
  const [useTexture, setUseTexture] = useState(true);

  // Container width mode: "full" (96vw) | "standard" (7xl) | "ultra" (2000px scrollable)
  const [widthMode, setWidthMode] = useState<"full" | "standard" | "ultra">("full");

  useEffect(() => {
    async function fetchData() {
      try {
        const [res, shorthandRes] = await Promise.all([
          fetch("/results_quick.json"),
          fetch("/shorthand.json")
        ]);
        
        if (!res.ok) throw new Error(`Failed to load data: ${res.statusText}`);
        const json: ResultsData = await res.json();
        
        const shorthandMap = shorthandRes.ok ? await shorthandRes.json() : {};
        setShorthand(shorthandMap);
        
        const industryMap: Record<string, string> = {};
        if (json.results) {
          json.results.forEach((item) => {
            if (item.name && item.industry) {
              industryMap[item.name.toLowerCase()] = item.industry;
            }
          });
        }

        const rankings = (json.summary?.ranking || [])
          .filter((item) => item.score > 0)
          .sort((a, b) => b.score - a.score)
          .map((item) => ({
            ...item,
            name: shorthandMap[item.name] || item.name,
            industry: industryMap[item.name.toLowerCase()] || "General",
          }));

        setData(rankings);
      } catch (err) {
        console.error("Error fetching performance results:", err);
        setError("Could not load performance results data.");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const filteredData = useMemo(() => {
    if (filterLimit === "all") return data;
    return data.slice(0, filterLimit);
  }, [data, filterLimit]);

  const stats = useMemo(() => {
    if (!data.length) return { avg: "0", top: "N/A", topScore: 0, total: 0 };
    const sum = data.reduce((acc, curr) => acc + curr.score, 0);
    const avg = (sum / data.length).toFixed(1);
    const top = data[0]?.name || "N/A";
    const topScore = data[0]?.score || 0;
    return { avg, top, topScore, total: data.length };
  }, [data]);

  if (loading) {
    return (
      <div className="w-full py-12 text-center text-xs font-mono text-[#0A2ADB]/70">
        Loading Performance Audit Rankings...
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full py-12 text-center text-red-600 bg-red-50 rounded-xl border border-red-200 p-4 text-xs font-mono">
        {error}
      </div>
    );
  }

  const verticalChartHeight = Math.max(500, filteredData.length * 28 + 60);

  return (
    <section id="performance-chart" className="w-full bg-white text-slate-900 border-t border-[#0A2ADB]/10">
      <div className={`w-full mx-auto px-3 sm:px-6 py-12 space-y-6 transition-all duration-300 ${
        widthMode === "full" ? "max-w-[98vw]" : widthMode === "ultra" ? "max-w-[100vw]" : "max-w-7xl"
      }`}>
        
        {/* Header */}
        <div className="border-b border-[#0A2ADB]/15 pb-4 flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#0A2ADB]/10 text-[#0A2ADB] rounded-full text-xs font-mono font-medium mb-2">
              <span className="w-2 h-2 rounded-full bg-[#0A2ADB]"></span>
              RANKED AUDIT BENCHMARK
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0A2ADB]">
              Performance Score by Site
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl">
              Ranked performance overview across audited sites in Botswana (Lighthouse mobile simulation score 0–100).
            </p>
          </div>
        </div>

        {/* Data Chart */}
        <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-5 shadow-sm overflow-hidden">
          {orientation === "horizontal" ? (
            /* Horizontal X-Axis Layout (Vertical Columns) */
            <div className="w-full overflow-x-auto">
              <div className={`h-[520px] transition-all duration-300 ${
                widthMode === "ultra" ? "min-w-[2000px]" : "min-w-[100%]"
              }`}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={filteredData}
                    layout="horizontal"
                    margin={{ top: 25, right: 20, left: 10, bottom: 110 }}
                  >
                    <defs>
                      {COLOR_PALETTE.map((color, idx) => (
                        <pattern
                          key={`hatch-perf-${idx}`}
                          id={`hatch-perf-${idx}`}
                          width="8"
                          height="8"
                          patternTransform="rotate(45 0 0)"
                          patternUnits="userSpaceOnUse"
                        >
                          <rect width="8" height="8" fill={color} />
                          <line x1="0" y1="0" x2="0" y2="8" stroke="rgba(255, 255, 255, 0.4)" strokeWidth="2.5" />
                        </pattern>
                      ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis
                      dataKey="name"
                      stroke="#475569"
                      fontSize={9}
                      interval={0}
                      tick={({ x, y, payload }) => {
                        const labelText = payload.value.length > 20 ? payload.value.slice(0, 18) + "…" : payload.value;
                        return (
                          <g transform={`translate(${x},${y})`}>
                            <text
                              x={0}
                              y={0}
                              dy={12}
                              textAnchor="end"
                              fill="#475569"
                              fontSize={9}
                              transform="rotate(-50)"
                            >
                              {labelText}
                            </text>
                          </g>
                        );
                      }}
                    />
                    <YAxis
                      type="number"
                      domain={[0, 100]}
                      stroke="#64748B"
                      fontSize={11}
                      tickFormatter={(val) => `${val}`}
                      label={{ value: "Score (0–100)", angle: -90, position: "insideLeft", fontSize: 11, fill: "#64748B" }}
                    />
                    <Tooltip
                      cursor={{ fill: "rgba(10, 42, 219, 0.04)" }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const d: RankingItem = payload[0].payload;
                          const idx = filteredData.findIndex((item) => item.name === d.name);
                          const barColor = COLOR_PALETTE[idx % COLOR_PALETTE.length];

                          return (
                            <div className="bg-slate-900 text-white p-3 rounded-lg shadow-xl border border-slate-800 text-xs font-mono space-y-1 z-50 min-w-[200px]">
                              <div className="flex items-center gap-2 pb-1 border-b border-slate-700">
                                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: barColor }} />
                                <span className="font-bold text-white truncate max-w-[170px]">{d.name}</span>
                              </div>
                              <div className="flex justify-between text-slate-300">
                                <span>Rank:</span>
                                <span className="font-bold text-white">#{d.rank}</span>
                              </div>
                              <div className="flex justify-between text-slate-300">
                                <span>Score:</span>
                                <span className="font-bold text-emerald-400">{d.score} / 100</span>
                              </div>
                              <div className="flex justify-between text-slate-300">
                                <span>LCP:</span>
                                <span>{d.lcp ? `${d.lcp}s` : "N/A"}</span>
                              </div>
                              <div className="flex justify-between text-slate-300">
                                <span>Page Size:</span>
                                <span>{d.totalSizeKB ? `${(d.totalSizeKB / 1024).toFixed(1)} MB` : "N/A"}</span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar
                      dataKey="score"
                      radius={[4, 4, 0, 0]}
                    >
                      {showValues && (
                        <LabelList
                          dataKey="score"
                          position="top"
                          formatter={(val: any) => (typeof val === "number" ? Math.round(val) : val)}
                          style={{ fontSize: "10px", fontFamily: "monospace", fill: "#0A2ADB", fontWeight: "bold" }}
                        />
                      )}
                      {filteredData.map((entry, idx) => {
                        const colorIdx = idx % COLOR_PALETTE.length;
                        const fillValue = useTexture ? `url(#hatch-perf-${colorIdx})` : COLOR_PALETTE[colorIdx];
                        return (
                          <Cell key={`cell-h-${entry.name}-${idx}`} fill={fillValue} />
                        );
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            /* Vertical Y-Axis Layout (Horizontal Rows) */
            <div style={{ height: `${verticalChartHeight}px` }} className="w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={filteredData}
                  layout="vertical"
                  margin={{ top: 10, right: 30, left: 140, bottom: 20 }}
                >
                  <defs>
                    {COLOR_PALETTE.map((color, idx) => (
                      <pattern
                        key={`hatch-perf-v-${idx}`}
                        id={`hatch-perf-v-${idx}`}
                        width="8"
                        height="8"
                        patternTransform="rotate(45 0 0)"
                        patternUnits="userSpaceOnUse"
                      >
                        <rect width="8" height="8" fill={color} />
                        <line x1="0" y1="0" x2="0" y2="8" stroke="rgba(255, 255, 255, 0.4)" strokeWidth="2.5" />
                      </pattern>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    stroke="#64748B"
                    fontSize={11}
                    tickFormatter={(val) => `${val}`}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    stroke="#334155"
                    fontSize={11}
                    width={135}
                    tickLine={false}
                    tick={({ x, y, payload }) => {
                      const item = filteredData.find((d) => d.name === payload.value);
                      return (
                        <g transform={`translate(${x},${y})`}>
                          <text
                            x={-6}
                            y={4}
                            textAnchor="end"
                            fill="#1E293B"
                            className="font-sans text-[11px] font-medium"
                          >
                            {item ? `#${item.rank} ` : ""}{payload.value.length > 20 ? payload.value.slice(0, 18) + "…" : payload.value}
                          </text>
                        </g>
                      );
                    }}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(10, 42, 219, 0.04)" }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d: RankingItem = payload[0].payload;
                        const idx = filteredData.findIndex((item) => item.name === d.name);
                        const barColor = COLOR_PALETTE[idx % COLOR_PALETTE.length];

                        return (
                          <div className="bg-slate-900 text-white p-3 rounded-lg shadow-xl border border-slate-800 text-xs font-mono space-y-1 z-50 min-w-[200px]">
                            <div className="flex items-center gap-2 pb-1 border-b border-slate-700">
                              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: barColor }} />
                              <span className="font-bold text-white truncate max-w-[170px]">{d.name}</span>
                            </div>
                            <div className="flex justify-between text-[#E2E8F0]">
                              <span>Rank:</span>
                              <span className="font-bold text-white">#{d.rank}</span>
                            </div>
                            <div className="flex justify-between text-[#E2E8F0]">
                              <span>Score:</span>
                              <span className="font-bold text-emerald-400">{d.score} / 100</span>
                            </div>
                            <div className="flex justify-between text-[#E2E8F0]">
                              <span>LCP:</span>
                              <span>{d.lcp ? `${d.lcp}s` : "N/A"}</span>
                            </div>
                            <div className="flex justify-between text-[#E2E8F0]">
                              <span>Page Size:</span>
                              <span>{d.totalSizeKB ? `${(d.totalSizeKB / 1024).toFixed(1)} MB` : "N/A"}</span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar
                    dataKey="score"
                    radius={[0, 4, 4, 0]}
                    barSize={18}
                  >
                    {showValues && (
                      <LabelList
                        dataKey="score"
                        position="right"
                        formatter={(val: any) => (typeof val === "number" ? Math.round(val) : val)}
                        style={{ fontSize: "10px", fontFamily: "monospace", fill: "#0A2ADB", fontWeight: "bold" }}
                      />
                    )}
                    {filteredData.map((entry, idx) => {
                      const colorIdx = idx % COLOR_PALETTE.length;
                      const fillValue = useTexture ? `url(#hatch-perf-v-${colorIdx})` : COLOR_PALETTE[colorIdx];
                      return (
                        <Cell key={`cell-v-${entry.name}-${idx}`} fill={fillValue} />
                      );
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
