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
import { getPageSizeAndRequestsData, ResultsData } from "@/lib/data-utils";

interface PageSizeAndRequestsItem {
  name: string;
  sizeMB: number;
  totalRequests: number;
  firstPartyRequests?: number;
  thirdPartyRequests: number;
  thirdPartyRatioPct: number;
  score: number;
}

export default function PageSizeAndRequests() {
  const [data, setData] = useState<PageSizeAndRequestsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [widthMode, setWidthMode] = useState<"full" | "standard" | "ultra">("full");

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
        const processed = getPageSizeAndRequestsData(json, shorthandMap);
        setData(processed);
      } catch (err) {
        console.error("Error loading page size data:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const requestsSortedData = useMemo(() => {
    return [...data].sort((a, b) => b.totalRequests - a.totalRequests);
  }, [data]);

  if (loading) {
    return (
      <div className="w-full py-12 text-center text-xs font-mono text-[#0A2ADB]/70">
        Loading Page Weight &amp; Network Data...
      </div>
    );
  }

  /** Custom X-axis tick: angled label matching the style of other charts */
  const CustomXTick = ({ x, y, payload }: { x?: number; y?: number; payload?: { value: string } }) => {
    const label = payload?.value ?? "";
    const display = label.length > 22 ? label.slice(0, 20) + "…" : label;
    return (
      <g transform={`translate(${x},${y})`}>
        <text
          x={0}
          y={0}
          dy={6}
          textAnchor="end"
          fill="#1E293B"
          fontSize={11}
          fontFamily="sans-serif"
          fontWeight={500}
          transform="rotate(-40)"
        >
          {display}
        </text>
      </g>
    );
  };

  return (
    <section id="page-size-requests" className="w-full bg-white text-slate-900 border-t border-[#0A2ADB]/10">
      <div className={`w-full mx-auto px-3 sm:px-6 py-12 space-y-6 transition-all duration-300 ${
        widthMode === "full" ? "max-w-[98vw]" : widthMode === "ultra" ? "max-w-[100vw]" : "max-w-7xl"
      }`}>

        {/* Section Header */}
        <div className="border-b border-[#0A2ADB]/15 pb-4 flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#0A2ADB]/10 text-[#0A2ADB] rounded-full text-xs font-mono font-medium mb-2">
              <span className="w-2 h-2 rounded-full bg-purple-600"></span>
              PAGE WEIGHT &amp; NETWORK ANALYSIS
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0A2ADB]">
              Page Weight &amp; Network Requests
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl">
              Side-by-side comparative analysis of total page payload size (MB) vs HTTP network request volume &amp; third-party ratio.
            </p>
          </div>

          {/* Width Mode Controls */}
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
            <div className="bg-slate-100 p-1 rounded-lg border border-slate-200 flex items-center">
              <span className="px-2 text-slate-400 text-[10px]">WIDTH:</span>
              <button
                onClick={() => setWidthMode("full")}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  widthMode === "full"
                    ? "bg-[#0A2ADB] text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Full Screen
              </button>
              <button
                onClick={() => setWidthMode("ultra")}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  widthMode === "ultra"
                    ? "bg-[#0A2ADB] text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Wide (2000px)
              </button>
              <button
                onClick={() => setWidthMode("standard")}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  widthMode === "standard"
                    ? "bg-[#0A2ADB] text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Boxed
              </button>
            </div>
          </div>
        </div>

        {/* 2 Graphs */}
        <div className="grid grid-cols-1 gap-6">

          {/* Graph 1: Page Size (MB) by Site */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-sm space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  1. Page Size (MB) by Site
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Total payload size transferred in Megabytes (converted from KB). Logarithmic scale applied so lower values (0.5MB–5MB) are clearly visible alongside outliers (~70MB).
                </p>
              </div>
              <span className="shrink-0 px-2 py-0.5 bg-purple-50 text-purple-700 font-mono text-[10px] rounded border border-purple-200 font-semibold">
                Scale: Logarithmic MB
              </span>
            </div>

            <div className="w-full overflow-x-auto">
              <div className={`h-[460px] transition-all duration-300 ${
                widthMode === "ultra" ? "min-w-[2000px]" : "min-w-full"
              }`}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data}
                    layout="horizontal"
                    margin={{ top: 25, right: 20, left: 10, bottom: 95 }}
                  >
                    <defs>
                      <pattern
                        id="diagonalHatchPageSize"
                        width="8"
                        height="8"
                        patternTransform="rotate(45 0 0)"
                        patternUnits="userSpaceOnUse"
                      >
                        <rect width="8" height="8" fill="#8B5CF6" />
                        <line x1="0" y1="0" x2="0" y2="8" stroke="rgba(255, 255, 255, 0.45)" strokeWidth="2.5" />
                      </pattern>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis
                      type="category"
                      dataKey="name"
                      stroke="#334155"
                      fontSize={11}
                      tick={<CustomXTick />}
                      interval={0}
                      tickLine={false}
                    />
                    <YAxis
                      type="number"
                      scale="log"
                      domain={[0.1, 100]}
                      ticks={[0.1, 0.5, 1, 2, 5, 10, 25, 50, 100]}
                      allowDataOverflow={true}
                      stroke="#64748B"
                      fontSize={11}
                      unit=" MB"
                      width={65}
                      tickLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: "rgba(139, 92, 246, 0.04)" }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const d: PageSizeAndRequestsItem = payload[0].payload;
                          return (
                            <div className="bg-slate-900 text-white p-3 rounded-lg shadow-xl border border-slate-800 text-xs font-mono space-y-1">
                              <div className="font-bold text-white pb-1 border-b border-slate-700">{d.name}</div>
                              <div className="flex justify-between gap-4 text-slate-300">
                                <span>Page Size:</span>
                                <span className="font-bold text-purple-300">{d.sizeMB} MB</span>
                              </div>
                              <div className="flex justify-between gap-4 text-slate-300">
                                <span>Score:</span>
                                <span className="font-bold text-emerald-400">{d.score} / 100</span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar
                      dataKey="sizeMB"
                      name="Page Size (MB)"
                      fill="url(#diagonalHatchPageSize)"
                      radius={[4, 4, 0, 0]}
                      barSize={18}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Graph 2: Requests & 3rd Party Ratio — Ranked Stacked Bar Chart */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-sm space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  2. Requests &amp; 3rd Party Ratio — Ranked Stacked Chart
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Ranked HTTP request volume broken down by First-Party vs Third-Party requests count &amp; ratio percentage.
                </p>
              </div>
              <span className="shrink-0 px-2 py-0.5 bg-sky-50 text-sky-700 font-mono text-[10px] rounded border border-sky-200 font-semibold">
                Ranked Stacked
              </span>
            </div>

            <div className="w-full overflow-x-auto">
              <div className={`h-[440px] transition-all duration-300 ${
                widthMode === "ultra" ? "min-w-[2000px]" : "min-w-full"
              }`}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={requestsSortedData}
                    layout="horizontal"
                    margin={{ top: 10, right: 20, left: 10, bottom: 95 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis
                      type="category"
                      dataKey="name"
                      stroke="#334155"
                      fontSize={11}
                      tick={<CustomXTick />}
                      interval={0}
                      tickLine={false}
                    />
                    <YAxis
                      type="number"
                      stroke="#64748B"
                      fontSize={11}
                      width={50}
                      tickLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: "rgba(10, 42, 219, 0.04)" }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const d: PageSizeAndRequestsItem = payload[0].payload;
                          const firstParty = d.firstPartyRequests ?? Math.max(0, d.totalRequests - d.thirdPartyRequests);
                          return (
                            <div className="bg-slate-900 text-white p-3 rounded-lg shadow-xl border border-slate-800 text-xs font-mono space-y-1 min-w-[210px]">
                              <div className="font-bold text-white pb-1 border-b border-slate-700">{d.name}</div>
                              <div className="flex justify-between gap-4 text-slate-300">
                                <span className="text-sky-400">1st Party Requests:</span>
                                <span className="font-bold text-white">{firstParty}</span>
                              </div>
                              <div className="flex justify-between gap-4 text-slate-300">
                                <span className="text-amber-400">3rd Party Requests:</span>
                                <span className="font-bold text-white">{d.thirdPartyRequests}</span>
                              </div>
                              <div className="flex justify-between gap-4 text-slate-300 pt-1 border-t border-slate-800">
                                <span className="font-bold text-white">Total Requests:</span>
                                <span className="font-bold text-sky-300">{d.totalRequests}</span>
                              </div>
                              <div className="flex justify-between gap-4 text-slate-300">
                                <span>3rd Party Ratio:</span>
                                <span className="font-bold text-rose-400">{d.thirdPartyRatioPct}%</span>
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
                    <Bar
                      dataKey="firstPartyRequests"
                      name="1st Party Requests"
                      fill="#0284C7"
                      radius={[0, 0, 0, 0]}
                      barSize={12}
                      stackId="reqStack"
                    />
                    <Bar
                      dataKey="thirdPartyRequests"
                      name="3rd Party Requests"
                      fill="#F59E0B"
                      radius={[4, 4, 0, 0]}
                      barSize={12}
                      stackId="reqStack"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
