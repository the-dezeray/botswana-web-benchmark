"use client";

import { useState, useEffect } from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { getPageWeightCorrelationData, ResultsData } from "@/lib/data-utils";

interface PageWeightCorrelationItem {
  name: string;
  sizeMB: number;
  score: number;
  requests: number;
  industry: string;
  color: string;
}

export default function PageWeightCorrelation() {
  const [data, setData] = useState<PageWeightCorrelationItem[]>([]);
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
        const processed = getPageWeightCorrelationData(json, shorthandMap);
        setData(processed);
      } catch (err) {
        console.error("Error loading Page Weight Correlation data:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="w-full py-12 text-center text-xs font-mono text-[#0A2ADB]/70">
        Loading Page Weight Correlation Analysis...
      </div>
    );
  }

  return (
    <section id="page-weight-correlation" className="w-full bg-white text-slate-900 border-t border-[#0A2ADB]/10">
      <div className="w-full max-w-[98vw] mx-auto px-3 sm:px-6 py-12 space-y-6">
        
        {/* Section Header */}
        <div className="border-b border-[#0A2ADB]/15 pb-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#0A2ADB]/10 text-[#0A2ADB] rounded-full text-xs font-mono font-medium mb-2">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            CORRELATION MATRIX
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0A2ADB]">
            Page Weight Correlation Analysis
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl">
            Multi-dimensional relationship mapping between **Page Size (MB)**, **Performance Score (0–100)**, and **HTTP Request Volume** (represented by point size).
          </p>
        </div>

        {/* Scatter / Bubble Plot */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Relationship between Page Size, Performance Score, and Request Volume
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                X-Axis: Page Size (MB) • Y-Axis: Performance Score • Circle Radius: Total HTTP Requests
              </p>
            </div>
            
            {/* Metric Legend Badges */}
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="flex items-center gap-1.5 text-emerald-600 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Score ≥ 60
              </span>
              <span className="flex items-center gap-1.5 text-amber-600 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Score 30-59
              </span>
              <span className="flex items-center gap-1.5 text-rose-600 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Score &lt; 30
              </span>
            </div>
          </div>

          <div className="h-[440px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 30, bottom: 25, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis
                  type="number"
                  dataKey="sizeMB"
                  name="Page Size"
                  unit=" MB"
                  stroke="#64748B"
                  fontSize={11}
                  label={{ value: "Page Size (MB)", position: "bottom", offset: 5, fontSize: 11, fill: "#64748B" }}
                />
                <YAxis
                  type="number"
                  dataKey="score"
                  name="Performance Score"
                  domain={[0, 100]}
                  stroke="#64748B"
                  fontSize={11}
                  label={{ value: "Performance Score (0-100)", angle: -90, position: "insideLeft", fontSize: 11, fill: "#64748B" }}
                />
                <ZAxis
                  type="number"
                  dataKey="requests"
                  range={[50, 400]}
                  name="Request Volume"
                />
                <Tooltip
                  cursor={{ strokeDasharray: "3 3" }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d: PageWeightCorrelationItem = payload[0].payload;
                      return (
                        <div className="bg-slate-900 text-white p-3.5 rounded-xl shadow-xl border border-slate-800 text-xs font-mono space-y-1.5">
                          <div className="font-bold text-white text-sm pb-1 border-b border-slate-700">{d.name}</div>
                          <div className="flex justify-between gap-4">
                            <span>Performance Score:</span>
                            <span className="font-bold text-emerald-400">{d.score} / 100</span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span>Page Size:</span>
                            <span className="font-bold text-purple-300">{d.sizeMB} MB</span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span>HTTP Requests:</span>
                            <span className="font-bold text-sky-300">{d.requests} requests</span>
                          </div>
                          {d.industry && (
                            <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-800 capitalize">
                              Industry: {d.industry}
                            </div>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Scatter name="Audited Sites" data={data} fill="#0A2ADB" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </section>
  );
}
