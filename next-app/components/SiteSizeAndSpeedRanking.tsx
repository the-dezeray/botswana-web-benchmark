'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface SiteData {
  name: string;
  totalSizeKB: number;
  lcp: number;
  score: number;
}

interface SiteSizeAndSpeedRankingProps {
  data: SiteData[];
}

export default function SiteSizeAndSpeedRanking({ data }: SiteSizeAndSpeedRankingProps) {
  // Filter out sites with zero data
  const validData = data.filter(site => site.totalSizeKB > 0 && site.lcp > 0);
  
  // Sort by size (descending) and take top 20
  const sortedBySize = [...validData]
    .sort((a, b) => b.totalSizeKB - a.totalSizeKB)
    .slice(0, 20)
    .map(site => ({
      name: site.name,
      sizeMB: Number((site.totalSizeKB / 1024).toFixed(2)),
    }));
  
  // Sort by speed (LCP ascending - lower is better) and take top 20
  const sortedBySpeed = [...validData]
    .sort((a, b) => a.lcp - b.lcp)
    .slice(0, 20)
    .map(site => ({
      name: site.name,
      lcp: Number(site.lcp.toFixed(2)),
    }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const isSize = payload[0].dataKey === 'sizeMB';
      return (
        <div className=" border border-slate-700/80 p-3 rounded-xl  backdrop-blur-md bg-[#1D1D1F]">
          <p className="text-white font-semibold text-xs mb-1 font-mono">{label}</p>
          <p className={`text-xs font-mono font-medium ${isSize ? 'text-rose-400' : 'text-sky-400'}`}>
            {payload[0].name}: <span className="font-bold text-white">{payload[0].value}</span>{isSize ? ' MB' : 's'}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8 font-sans">
      {/* Size Chart */}
      <div className="p-6 rounded-2xl  ">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-white tracking-tight">
              Top 20 Sites by Size (Largest First)
            </h3>
            <p className="text-xs text-slate-400 mt-1 font-mono">Total payload transferred in Megabytes</p>
          </div>
          <span className="px-3 py-1 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-mono font-medium rounded-full">
            Payload Weight
          </span>
        </div>
        <ResponsiveContainer width="100%" height={550}>
          <BarChart
            data={sortedBySize}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 140, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
            <XAxis
              type="number"
              stroke="#94a3b8"
              fontSize={11}
              fontFamily="monospace"
              tickLine={false}
              axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
              label={{ value: 'Size (MB)', position: 'insideBottom', offset: -10, fill: '#94a3b8', fontSize: 11 }}
            />
            <YAxis
              type="category"
              dataKey="name"
              stroke="#e2e8f0"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              width={130}
              tick={({ x, y, payload }) => (
                <g transform={`translate(${x},${y})`}>
                  <text x={-6} y={4} textAnchor="end" fill="#cbd5e1" fontSize={11} className="font-mono">
                    {payload.value.length > 18 ? payload.value.slice(0, 16) + "…" : payload.value}
                  </text>
                </g>
              )}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.03)' }} />
            <Bar dataKey="sizeMB" name="Total Size (MB)" fill="#f43f5e" radius={[0, 8, 8, 0]} barSize={16} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Speed Chart */}
      <div className="p-6 rounded-2xl  ">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-white tracking-tight">
              Top 20 Fastest Sites by LCP (Fastest First)
            </h3>
            <p className="text-xs text-slate-400 mt-1 font-mono">Largest Contentful Paint in seconds (Lower is better)</p>
          </div>
          <span className="px-3 py-1 bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-mono font-medium rounded-full">
            Loading Speed
          </span>
        </div>
        <ResponsiveContainer width="100%" height={550}>
          <BarChart
            data={sortedBySpeed}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 140, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
            <XAxis
              type="number"
              stroke="#94a3b8"
              fontSize={11}
              fontFamily="monospace"
              tickLine={false}
              axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
              label={{ value: 'LCP (seconds) - Lower is Better', position: 'insideBottom', offset: -10, fill: '#94a3b8', fontSize: 11 }}
            />
            <YAxis
              type="category"
              dataKey="name"
              stroke="#e2e8f0"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              width={130}
              tick={({ x, y, payload }) => (
                <g transform={`translate(${x},${y})`}>
                  <text x={-6} y={4} textAnchor="end" fill="#cbd5e1" fontSize={11} className="font-mono">
                    {payload.value.length > 18 ? payload.value.slice(0, 16) + "…" : payload.value}
                  </text>
                </g>
              )}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.03)' }} />
            <Bar dataKey="lcp" name="Speed - LCP (seconds)" fill="#38bdf8" radius={[0, 8, 8, 0]} barSize={16} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Summary Statistics */}
      <div className="p-6 rounded-2xl  ">
        <h3 className="text-xl font-bold text-white tracking-tight mb-6">Leaderboard Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className=" p-5 rounded-xl">
            <h4 className="text-sm font-semibold font-mono text-rose-400 mb-4 flex items-center justify-between">
              <span>SIZE RANKINGS (TOP 10 LARGEST)</span>
              <span className="text-[10px] text-slate-500 uppercase">PAYLOAD</span>
            </h4>
            <ul className="space-y-2.5 text-xs">
              {sortedBySize.slice(0, 10).map((site, index) => (
                <li key={index} className="flex justify-between items-center py-1 border-b border-slate-800/40 last:border-0">
                  <span className="truncate mr-2 font-medium text-slate-300">
                    <span className="font-mono text-slate-500 w-5 inline-block">{index + 1}.</span> {site.name}
                  </span>
                  <span className="font-mono font-bold text-rose-400 px-2 py-0.5 rounded border border-rose-500/20">{site.sizeMB} MB</span>
                </li>
              ))}
            </ul>
          </div>
          <div className=" p-5 rounded-xl">
            <h4 className="text-sm font-semibold font-mono text-emerald-400 mb-4 flex items-center justify-between">
              <span>SPEED RANKINGS (TOP 10 FASTEST)</span>
              <span className="text-[10px] text-slate-500 uppercase">LCP TIME</span>
            </h4>
            <ul className="space-y-2.5 text-xs">
              {sortedBySpeed.slice(0, 10).map((site, index) => (
                <li key={index} className="flex justify-between items-center py-1 border-b border-slate-800/40 last:border-0">
                  <span className="truncate mr-2 font-medium text-slate-300">
                    <span className="font-mono text-slate-500 w-5 inline-block">{index + 1}.</span> {site.name}
                  </span>
                  <span className="font-mono font-bold text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20">{site.lcp}s</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

