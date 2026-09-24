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
      <div className="w-full py-12 text-center text-xs font-mono /70">
        Loading Page Weight Correlation Analysis...
      </div>
    );
  }

  return (
    <section id="page-weight-correlation" className="w-full bg-[#f7f2e7] text-[#1c1917] border-t border-[#e5dcc8]">
      <div className="w-full max-w-[98vw] mx-auto px-3 sm:px-6 py-12 space-y-6">
        
        {/* Section Header */}
        <div className="border-b border-[#0A2ADB]/15 pb-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#0A2ADB]/10  rounded-full text-xs font-mono font-medium mb-2">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            CORRELATION MATRIX
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight ">
            Page Weight Correlation Analysis
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 mt-1 max-w-2xl">
            Multi-dimensional relationship mapping between **Page Size (MB)**, **Performance Score (0–100)**, and **HTTP Request Volume** (represented by point size).
          </p>
        </div>

        {/* Scatter / Bubble Plot */}
        <div className="rounded-2xl p-4 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#e5dcc8] pb-3">
            <div>
              <h3 className="text-base font-bold text-[#1c1917] tracking-tight">
                Relationship between Page Size, Performance Score, and Request Volume
              </h3>
              <p className="text-xs text-stone-500 font-mono mt-0.5">
                X-Axis: Page Size (MB) • Y-Axis: Performance Score • Circle Radius: Total HTTP Requests
              </p>
            </div>
            
            {/* Metric Legend Badges */}
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="flex items-center gap-1.5 text-emerald-800 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Score ≥ 60
              </span>
              <span className="flex items-center gap-1.5 text-amber-800 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Score 30-59
              </span>
              <span className="flex items-center gap-1.5 text-rose-800 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Score &lt; 30
              </span>
            </div>
          </div>

          <div className="h-[440px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 30, bottom: 25, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E7E0CF" />
                <XAxis
                  type="number"
                  dataKey="sizeMB"
                  name="Page Size"
                  unit=" MB"
                  stroke="#78716c"
                  fontSize={11}
                  label={{ value: "Page Size (MB)", position: "bottom", offset: 5, fontSize: 11, fill: "#57534e" }}
                />
                <YAxis
                  type="number"
                  dataKey="score"
                  name="Performance Score"
                  domain={[0, 100]}
                  stroke="#78716c"
                  fontSize={11}
                  label={{ value: "Performance Score (0-100)", angle: -90, position: "insideLeft", fontSize: 11, fill: "#57534e" }}
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
                        <div className="bg-[#fffef9] text-stone-800 p-3.5 rounded-xl shadow-xl border border-[#e5dcc8] text-xs font-mono space-y-1.5">
                          <div className="font-bold text-stone-900 text-sm pb-1 border-b border-stone-200">{d.name}</div>
                          <div className="flex justify-between gap-4">
                            <span>Performance Score:</span>
                            <span className="font-bold text-emerald-700">{d.score} / 100</span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span>Page Size:</span>
                            <span className="font-bold text-purple-800">{d.sizeMB} MB</span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span>HTTP Requests:</span>
                            <span className="font-bold text-sky-800">{d.requests} requests</span>
                          </div>
                          {d.industry && (
                            <div className="text-[10px] text-stone-500 pt-1 border-t border-stone-200 capitalize">
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
