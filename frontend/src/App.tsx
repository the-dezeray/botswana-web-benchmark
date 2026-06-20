import { useEffect, useState, useMemo } from 'react'
import './App.css'
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, 
  PieChart, Pie, CartesianGrid, AreaChart, Area, LineChart,
  ScatterChart, Scatter, ZAxis, Legend, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, LabelList
} from 'recharts'
import { 
  TrendingUp, TrendingDown, Zap, Globe, Package, Clock, 
  BarChart3, Filter, Eye, Layers, Activity, AlertCircle
} from 'lucide-react'
import { Circles, Watch } from 'react-loader-spinner'
import { NextAuditTimer } from './NextAuditTimer'
import { AnimatedNumber } from './components/core/animated-number'
import { TextScramble } from './components/core/text-scramble'

interface LighthouseMetrics {
  performanceScore: number
  lcp: number
  cls: number
  tbt: number
  fcp: number
  si: number
  tti: number
}

interface NetworkMetrics {
  totalSizeKB: number
  totalRequests: number
  thirdPartyRequests: number
  thirdPartyRatio: number
  byCategory: Record<string, { count: number; sizeKB: number }>
}

interface SiteResult {
  name: string
  url: string
  industry: string
  audited_at: string
  runs_completed: number
  lighthouse: LighthouseMetrics
  network: NetworkMetrics
  largest_resources: Array<{ url: string; category: string; sizeKB: number }>
}

interface ResultsData {
  meta: {
    generated_at: string
    tool_versions: Record<string, string>
    methodology: string
    runs_per_site: number
    outlier_method: string
    sites_audited: number
  }
  summary: {
    fastest_site: string
    slowest_site: string
    ranking: Array<{ rank: number; name: string; score: number; lcp: number; totalSizeKB: number }>
    industry_avg_score: Record<string, number>
  }
  results: SiteResult[]
}

// Color palette for consistent theming
const COLORS = {
  good: '#10b981',
  warning: '#f59e0b',
  poor: '#ef4444',
  neutral: '#94a3b8',
  blue: '#3b82f6',
  purple: '#8b5cf6',
  pink: '#ec4899',
  cyan: '#14b8a6',
  orange: '#f97316',
  gray: '#64748b'
}

// Industry colors
const INDUSTRY_COLORS: Record<string, string> = {
  banking: '#3b82f6',
  telecom: '#8b5cf6',
  utility: '#10b981',
  retail: '#f59e0b',
  media: '#ef4444',
  education: '#14b8a6',
  mining: '#4b5563',
  finance: '#0ea5e9',
  investment: '#6366f1',
  beverages: '#f43f5e',
  tourism: '#22c55e',
  'real-estate': '#d946ef',
  logistics: '#f97316',
  healthcare: '#f43f5e',
  government: '#64748b',
  technology: '#06b6d4'
}

function App() {
  const [data, setData] = useState<ResultsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedIndustry, setSelectedIndustry] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'overview' | 'detailed' | 'comparison'>('overview')

  useEffect(() => {
    fetch('/results_quick.json')
      .then(res => res.json())
      .then(jsonData => {
        setData(jsonData)
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  // Memoized data transformations
  const filteredResults = useMemo(() => {
    if (!data) return []
    if (selectedIndustry === 'all') return data.results
    return data.results.filter(site => site.industry === selectedIndustry)
  }, [data, selectedIndustry])

  const performanceData = useMemo(() => 
    filteredResults
      .map(site => ({
        name: site.name.replace('First National Bank BW', 'FNB BW')
          .replace('Botswana Power Corporation', 'BPC')
          .replace('Standard Chartered BW', 'StanChart BW')
          .replace('University of Botswana', 'UB'),
        score: site.lighthouse.performanceScore,
        lcp: site.lighthouse.lcp,
        tbt: site.lighthouse.tbt,
        fcp: site.lighthouse.fcp,
        si: site.lighthouse.si,
        tti: site.lighthouse.tti,
        cls: site.lighthouse.cls,
        sizeMB: site.network.totalSizeKB / 1024,
        industry: site.industry,
        requests: site.network.totalRequests,
        thirdPartyRatio: site.network.thirdPartyRatio * 100
      }))
      .sort((a, b) => b.score - a.score),
    [filteredResults]
  )

  const industryData = useMemo(() => 
    Object.entries(data?.summary.industry_avg_score || {}).map(([industry, score]) => ({
      industry: industry.charAt(0).toUpperCase() + industry.slice(1),
      score,
      color: INDUSTRY_COLORS[industry] || COLORS.gray
    })).sort((a, b) => b.score - a.score),
    [data]
  )

  const correlationData = useMemo(() =>
    filteredResults.map(site => ({
      name: site.name.replace('First National Bank BW', 'FNB BW')
        .replace('Botswana Power Corporation', 'BPC')
        .replace('Standard Chartered BW', 'StanChart BW')
        .replace('University of Botswana', 'UB'),
      score: site.lighthouse.performanceScore,
      lcp: site.lighthouse.lcp,
      size: site.network.totalSizeKB / 1024,
      requests: site.network.totalRequests,
      industry: site.industry
    })),
    [filteredResults]
  )

  const radarData = useMemo(() => {
    if (filteredResults.length === 0) return []
    
    const metrics = ['Performance', 'LCP', 'TBT', 'FCP', 'SI', 'TTI']
    const normalizedData = metrics.map(metric => {
      const dataPoint: any = { metric }
      
      filteredResults.forEach(site => {
        const shortName = site.name.substring(0, 3)
        switch(metric) {
          case 'Performance': dataPoint[shortName] = site.lighthouse.performanceScore; break
          case 'LCP': dataPoint[shortName] = Math.max(0, 100 - (site.lighthouse.lcp * 5)); break
          case 'TBT': dataPoint[shortName] = Math.max(0, 100 - (site.lighthouse.tbt / 10)); break
          case 'FCP': dataPoint[shortName] = Math.max(0, 100 - (site.lighthouse.fcp * 10)); break
          case 'SI': dataPoint[shortName] = Math.max(0, 100 - (site.lighthouse.si * 2)); break
          case 'TTI': dataPoint[shortName] = Math.max(0, 100 - (site.lighthouse.tti * 2)); break
        }
      })
      
      return dataPoint
    })
    
    return normalizedData
  }, [filteredResults])

  const resourceBreakdownData = useMemo(() => {
    const categories = ['js', 'css', 'image', 'font', 'other']
    return filteredResults.map(site => {
      const total = site.network.totalSizeKB
      const breakdown: any = { name: site.name.substring(0, 3) }
      
      categories.forEach(cat => {
        const catData = site.network.byCategory[cat]
        breakdown[cat] = catData ? (catData.sizeKB / total) * 100 : 0
      })
      
      return breakdown
    })
  }, [filteredResults])

  // Helper functions
  const getScoreColor = (score: number) => {
    if (score === 0) return COLORS.neutral
    if (score >= 50) return COLORS.good
    if (score >= 30) return COLORS.warning
    return COLORS.poor
  }

  const getScoreBadgeClass = (score: number) => {
    if (score === 0) return 'score-na'
    if (score >= 50) return 'score-good'
    if (score >= 30) return 'score-med'
    return 'score-poor'
  }

  const getLCPColor = (lcp: number) => {
    if (lcp > 20) return COLORS.poor
    if (lcp > 10) return COLORS.warning
    return COLORS.good
  }

  const getIndustryColor = (industry: string) => {
    return INDUSTRY_COLORS[industry] || COLORS.gray
  }

  if (loading) return (
    <div className="loading">
      <Circles 
        height="80" 
        width="80" 
        color="#3b82f6" 
        ariaLabel="circles-loading" 
        wrapperStyle={{}} 
        wrapperClass="" 
        visible={true} 
      />
      <p style={{ marginTop: '1rem', color: '#64748b' }}>Loading performance data...</p>
    </div>
  )
  if (error) return <div className="error">Error loading data: {error}</div>
  if (!data) return <div className="error">No data available</div>

  return (
    <div className="dash">
      {/* SVG Pattern Definitions */}
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          <pattern id="pattern-dots" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1" fill="rgba(0,0,0,0.15)" />
          </pattern>
          <pattern id="pattern-lines" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
            <path d="M0,8 l8,-8 M-2,2 l4,-4 M6,10 l4,-4" stroke="rgba(0,0,0,0.15)" strokeWidth="1" />
          </pattern>
          <pattern id="pattern-diagonal" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect x="0" y="0" width="5" height="10" fill="rgba(0,0,0,0.1)" />
          </pattern>
          <pattern id="pattern-cross" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M0,5 L10,5 M5,0 L5,10" stroke="rgba(0,0,0,0.12)" strokeWidth="1" />
          </pattern>
          <pattern id="pattern-grid" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
            <rect x="0" y="0" width="10" height="10" fill="none" stroke="rgba(0,0,0,0.1)" strokeWidth="0.5" />
          </pattern>
        </defs>
      </svg>
      
      <header className="dash-header">
        <div className="minimal-header">
          <div className="header-brand">
            <img src="/botswana-flag.png" alt="Botswana Flag" className="flag-icon" />
            <div className="brand-text">
              <h1 className="title">
                <TextScramble className="font-bold" duration={2000}>
                  Botswana Web Performance
                </TextScramble>
              </h1>
              <p className="tagline">
                <TextScramble duration={1500} speed={30}>
                  Real-time insights into local web performance
                </TextScramble>
              </p>
            
        <p className="subtitle">
          {new Date(data.meta.generated_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} · 
          {data.meta.methodology.replace('-', ' ')} · 
          {data.meta.runs_per_site} run{data.meta.runs_per_site > 1 ? 's' : ''} per site
        </p>
            </div>
            
          </div>
          <div className="header-stats-wrapper">
            <div className="header-stats">
              <div className="stat">
                <Globe className="stat-icon" size={20} />
                <div className="stat-content">
                  <span className="stat-value">
                    <AnimatedNumber 
                      value={data.meta.sites_audited} 
                      springOptions={{ bounce: 0, duration: 2000 }}
                    />
                  </span>
                  <span className="stat-label">Sites</span>
                </div>
              </div>
              <div className="stat">
                <Zap className="stat-icon" size={20} />
                <div className="stat-content">
                  <span className="stat-value">
                    <AnimatedNumber 
                      value={Math.round(Object.values(data.summary.industry_avg_score).reduce((a, b) => a + b, 0) / Object.keys(data.summary.industry_avg_score).length)}
                      springOptions={{ bounce: 0, duration: 2000 }}
                    />
                  </span>
                  <span className="stat-label">Avg Score</span>
                </div>
              </div>
              <div className="stat">
                <TrendingUp className="stat-icon" size={20} />
                <div className="stat-content">
                  <span className="stat-value">
                    <TextScramble duration={1800} speed={40}>
                      {data.summary.fastest_site.substring(0, 8)}...
                    </TextScramble>
                  </span>
                  <span className="stat-label">Fastest</span>
                </div>
              </div>
            </div>
            <NextAuditTimer />
          </div>
        </div>
       

        <div className="controls">
          <div className="filter-group">
            <Filter size={16} />
            <label>Industry:</label>
            <select 
              value={selectedIndustry} 
              onChange={(e) => setSelectedIndustry(e.target.value)}
              className="industry-select"
            >
              <option value="all">All Industries</option>
              {Object.keys(data.summary.industry_avg_score).map(industry => (
                <option key={industry} value={industry}>
                  {industry.charAt(0).toUpperCase() + industry.slice(1)}
                </option>
              ))}
            </select>
          </div>
          
          <div className="view-toggle">
            <button 
              className={viewMode === 'overview' ? 'active' : ''}
              onClick={() => setViewMode('overview')}
            >
              <Eye size={16} />
              Overview
            </button>
            <button 
              className={viewMode === 'detailed' ? 'active' : ''}
              onClick={() => setViewMode('detailed')}
            >
              <Layers size={16} />
              Detailed
            </button>
            <button 
              className={viewMode === 'comparison' ? 'active' : ''}
              onClick={() => setViewMode('comparison')}
            >
              <BarChart3 size={16} />
              Comparison
            </button>
          </div>
        </div>
      </header>

      {viewMode === 'overview' && (
        <>
          {/* Performance Overview */}
          <section className="chart-section">
            <div className="section-header">
              <h2 className="section-label">Performance Score by Site</h2>
            </div>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={performanceData} layout="vertical" margin={{ top: 10, right: 50, left:0 , bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.6} />
                  <XAxis 
                    type="number"
                    domain={[0, 100]}
                    ticks={[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                  />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    tick={{ fontSize: 11, fill: '#1e293b', fontWeight: 600 }} 
                    width={90}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      background: '#ffffff', 
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '12px',
                      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                    }}
                    formatter={(value: any) => [Math.round(value), 'Score']}
                  />
                  <Bar 
                    dataKey="score" 
                    name="Performance Score"
                    radius={[0, 8, 8, 0]}
                    barSize={18}
                    label={{ position: 'right', fill: '#1e293b', fontSize: 12, fontWeight: 600 }}
                  >
                    {performanceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getScoreColor(entry.score)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Industry Comparison */}
          <section className="chart-section">
            <div className="section-header">
              <h2 className="section-label">Industry Performance Comparison</h2>
            </div>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={industryData} layout="vertical" margin={{ top: 5, right: 50, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.6} />
                  <XAxis 
                    type="number"
                    domain={[0, 100]}
                    ticks={[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                  />
                  <YAxis 
                    type="category" 
                    dataKey="industry" 
                    tick={{ fontSize: 11, fill: '#1e293b', fontWeight: 600 }} 
                    width={100}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      background: '#ffffff', 
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '12px',
                      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                    }}
                    formatter={(value: any) => [Math.round(value), 'Avg Score']}
                  />
                  <Bar 
                    dataKey="score" 
                    radius={[0, 8, 8, 0]} 
                    barSize={18}
                    label={{ position: 'right', fill: '#1e293b', fontSize: 12, fontWeight: 600 }}
                  >
                    {industryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Core Web Vitals */}
          <section className="chart-section">
            <div className="section-header">
              <h2 className="section-label">Core Web Vitals Analysis</h2>
            </div>
            <div className="side-by-side">
              <div className="half">
                <div className="chart-container">
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '1rem', color: '#1e293b' }}>LCP & FCP (seconds)</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={performanceData} layout="vertical" margin={{ top: 10, right: 50, left: 0, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.6} />
                      <XAxis 
                        type="number"
                        domain={[0, 'dataMax + 5']}
                        tick={{ fontSize: 11, fill: '#64748b' }}
                      />
                      <YAxis 
                        type="category"
                        dataKey="name" 
                        tick={{ fontSize: 10, fill: '#1e293b', fontWeight: 600 }} 
                        width={90}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          background: '#ffffff', 
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '12px'
                        }}
                        formatter={(value: any, name) => {
                          if (name === 'LCP') return [Math.round(value * 10) / 10 + 's', 'LCP']
                          if (name === 'FCP') return [Math.round(value * 10) / 10 + 's', 'FCP']
                          return [value, name]
                        }}
                      />
                      <Bar 
                        dataKey="lcp" 
                        name="LCP"
                        fill="#10b981"
                        radius={[0, 8, 8, 0]}
                        barSize={12}
                        label={{ position: 'right', fill: '#10b981', fontSize: 10, fontWeight: 600, formatter: (value: any) => Math.round(value * 10) / 10 }}
                      />
                      <Bar 
                        dataKey="fcp" 
                        name="FCP"
                        fill="#3b82f6"
                        radius={[0, 8, 8, 0]}
                        barSize={12}
                        label={{ position: 'right', fill: '#3b82f6', fontSize: 10, fontWeight: 600, formatter: (value: any) => Math.round(value * 10) / 10 }}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
              <div className="half">
                <div className="chart-container">
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '1rem', color: '#1e293b' }}>Performance vs LCP Correlation</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <ScatterChart margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.6} />
                      <XAxis 
                        type="number" 
                        dataKey="score" 
                        name="Performance Score"
                        domain={[0, 100]}
                        tick={{ fontSize: 11, fill: '#64748b' }}
                      />
                      <YAxis 
                        type="number" 
                        dataKey="lcp" 
                        name="LCP (s)"
                        tick={{ fontSize: 11, fill: '#64748b' }}
                      />
                      <ZAxis type="number" dataKey="sizeMB" range={[50, 400]} name="Size (MB)" />
                      <Tooltip 
                        cursor={{ strokeDasharray: '3 3' }}
                        contentStyle={{ 
                          background: '#ffffff', 
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '12px',
                          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                        }}
                        formatter={(value: any, name) => {
                          if (name === 'score') return [Math.round(value), 'Score']
                          if (name === 'lcp') return [Math.round(value * 10) / 10 + 's', 'LCP']
                          if (name === 'sizeMB') return [Math.round(value * 10) / 10 + ' MB', 'Size']
                          return [value, name]
                        }}
                      />
                      <Scatter name="Sites" data={correlationData} fill="#3b82f6">
                        {correlationData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={getIndustryColor(entry.industry)} />
                        ))}
                        <LabelList dataKey="name" position="top" offset={12} style={{ fontSize: '11px', fill: '#0f172a', fontWeight: 700 }} />
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </section>

          {/* Size Metrics Bar Graph */}
          <section className="chart-section">
            <div className="section-header">
              <h2 className="section-label">Page Size Analysis</h2>
            </div>
            <div className="side-by-side">
              <div className="half">
                <div className="chart-container">
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '1rem', color: '#1e293b' }}>Page Size (MB)</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={performanceData} layout="vertical" margin={{ top: 10, right: 50, left: 0, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.6} />
                      <XAxis 
                        type="number"
                        domain={[0, 'dataMax + 2']}
                        tick={{ fontSize: 11, fill: '#64748b' }}
                      />
                      <YAxis 
                        type="category"
                        dataKey="name" 
                        tick={{ fontSize: 10, fill: '#1e293b', fontWeight: 600 }} 
                        width={90}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          background: '#ffffff', 
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '12px'
                        }}
                        formatter={(value: any) => [Math.round(value * 10) / 10 + ' MB', 'Size']}
                      />
                      <Bar 
                        dataKey="sizeMB" 
                        name="Page Size"
                        fill="#3b82f6"
                        radius={[0, 8, 8, 0]}
                        barSize={18}
                        label={{ position: 'right', fill: '#1e293b', fontSize: 10, fontWeight: 600, formatter: (value: any) => Math.round(value * 10) / 10 }}
                      >
                        {performanceData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={getIndustryColor(entry.industry)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
              <div className="half">
                <div className="chart-container">
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '1rem', color: '#1e293b' }}>Requests & 3rd Party Ratio</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={performanceData} layout="vertical" margin={{ top: 10, right: 50, left: 0, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.6} />
                      <XAxis 
                        type="number"
                        domain={[0, 'dataMax + 50']}
                        tick={{ fontSize: 11, fill: '#64748b' }}
                      />
                      <YAxis 
                        type="category"
                        dataKey="name" 
                        tick={{ fontSize: 10, fill: '#1e293b', fontWeight: 600 }} 
                        width={90}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          background: '#ffffff', 
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '12px'
                        }}
                        formatter={(value: any, name) => {
                          if (name === '3rd Party %') return [Math.round(value) + '%', '3rd Party']
                          return [Math.round(value), name]
                        }}
                      />
                      <Bar 
                        dataKey="requests" 
                        name="Requests"
                        fill="#10b981"
                        radius={[0, 8, 8, 0]}
                        barSize={12}
                        label={{ position: 'right', fill: '#10b981', fontSize: 10, fontWeight: 600 }}
                      >
                        {performanceData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={getIndustryColor(entry.industry)} />
                        ))}
                      </Bar>
                      <Bar 
                        dataKey="thirdPartyRatio" 
                        name="3rd Party %"
                        fill="#f59e0b"
                        radius={[0, 8, 8, 0]}
                        barSize={12}
                        label={{ position: 'right', fill: '#f59e0b', fontSize: 10, fontWeight: 600, formatter: (value: any) => Math.round(value) + '%' }}
                      >
                        {performanceData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={getIndustryColor(entry.industry)} opacity={0.7} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </section>

          {/* Time Metrics Bar Graph */}
          <section className="chart-section">
            <div className="section-header">
              <h2 className="section-label">Load Time Analysis</h2>
            </div>
            <div className="side-by-side">
              <div className="half">
                <div className="chart-container">
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '1rem', color: '#1e293b' }}>LCP & FCP (seconds)</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={performanceData} layout="vertical" margin={{ top: 10, right: 50, left: 0, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.6} />
                      <XAxis 
                        type="number"
                        domain={[0, 'dataMax + 5']}
                        tick={{ fontSize: 11, fill: '#64748b' }}
                      />
                      <YAxis 
                        type="category"
                        dataKey="name" 
                        tick={{ fontSize: 10, fill: '#1e293b', fontWeight: 600 }} 
                        width={90}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          background: '#ffffff', 
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '12px'
                        }}
                        formatter={(value: any, name) => {
                          if (name === 'lcp') return [Math.round(value * 10) / 10 + 's', 'LCP']
                          if (name === 'fcp') return [Math.round(value * 10) / 10 + 's', 'FCP']
                          return [value, name]
                        }}
                      />
                      <Bar 
                        dataKey="lcp" 
                        name="LCP"
                        fill="#10b981"
                        radius={[0, 8, 8, 0]}
                        barSize={12}
                        label={{ position: 'right', fill: '#10b981', fontSize: 10, fontWeight: 600, formatter: (value: any) => Math.round(value * 10) / 10 }}
                      />
                      <Bar 
                        dataKey="fcp" 
                        name="FCP"
                        fill="#3b82f6"
                        radius={[0, 8, 8, 0]}
                        barSize={12}
                        label={{ position: 'right', fill: '#3b82f6', fontSize: 10, fontWeight: 600, formatter: (value: any) => Math.round(value * 10) / 10 }}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
              <div className="half">
                <div className="chart-container">
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={performanceData} margin={{ top: 20, right: 20, left: 0, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.6} />
                      <XAxis 
                        dataKey="name" 
                        angle={-45}
                        textAnchor="end"
                        height={60}
                        tick={{ fontSize: 10, fill: '#64748b' }}
                      />
                      <YAxis 
                        tick={{ fontSize: 11, fill: '#64748b' }}
                        domain={[0, 'dataMax + 500']}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          background: '#ffffff', 
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '12px'
                        }}
                        formatter={(value: any, name) => {
                          if (name === 'tti') return [Math.round(value * 10) / 10 + 's', 'TTI']
                          if (name === 'si') return [Math.round(value * 10) / 10 + 's', 'SI']
                          if (name === 'tbt') return [Math.round(value) + 'ms', 'TBT']
                          return [value, name]
                        }}
                      />
                      <Bar 
                        dataKey="tti" 
                        name="TTI"
                        fill="#8b5cf6"
                        radius={[8, 8, 0, 0]}
                        barSize={20}
                        label={{ position: 'top', fill: '#8b5cf6', fontSize: 9, fontWeight: 600, formatter: (value: any) => Math.round(value * 10) / 10 }}
                      />
                      <Bar 
                        dataKey="si" 
                        name="SI"
                        fill="#ec4899"
                        radius={[8, 8, 0, 0]}
                        barSize={20}
                        label={{ position: 'top', fill: '#ec4899', fontSize: 9, fontWeight: 600, formatter: (value: any) => Math.round(value * 10) / 10 }}
                      />
                      <Bar 
                        dataKey="tbt" 
                        name="TBT"
                        fill="#f59e0b"
                        radius={[8, 8, 0, 0]}
                        barSize={20}
                        label={{ position: 'top', fill: '#f59e0b', fontSize: 9, fontWeight: 600, formatter: (value: any) => Math.round(value) }}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </section>

          {/* Page Size Scatter Analysis */}
          <section className="chart-section">
            <div className="section-header">
              <h2 className="section-label">Page Weight Correlation Analysis</h2>
              <p className="section-description">Relationship between Page Size, Performance Score, and Request Volume</p>
            </div>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={450}>
                <ScatterChart margin={{ top: 40, right: 40, left: 10, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#475569" strokeOpacity={0.7} />
                  <XAxis 
                    type="number" 
                    dataKey="sizeMB" 
                    name="Page Size" 
                    unit="MB"
                    label={{ value: 'Total Page Size (MB)', position: 'insideBottom', offset: -15, style: { fontSize: 13, fill: '#1e293b', fontWeight: 600 } }}
                    tick={{ fontSize: 11, fill: '#475569', fontWeight: 500 }}
                  />
                  <YAxis 
                    type="number" 
                    dataKey="score" 
                    name="Score" 
                    domain={[0, 100]}
                    label={{ value: 'Performance Score', angle: -90, position: 'insideLeft', style: { fontSize: 13, fill: '#1e293b', fontWeight: 600 } }}
                    tick={{ fontSize: 11, fill: '#475569', fontWeight: 500 }}
                  />
                  <ZAxis type="number" dataKey="requests" range={[150, 1500]} name="Requests" />
                  <Tooltip 
                    cursor={{ strokeDasharray: '3 3', stroke: '#475569' }}
                    contentStyle={{ 
                      background: '#ffffff', 
                      border: '2px solid #e2e8f0', 
                      borderRadius: '12px', 
                      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                      fontSize: '13px'
                    }}
                    formatter={(value: any, name: string, props: any) => {
                      if (name === 'Page Size') return [`${value.toFixed(1)} MB`, 'Size']
                      if (name === 'Score') return [value, 'Score']
                      if (name === 'Requests') return [value, 'Requests']
                      if (props.payload.name) return [props.payload.name, 'Site']
                      return [value, name]
                    }}
                  />
                  <Scatter name="Sites" data={performanceData} fill="#3b82f6" fillOpacity={0.8}>
                    {performanceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getIndustryColor(entry.industry)} />
                    ))}
                    <LabelList 
                      dataKey="name" 
                      position="top" 
                      offset={15} 
                      style={{ 
                        fontSize: '12px', 
                        fill: '#000000', 
                        fontWeight: 800,
                        textShadow: '0 0 4px #ffffff'
                      }} 
                    />
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
              <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.9rem', color: '#475569', fontWeight: 500 }}>
                Bubble size reflects total network requests. Labels identify individual websites.
              </div>
            </div>
          </section>
        </>
      )}

      {viewMode === 'detailed' && (
        <>
          {/* Individual Site Detailed Breakdowns */}
          <section className="chart-section">
            <div className="section-header">
              <h2 className="section-label">Detailed Site Analysis</h2>
              <p className="section-description">Comprehensive performance breakdown for each website</p>
            </div>
            
            {filteredResults.map((site, index) => {
              const siteRanking = data.summary.ranking.find(r => r.name === site.name)
              const rank = siteRanking?.rank || index + 1
              
              // Calculate resource breakdown percentages
              const categories = ['js', 'css', 'image', 'font', 'other']
              const resourceData = categories.map(cat => {
                const catData = site.network.byCategory[cat]
                return {
                  name: cat.toUpperCase(),
                  value: catData ? catData.sizeKB : 0,
                  percentage: catData ? (catData.sizeKB / site.network.totalSizeKB) * 100 : 0,
                  count: catData ? catData.count : 0
                }
              }).filter(item => item.value > 0)
              
              return (
                <div key={site.name} className="site-detail-card" style={{
                  background: '#ffffff',
                  borderRadius: '12px',
                  padding: '2rem',
                  marginBottom: '2rem',
                  border: `3px solid ${getIndustryColor(site.industry)}`,
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                }}>
                  {/* Site Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                        <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>
                          #{rank} <TextScramble className="font-bold">{site.name}</TextScramble>
                        </h3>
                        <span style={{
                          background: getIndustryColor(site.industry),
                          color: '#ffffff',
                          padding: '0.25rem 0.75rem',
                          borderRadius: '6px',
                          fontSize: '0.85rem',
                          fontWeight: 600
                        }}>
                          {site.industry.charAt(0).toUpperCase() + site.industry.slice(1)}
                        </span>
                      </div>
                      <a href={site.url} target="_blank" rel="noopener noreferrer" style={{
                        color: '#3b82f6',
                        textDecoration: 'none',
                        fontSize: '0.95rem'
                      }}>
                        {site.url}
                      </a>
                      <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                        Audited: {new Date(site.audited_at).toLocaleString()} • {site.runs_completed} runs
                      </p>
                    </div>
                    <div className={`score-badge ${getScoreBadgeClass(site.lighthouse.performanceScore)}`} style={{
                      fontSize: '2.5rem',
                      fontWeight: 700,
                      padding: '1rem 1.5rem',
                      borderRadius: '12px',
                      minWidth: '100px',
                      textAlign: 'center'
                    }}>
                      <AnimatedNumber 
                        value={site.lighthouse.performanceScore} 
                        springOptions={{ bounce: 0, duration: 1500 }}
                      />
                    </div>
                  </div>

                  {/* Core Web Vitals Grid */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                    gap: '1rem',
                    marginBottom: '2rem'
                  }}>
                    <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px' }}>
                      <div style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>LCP</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b' }}>
                        <AnimatedNumber 
                          value={site.lighthouse.lcp} 
                          springOptions={{ bounce: 0, duration: 1200 }}
                          formatValue={(val) => val.toFixed(2)}
                        />s
                      </div>
                    </div>
                    <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px' }}>
                      <div style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>FCP</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b' }}>
                        <AnimatedNumber 
                          value={site.lighthouse.fcp} 
                          springOptions={{ bounce: 0, duration: 1200 }}
                          formatValue={(val) => val.toFixed(2)}
                        />s
                      </div>
                    </div>
                    <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px' }}>
                      <div style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>TBT</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b' }}>
                        <AnimatedNumber 
                          value={site.lighthouse.tbt} 
                          springOptions={{ bounce: 0, duration: 1200 }}
                          formatValue={(val) => Math.round(val)}
                        />ms
                      </div>
                    </div>
                    <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px' }}>
                      <div style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>CLS</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b' }}>
                        <AnimatedNumber 
                          value={site.lighthouse.cls} 
                          springOptions={{ bounce: 0, duration: 1200 }}
                          formatValue={(val) => val.toFixed(3)}
                        />
                      </div>
                    </div>
                    <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px' }}>
                      <div style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>SI</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b' }}>
                        <AnimatedNumber 
                          value={site.lighthouse.si} 
                          springOptions={{ bounce: 0, duration: 1200 }}
                          formatValue={(val) => val.toFixed(2)}
                        />s
                      </div>
                    </div>
                    <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px' }}>
                      <div style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>TTI</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b' }}>
                        <AnimatedNumber 
                          value={site.lighthouse.tti} 
                          springOptions={{ bounce: 0, duration: 1200 }}
                          formatValue={(val) => val.toFixed(2)}
                        />s
                      </div>
                    </div>
                  </div>

                  {/* Network Stats */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '1rem',
                    marginBottom: '2rem',
                    padding: '1rem',
                    background: '#f1f5f9',
                    borderRadius: '8px'
                  }}>
                    <div>
                      <div style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 600 }}>Total Page Size</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b' }}>
                        <AnimatedNumber 
                          value={site.network.totalSizeKB / 1024} 
                          springOptions={{ bounce: 0, duration: 1500 }}
                          formatValue={(val) => val.toFixed(2)}
                        /> MB
                      </div>
                    </div>
                    <div>
                      <div style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 600 }}>Total Requests</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b' }}>
                        <AnimatedNumber 
                          value={site.network.totalRequests} 
                          springOptions={{ bounce: 0, duration: 1500 }}
                        />
                      </div>
                    </div>
                    <div>
                      <div style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 600 }}>3rd Party Requests</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b' }}>
                        <AnimatedNumber 
                          value={site.network.thirdPartyRequests} 
                          springOptions={{ bounce: 0, duration: 1500 }}
                        /> (<AnimatedNumber 
                          value={site.network.thirdPartyRatio * 100} 
                          springOptions={{ bounce: 0, duration: 1500 }}
                          formatValue={(val) => val.toFixed(1)}
                        />%)
                      </div>
                    </div>
                  </div>

                  {/* Resource Breakdown */}
                  <div style={{ marginBottom: '2rem' }}>
                    <h4 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e293b', marginBottom: '1rem' }}>
                      Resource Breakdown by Type
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {resourceData.map(resource => (
                        <div key={resource.name} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <div style={{ minWidth: '80px', fontSize: '0.9rem', fontWeight: 600, color: '#64748b' }}>
                            {resource.name}
                          </div>
                          <div style={{ flex: 1, background: '#e2e8f0', borderRadius: '4px', height: '24px', position: 'relative', overflow: 'hidden' }}>
                            <div style={{
                              background: getIndustryColor(site.industry),
                              height: '100%',
                              width: `${resource.percentage}%`,
                              transition: 'width 0.3s ease'
                            }} />
                          </div>
                          <div style={{ minWidth: '120px', fontSize: '0.9rem', fontWeight: 600, color: '#1e293b', textAlign: 'right' }}>
                            {(resource.value / 1024).toFixed(2)} MB ({resource.percentage.toFixed(1)}%)
                          </div>
                          <div style={{ minWidth: '80px', fontSize: '0.85rem', color: '#64748b', textAlign: 'right' }}>
                            {resource.count} files
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Largest Resources */}
                  {site.largest_resources && site.largest_resources.length > 0 && (
                    <div>
                      <h4 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e293b', marginBottom: '1rem' }}>
                        🔍 Largest Resources (Optimization Targets)
                      </h4>
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                              <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, color: '#64748b' }}>Rank</th>
                              <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, color: '#64748b' }}>Resource URL</th>
                              <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, color: '#64748b' }}>Type</th>
                              <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600, color: '#64748b' }}>Size</th>
                            </tr>
                          </thead>
                          <tbody>
                            {site.largest_resources.slice(0, 10).map((resource, idx) => (
                              <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                <td style={{ padding: '0.75rem', fontWeight: 600, color: '#64748b' }}>#{idx + 1}</td>
                                <td style={{ padding: '0.75rem', maxWidth: '400px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  <a href={resource.url} target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6', textDecoration: 'none' }}>
                                    {resource.url.length > 60 ? '...' + resource.url.slice(-60) : resource.url}
                                  </a>
                                </td>
                                <td style={{ padding: '0.75rem' }}>
                                  <span style={{
                                    background: getIndustryColor(site.industry),
                                    color: '#ffffff',
                                    padding: '0.25rem 0.5rem',
                                    borderRadius: '4px',
                                    fontSize: '0.75rem',
                                    fontWeight: 600
                                  }}>
                                    {resource.category.toUpperCase()}
                                  </span>
                                </td>
                                <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600, color: '#1e293b' }}>
                                  {(resource.sizeKB / 1024).toFixed(2)} MB
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </section>
        </>
      )}

      {viewMode === 'comparison' && (
        <>
          {/* Site Comparison Table */}
          <section className="chart-section">
            <div className="section-header">
              <h2 className="section-label">Detailed Site Comparison</h2>
              <p className="section-description">Complete metrics for all audited sites</p>
            </div>
            <div className="table-container">
              <table className="detailed-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Site</th>
                    <th>Industry</th>
                    <th>Score</th>
                    <th>LCP</th>
                    <th>FCP</th>
                    <th>TBT</th>
                    <th>CLS</th>
                    <th>Size</th>
                    <th>Requests</th>
                    <th>3rd Party</th>
                  </tr>
                </thead>
                <tbody>
                  {data.summary.ranking.map(site => {
                    const fullSite = data.results.find(s => s.name === site.name)
                    if (!fullSite) return null
                    
                    return (
                      <tr key={site.rank}>
                        <td className="rank-num">{site.rank}</td>
                        <td>
                          <div className="org-name">{site.name}</div>
                          <a href={fullSite.url} target="_blank" rel="noopener noreferrer" className="org-url">
                            {fullSite.url.replace('https://', '').replace('www.', '')}
                          </a>
                        </td>
                        <td>
                          <span className="industry-badge" style={{ backgroundColor: getIndustryColor(fullSite.industry) }}>
                            {fullSite.industry}
                          </span>
                        </td>
                        <td>
                          <span className={`score-badge ${getScoreBadgeClass(site.score)}`}>
                            {site.score === 0 ? 'Failed' : site.score}
                          </span>
                        </td>
                        <td className={`metric-value ${fullSite.lighthouse.lcp > 10 ? 'metric-warning' : fullSite.lighthouse.lcp > 20 ? 'metric-poor' : 'metric-good'}`}>
                          {fullSite.lighthouse.lcp > 0 ? `${fullSite.lighthouse.lcp.toFixed(2)}s` : '—'}
                        </td>
                        <td className="metric-value">{fullSite.lighthouse.fcp > 0 ? `${fullSite.lighthouse.fcp.toFixed(2)}s` : '—'}</td>
                        <td className="metric-value">{fullSite.lighthouse.tbt > 0 ? `${fullSite.lighthouse.tbt}ms` : '—'}</td>
                        <td className="metric-value">{fullSite.lighthouse.cls > 0 ? fullSite.lighthouse.cls.toFixed(3) : '—'}</td>
                        <td className="metric-value">{fullSite.network.totalSizeKB > 0 ? `${(fullSite.network.totalSizeKB / 1024).toFixed(1)} MB` : '—'}</td>
                        <td className="metric-value">{fullSite.network.totalRequests}</td>
                        <td className="metric-value">{(fullSite.network.thirdPartyRatio * 100).toFixed(1)}%</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      <footer className="dash-footer">
        <p>Data generated: {new Date(data.meta.generated_at).toLocaleString()}</p>
        <p>Methodology: {data.meta.methodology} · Outlier detection: {data.meta.outlier_method}</p>
      </footer>
    </div>
  )
}

export default App