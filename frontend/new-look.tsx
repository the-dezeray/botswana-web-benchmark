"use client";

import React from "react";
import {
  Search,
  LayoutDashboard,
  FileText,
  Database,
  BarChart2,
  Eye,
  Link,
  MessageSquare,
  TrendingUp,
  Share2,
  ThumbsUp,
  Award,
  Star,
  Calendar,
  Bell,
  Shield,
  Settings,
  MoreHorizontal,
  ChevronDown,
  ArrowUpRight,
  Hexagon
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

// --- MOCK DATA ---

const trendData = [
  { date: "June 4", professional: 0, community: 0, editorial: 0, industry: 0, video: 0 },
  { date: "June 5", professional: 0, community: 0, editorial: 0, industry: 0, video: 0 },
  { date: "June 6", professional: 0, community: 0, editorial: 0, industry: 0, video: 0 },
  { date: "June 7", professional: 0, community: 0, editorial: 0, industry: 0, video: 0 },
  { date: "June 8", professional: 5, community: 2, editorial: 1, industry: 0, video: 0 },
  { date: "June 9", professional: 55, community: 40, editorial: 25, industry: 15, video: 5 },
  { date: "June 10", professional: 73.1, community: 55.3, editorial: 41.0, industry: 31.1, video: 27.9 },
];

const pieData = [
  { name: "Professional Networks", value: 45, color: "#3b82f6" },
  { name: "Community Discussions", value: 25, color: "#10b981" },
  { name: "Editorial", value: 15, color: "#eab308" },
  { name: "Industry", value: 10, color: "#f43f5e" },
  { name: "Video Platforms", value: 5, color: "#d946ef" },
];

const topSources = [
  { id: 1, domain: "linkedin.com", class: "Professional Network", classColors: "bg-emerald-50 text-emerald-700", share: 72, score: 8.7, icon: "in" },
  { id: 2, domain: "youtube.com", class: "Video Platform", classColors: "bg-pink-50 text-pink-700", share: 58, score: 7.2, icon: "yt" },
  { id: 3, domain: "reddit.com", class: "Community", classColors: "bg-orange-50 text-orange-700", share: 44, score: 6.8, icon: "rd" },
  { id: 4, domain: "medium.com", class: "Editorial Publication", classColors: "bg-blue-50 text-blue-700", share: 31, score: 6.1, icon: "md" },
  { id: 5, domain: "github.com", class: "Technical Resources", classColors: "bg-orange-50 text-orange-700", share: 24, score: 5.9, icon: "gh" },
];

// --- COMPONENTS ---

const SidebarItem = ({ icon: Icon, label, active = false, badge = null }: any) => (
  <div
    className={`flex items-center justify-between px-3 py-2 my-1 rounded-md cursor-pointer text-sm font-medium transition-colors ${
      active ? "bg-orange-50 text-orange-900" : "text-gray-600 hover:bg-gray-100"
    }`}
  >
    <div className="flex items-center gap-3">
      <Icon size={18} className={active ? "text-orange-500" : "text-gray-400"} />
      {label}
    </div>
    {badge && <span className="bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded-full">{badge}</span>}
  </div>
);

const Sidebar = () => (
  <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
    {/* Logo Area */}
    <div className="p-4 flex items-center gap-2 border-b border-gray-100">
      <Hexagon className="text-black fill-black" size={24} />
      <div>
        <h1 className="text-sm font-bold leading-tight">AI Visibility Intelligence</h1>
        <p className="text-xs text-gray-500">Brand Discovery</p>
      </div>
      <ChevronDown size={14} className="ml-auto text-gray-400" />
    </div>

    {/* Navigation */}
    <div className="flex-1 px-3 py-4">
      <SidebarItem icon={LayoutDashboard} label="Dashboard" />
      <SidebarItem icon={Database} label="Sources" active />
      <SidebarItem icon={Eye} label="Visibility" />
      <SidebarItem icon={TrendingUp} label="Rankings" />
      <SidebarItem icon={Award} label="Impact Quality" />
      <SidebarItem icon={FileText} label="Reports" />
    </div>

    {/* User Profile */}
    <div className="p-4 border-t border-gray-200 mt-auto flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-emerald-800 rounded-md flex items-center justify-center text-white font-bold text-xs">
          CA
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900">Cansaas Agency</p>
          <p className="text-xs text-gray-500">cansaas.io@gmail.com</p>
        </div>
      </div>
      <ChevronDown size={16} className="text-gray-400" />
    </div>
  </aside>
);

const MetricCard = ({ title, value, change, icon: Icon, iconColor, isPositive }: any) => (
  <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-2">
    <div className="flex items-center gap-2 text-gray-500 text-sm font-medium">
      <div className={`p-1.5 rounded-md ${iconColor} bg-opacity-10`}>
        <Icon size={16} className={iconColor.split(' ')[0].replace('bg-', 'text-')} />
      </div>
      {title}
    </div>
    <div className="flex items-end gap-3 mt-1">
      <span className="text-2xl font-bold text-gray-900">{value}</span>
      <span className={`text-xs font-medium mb-1 ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
        {change} vs last 7 days
      </span>
    </div>
  </div>
);

// --- MAIN PAGE LAYOUT ---

export default function DashboardPage() {
  return (
    <div className="h-screen bg-[#f5f1e8] flex font-sans p-6">
      <div className="flex w-full rounded-2xl shadow-[0_8px_30px_rgb(37,99,235,0.12)] backdrop-blur-xl overflow-hidden border border-gray-100/50">
        <Sidebar />
        
        <main className="flex-1 overflow-y-auto snap-y snap-mandatory">
        {/* Page 1: Overview */}
        <section className="min-h-screen snap-start p-6 flex flex-col">
          {/* Header */}
          <header className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Sources</h1>
              <p className="text-sm text-gray-500">
                Explore where your brand is being references across AI search experiences.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button className="text-sm font-medium text-gray-600 hover:text-gray-900">Give feedback</button>
              <button className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors"><Bell size={18} /></button>
              <div className="flex items-center border border-gray-200 bg-white rounded-lg px-3 py-1.5 shadow-sm text-sm font-medium text-gray-700 cursor-pointer">
                <Calendar size={16} className="mr-2 text-gray-400" />
                1 June - 30 June 2026
                <ChevronDown size={14} className="ml-2 text-gray-400" />
              </div>
              <button className="p-2 border border-gray-200 bg-white rounded-lg text-gray-600 shadow-sm"><Shield size={18} /></button>
              <button className="p-2 border border-gray-200 bg-white rounded-lg text-gray-600 shadow-sm"><Settings size={18} /></button>
            </div>
          </header>

          {/* Top Metrics */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            <MetricCard title="References" value="3,378" change="+18.5%" icon={Database} iconColor="bg-purple-500" isPositive={true} />
            <MetricCard title="Sources" value="214" change="+24" icon={LayoutDashboard} iconColor="bg-blue-500" isPositive={true} />
            <MetricCard title="Trust Score" value="87/100" change="Strong" icon={Shield} iconColor="bg-emerald-500" isPositive={true} />
            <MetricCard title="Avg. Impact" value="1.6" change="+0.4" icon={BarChart2} iconColor="bg-orange-500" isPositive={true} />
          </div>

          {/* Scroll Indicator */}
          <div className="mt-auto flex flex-col items-center gap-2 pb-6 opacity-50">
            <p className="text-xs text-gray-500">Scroll for more</p>
            <ChevronDown size={20} className="text-gray-400 animate-bounce" />
          </div>
        </section>

        {/* Page 2: Analytics */}
        <section className="min-h-screen snap-start p-6 flex flex-col">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Analytics Overview</h2>
          
          {/* Charts Row */}
          <div className="grid grid-cols-3 gap-6 flex-1">
            {/* Line Chart */}
            <div className="col-span-2 bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="font-bold text-gray-900 flex items-center gap-2">Citation Influence Trends <span className="text-gray-400 text-xs border border-gray-200 rounded-full w-4 h-4 flex items-center justify-center">i</span></h3>
                  <p className="text-xs text-gray-500 mt-1">Monitor how frequently AI platforms rely on external sources over time.</p>
                </div>
                <button className="flex items-center gap-2 border border-gray-200 rounded-md px-3 py-1.5 text-sm font-medium">
                  <TrendingUp size={16} /> Line <ChevronDown size={14} />
                </button>
              </div>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} tickFormatter={(val) => `${val}%`} />
                    <Tooltip />
                    <Line type="monotone" dataKey="professional" stroke="#3b82f6" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="community" stroke="#10b981" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="editorial" stroke="#eab308" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="industry" stroke="#f43f5e" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="video" stroke="#d946ef" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              {/* Custom Legend */}
              <div className="flex justify-center gap-6 mt-4 text-xs font-medium text-gray-600">
                <span className="flex items-center gap-2"><div className="w-2 h-2 bg-blue-500 rounded-sm"></div> Professional Networks</span>
                <span className="flex items-center gap-2"><div className="w-2 h-2 bg-emerald-500 rounded-sm"></div> Community Discussions</span>
                <span className="flex items-center gap-2"><div className="w-2 h-2 bg-yellow-500 rounded-sm"></div> Editorial</span>
                <span className="flex items-center gap-2"><div className="w-2 h-2 bg-rose-500 rounded-sm"></div> Industry</span>
                <span className="flex items-center gap-2"><div className="w-2 h-2 bg-fuchsia-500 rounded-sm"></div> Video Platforms</span>
              </div>
            </div>

            {/* Doughnut Chart */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex flex-col">
              <div>
                <h3 className="font-bold text-gray-900 flex items-center gap-2">Reference Ecosystem Breakdown <span className="text-gray-400 text-xs border border-gray-200 rounded-full w-4 h-4 flex items-center justify-center">i</span></h3>
                <p className="text-xs text-gray-500 mt-1">Distribution source categories influencing AI answers.</p>
              </div>
              
              <div className="flex-1 flex flex-col justify-center relative mt-4">
                <div className="h-40 w-full relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Center Text */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-2xl font-bold text-gray-900">3,378</span>
                    <span className="text-xs text-gray-500">References</span>
                  </div>
                </div>

                {/* Legend Right Side Overlay (Mocked position) */}
                <div className="absolute right-0 top-1/2 -translate-y-1/2 flex flex-col gap-2 text-xs text-gray-600">
                  {pieData.map((item, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: item.color }}></div>
                        {item.name}
                      </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 bg-blue-50 rounded-lg p-3 flex items-start gap-3 border border-blue-100">
                <TrendingUp className="text-blue-500 mt-0.5" size={16} />
                <div>
                  <p className="text-sm font-semibold text-gray-900">Editorial and professional sources</p>
                  <p className="text-xs text-gray-600 mt-0.5">This is 6.3% higher than the last month.</p>
                </div>
                <ArrowUpRight className="ml-auto text-gray-400" size={16} />
              </div>
            </div>
          </div>

          {/* Scroll Indicator */}
          <div className="mt-auto flex flex-col items-center gap-2 pb-6 opacity-50">
            <p className="text-xs text-gray-500">Scroll for more</p>
            <ChevronDown size={20} className="text-gray-400 animate-bounce" />
          </div>
        </section>

        {/* Page 3: Top Sources */}
        <section className="min-h-screen snap-start p-6 flex flex-col">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Top Influence Sources</h2>
          
          {/* Table Section */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex-1 flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="font-bold text-gray-900 flex items-center gap-2">Top Influence Sources <span className="text-gray-400 text-xs border border-gray-200 rounded-full w-4 h-4 flex items-center justify-center">i</span></h3>
                <p className="text-xs text-gray-500 mt-1">Sources most frequently referenced by AI system when discussing your brand and industry.</p>
              </div>
            </div>

            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 border-b border-gray-200">
                <tr>
                  <th className="font-medium pb-3 w-12">#</th>
                  <th className="font-medium pb-3 w-1/4">Source</th>
                  <th className="font-medium pb-3 w-1/4">Classification</th>
                  <th className="font-medium pb-3 w-1/4">Visibility Share</th>
                  <th className="font-medium pb-3 w-24">Inf Score</th>
                  <th className="pb-3 w-12"></th>
                </tr>
              </thead>
              <tbody>
                {topSources.map((source) => (
                  <tr key={source.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                    <td className="py-4 text-gray-500">{source.id}</td>
                    <td className="py-4">
                      <div className="flex items-center gap-3 font-medium text-gray-900">
                        <div className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center text-[10px] font-bold text-gray-600 uppercase">
                          {source.icon}
                        </div>
                        {source.domain}
                      </div>
                    </td>
                    <td className="py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${source.classColors}`}>
                        {source.class}
                      </span>
                    </td>
                    <td className="py-4">
                      <div className="flex items-center gap-3 w-full max-w-[200px]">
                        <span className="font-medium text-gray-900 w-10">{source.share}%</span>
                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                          <div className="bg-emerald-400 h-1.5 rounded-full" style={{ width: `${source.share}%` }}></div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 font-medium text-gray-900">{source.score}</td>
                    <td className="py-4 text-right">
                      <button className="text-gray-400 hover:text-gray-600">
                        <MoreHorizontal size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
      </div>
    </div>
  );
}