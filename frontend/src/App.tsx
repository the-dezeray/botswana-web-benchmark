import { useEffect, useState, useMemo } from 'react'
import './App.css'
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, 
  PieChart, Pie, CartesianGrid, AreaChart, Area, LineChart,
  ScatterChart, Scatter, ZAxis, Legend, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis
} from 'recharts'
import { 
  TrendingUp, TrendingDown, Zap, Globe, Package, Clock, 
  BarChart3, Filter, Eye, Layers, Activity, AlertCircle
} from 'lucide-react'

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
  education: '#14b8a6'
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
      name: site.name.substring(0, 3),
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

  if (loading) return <div className="loading">Loading performance data...</div>
  if (error) return <div className="error">Error loading data: {error}</div>
  if (!data) return <div className="error">No data available</div>

  return (
    <div className="dash">
      <header className="dash-header">
        <div className="minimal-header">
          <div className="header-brand">
            <img src="/botswana-flag.png" alt="Botswana Flag" className="flag-icon" />
            <div className="brand-text">
              <h1 className="title">Botswana Web Performance</h1>
              <p className="tagline">Real-time insights into local web performance</p>
            </div>
          </div>
          <div className="header-stats">
            <div className="stat">
              <Globe className="stat-icon" size={20} />
              <div className="stat-content">
                <span className="stat-value">{data.meta.sites_audited}</span>
                <span className="stat-label">Sites</span>
              </div>
            </div>
            <div className="stat">
              <Zap className="stat-icon" size={20} />
              <div className="stat-content">
                <span className="stat-value">
                  {Math.round(Object.values(data.summary.industry_avg_score).reduce((a, b) => a + b, 0) / Object.keys(data.summary.industry_avg_score).length)}
                </span>
                <span className="stat-label">Avg Score</span>
              </div>
            </div>
            <div className="stat">
              <TrendingUp className="stat-icon" size={20} />
              <div className="stat-content">
                <span className="stat-value">{data.summary.fastest_site.substring(0, 8)}...</span>
                <span className="stat-label">Fastest</span>
              </div>
            </div>
          </div>
        </div>
        
        <p className="subtitle">
          {new Date(data.meta.generated_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} · 
          {data.meta.methodology.replace('-', ' ')} · 
          {data.meta.runs_per_site} run{data.meta.runs_per_site > 1 ? 's' : ''} per site
        </p>

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
              <ResponsiveContainer width={700} height={300}>
                <BarChart data={performanceData} layout="vertical" margin={{ top: 10, right: 30, left:0 , bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" horizontal={false} />
                  <XAxis 
                    type="number"
                    domain={[0, 100]}
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
              <ResponsiveContainer width={700} height={220}>
                <BarChart data={industryData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" horizontal={false} />
                  <XAxis 
                    type="number"
                    domain={[0, 100]}
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
                  <Bar dataKey="score" radius={[0, 8, 8, 0]} barSize={18}>
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
                  <ResponsiveContainer width={500} height={250}>
                    <BarChart data={performanceData} margin={{ top: 10, right: 20, left: 0, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" />
                      <XAxis 
                        dataKey="name" 
                        angle={-45}
                        textAnchor="end"
                        height={60}
                        tick={{ fontSize: 10, fill: '#64748b' }}
                      />
                      <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                      <Tooltip 
                        contentStyle={{ 
                          background: '#ffffff', 
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '12px'
                        }}
                        formatter={(value: any) => [Math.round(value * 10) / 10, '']}
                      />
                      <Bar dataKey="lcp" name="LCP (s)" fill="#10b981" radius={[8, 8, 0, 0]} />
                      <Bar dataKey="fcp" name="FCP (s)" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
              <div className="half">
                <div className="chart-container">
                  <ResponsiveContainer width={500} height={250}>
                    <ScatterChart margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" />
                      <XAxis 
                        type="number" 
                        dataKey="score" 
                        name="Performance Score"
                        domain={[0, 100]}
                      />
                      <YAxis 
                        type="number" 
                        dataKey="lcp" 
                        name="LCP (s)"
                      />
                      <ZAxis type="number" dataKey="sizeMB" range={[50, 400]} name="Size (MB)" />
                      <Tooltip 
                        cursor={{ strokeDasharray: '3 3' }}
                        contentStyle={{ 
                          background: '#ffffff', 
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '12px'
                        }}
                        formatter={(value: any, name) => {
                          if (name === 'score') return [Math.round(value), 'Score']
                          if (name === 'lcp') return [Math.round(value * 10) / 10 + 's', 'LCP']
                          if (name === 'sizeMB') return [Math.round(value * 10) / 10 + ' MB', 'Size']
                          return [value, name]
                        }}
                      />
                      <Scatter name="Sites" data={correlationData} fill="#8884d8">
                        {correlationData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={getIndustryColor(entry.industry)} />
                        ))}
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
                  <ResponsiveContainer width={500} height={250}>
                    <BarChart data={performanceData} margin={{ top: 10, right: 20, left: 0, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" />
                      <XAxis 
                        dataKey="name" 
                        angle={-45}
                        textAnchor="end"
                        height={60}
                        tick={{ fontSize: 10, fill: '#64748b' }}
                      />
                      <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
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
                        radius={[8, 8, 0, 0]}
                        barSize={25}
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
                  <ResponsiveContainer width={500} height={250}>
                    <BarChart data={performanceData} margin={{ top: 10, right: 20, left: 0, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" />
                      <XAxis 
                        dataKey="name" 
                        angle={-45}
                        textAnchor="end"
                        height={60}
                        tick={{ fontSize: 10, fill: '#64748b' }}
                      />
                      <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                      <Tooltip 
                        contentStyle={{ 
                          background: '#ffffff', 
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '12px'
                        }}
                        formatter={(value: any) => [Math.round(value), '']}
                      />
                      <Bar 
                        dataKey="requests" 
                        name="Requests"
                        fill="#10b981"
                        radius={[8, 8, 0, 0]}
                        barSize={25}
                      >
                        {performanceData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={getIndustryColor(entry.industry)} />
                        ))}
                      </Bar>
                      <Bar 
                        dataKey="thirdPartyRatio" 
                        name="3rd Party %"
                        fill="#f59e0b"
                        radius={[8, 8, 0, 0]}
                        barSize={25}
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
                  <ResponsiveContainer width={500} height={250}>
                    <BarChart data={performanceData} margin={{ top: 10, right: 20, left: 0, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" />
                      <XAxis 
                        dataKey="name" 
                        angle={-45}
                        textAnchor="end"
                        height={60}
                        tick={{ fontSize: 10, fill: '#64748b' }}
                      />
                      <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
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
                        radius={[8, 8, 0, 0]}
                        barSize={25}
                      />
                      <Bar 
                        dataKey="fcp" 
                        name="FCP"
                        fill="#3b82f6"
                        radius={[8, 8, 0, 0]}
                        barSize={25}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
              <div className="half">
                <div className="chart-container">
                  <ResponsiveContainer width={500} height={250}>
                    <BarChart data={performanceData} margin={{ top: 10, right: 20, left: 0, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" />
                      <XAxis 
                        dataKey="name" 
                        angle={-45}
                        textAnchor="end"
                        height={60}
                        tick={{ fontSize: 10, fill: '#64748b' }}
                      />
                      <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
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
                      />
                      <Bar 
                        dataKey="si" 
                        name="SI"
                        fill="#ec4899"
                        radius={[8, 8, 0, 0]}
                        barSize={20}
                      />
                      <Bar 
                        dataKey="tbt" 
                        name="TBT"
                        fill="#f59e0b"
                        radius={[8, 8, 0, 0]}
                        barSize={20}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </section>

          {/* Time vs Size Correlation */}
          <section className="chart-section">
            <div className="section-header">
              <h2 className="section-label">Time vs Size Correlation</h2>
            </div>
            <div className="chart-container">
              <ResponsiveContainer width={700} height={280}>
                <ScatterChart margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" />
                  <XAxis 
                    type="number" 
                    dataKey="sizeMB" 
                    name="Page Size (MB)"
                    domain={[0, 'dataMax + 2']}
                  />
                  <YAxis 
                    type="number" 
                    dataKey="lcp" 
                    name="LCP (s)"
                    domain={[0, 'dataMax + 5']}
                  />
                  <ZAxis type="number" dataKey="requests" range={[100, 800]} name="Total Requests" />
                  <Tooltip 
                    cursor={{ strokeDasharray: '3 3' }}
                    contentStyle={{ 
                      background: '#ffffff', 
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                    formatter={(value: any, name) => {
                      if (name === 'sizeMB') return [Math.round(value * 10) / 10 + ' MB', 'Size']
                      if (name === 'lcp') return [Math.round(value * 10) / 10 + 's', 'LCP']
                      if (name === 'requests') return [Math.round(value), 'Requests']
                      return [value, name]
                    }}
                  />
                  <Scatter name="Sites" data={correlationData} fill="#8884d8">
                    {correlationData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getIndustryColor(entry.industry)} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </section>
        </>
      )}

      {viewMode === 'detailed' && (
        <>
          {/* Detailed Metrics Radar Chart */}
          <section className="chart-section">
            <div className="section-header">
              <h2 className="section-label">Detailed Performance Metrics</h2>
              <p className="section-description">Radar chart showing all key metrics (normalized to 0-100 scale)</p>
            </div>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={500}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="metric" />
                  <PolarRadiusAxis domain={[0, 100]} />
                  {filteredResults.slice(0, 4).map((site, index) => {
                    const shortName = site.name.substring(0, 3)
                    const colors = [COLORS.blue, COLORS.purple, COLORS.cyan, COLORS.orange]
                    return (
                      <Radar
                        key={site.name}
                        name={shortName}
                        dataKey={shortName}
                        stroke={colors[index % colors.length]}
                        fill={colors[index % colors.length]}
                        fillOpacity={0.2}
                        strokeWidth={2}
                      />
                    )
                  })}
                  <Legend />
                  <Tooltip 
                    contentStyle={{ 
                      background: '#ffffff', 
                      border: 'none',
                      borderRadius: '12px',
                      fontSize: '12px'
                    }}
                    formatter={(value) => [`${Math.round(Number(value))}`, 'Score']}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Resource Breakdown */}
          <section className="chart-section">
            <div className="section-header">
              <h2 className="section-label">Resource Type Breakdown</h2>
              <p className="section-description">Percentage of total page size by resource type</p>
            </div>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={resourceBreakdownData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 11, fill: '#64748b' }}
                  />
                  <YAxis 
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    label={{ value: 'Percentage (%)', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      background: '#ffffff', 
                      border: 'none',
                      borderRadius: '12px',
                      fontSize: '12px'
                    }}
                    formatter={(value) => [`${Number(value).toFixed(1)}%`, '']}
                  />
                  <Legend />
                  <Bar dataKey="js" name="JavaScript" stackId="a" fill="#3b82f6" />
                  <Bar dataKey="css" name="CSS" stackId="a" fill="#14b8a6" />
                  <Bar dataKey="image" name="Images" stackId="a" fill="#f97316" />
                  <Bar dataKey="font" name="Fonts" stackId="a" fill="#8b5cf6" />
                  <Bar dataKey="other" name="Other" stackId="a" fill="#94a3b8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Performance vs Size Matrix */}
          <section className="chart-section">
            <div className="section-header">
              <h2 className="section-label">Performance vs Size Matrix</h2>
              <p className="section-description">How different time metrics correlate with page size and requests</p>
            </div>
            <div className="side-by-side">
              <div className="half">
                <div className="chart-container">
                  <ResponsiveContainer width="100%" height={350}>
                    <ScatterChart margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" />
                      <XAxis 
                        type="number" 
                        dataKey="sizeMB" 
                        name="Page Size (MB)"
                        label={{ value: 'Page Size (MB)', position: 'insideBottom', offset: -10 }}
                      />
                      <YAxis 
                        type="number" 
                        dataKey="tti" 
                        name="TTI (s)"
                        label={{ value: 'TTI (s)', angle: -90, position: 'insideLeft' }}
                      />
                      <ZAxis type="number" dataKey="requests" range={[100, 800]} name="Total Requests" />
                      <Tooltip 
                        cursor={{ strokeDasharray: '3 3' }}
                        contentStyle={{ 
                          background: '#ffffff', 
                          border: 'none',
                          borderRadius: '12px',
                          fontSize: '12px'
                        }}
                        formatter={(value, name) => {
                          if (name === 'sizeMB') return [`${value} MB`, 'Page Size']
                          if (name === 'tti') return [`${value}s`, 'TTI']
                          if (name === 'requests') return [`${value}`, 'Total Requests']
                          return [value, name]
                        }}
                      />
                      <Legend />
                      <Scatter name="Sites" data={performanceData} fill="#8884d8">
                        {performanceData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={getIndustryColor(entry.industry)} />
                        ))}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
              <div className="half">
                <div className="chart-container">
                  <ResponsiveContainer width="100%" height={350}>
                    <ScatterChart margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" />
                      <XAxis 
                        type="number" 
                        dataKey="requests" 
                        name="Total Requests"
                        label={{ value: 'Total Requests', position: 'insideBottom', offset: -10 }}
                      />
                      <YAxis 
                        type="number" 
                        dataKey="tbt" 
                        name="TBT (ms)"
                        label={{ value: 'TBT (ms)', angle: -90, position: 'insideLeft' }}
                      />
                      <ZAxis type="number" dataKey="sizeMB" range={[100, 800]} name="Size (MB)" />
                      <Tooltip 
                        cursor={{ strokeDasharray: '3 3' }}
                        contentStyle={{ 
                          background: '#ffffff', 
                          border: 'none',
                          borderRadius: '12px',
                          fontSize: '12px'
                        }}
                        formatter={(value, name) => {
                          if (name === 'requests') return [`${value}`, 'Total Requests']
                          if (name === 'tbt') return [`${value}ms`, 'TBT']
                          if (name === 'sizeMB') return [`${value} MB`, 'Page Size']
                          return [value, name]
                        }}
                      />
                      <Legend />
                      <Scatter name="Sites" data={performanceData} fill="#8884d8">
                        {performanceData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={getIndustryColor(entry.industry)} />
                        ))}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
            
            <div className="insight-card" style={{ marginTop: '2rem', maxWidth: '800px', marginLeft: 'auto', marginRight: 'auto' }}>
              <h3>⚖️ Performance-Size Tradeoffs</h3>
              <p>
                <strong>Analysis:</strong> 
                • <span style={{ color: '#10b981' }}>Smaller pages (&lt;5MB)</span> tend to have better TTI and TBT scores<br/>
                • <span style={{ color: '#f59e0b' }}>Medium pages (5-10MB)</span> show mixed performance depending on resource optimization<br/>
                • <span style={{ color: '#ef4444' }}>Large pages (&gt;10MB)</span> struggle with TBT and TTI even with moderate request counts
              </p>
              <p style={{ marginTop: '0.5rem', fontSize: '0.8rem' }}>
                <strong>Optimization Priority:</strong> Reduce page size first, then optimize request count, 
                focusing on deferring non-critical JavaScript and compressing images.
              </p>
            </div>
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

      {/* Summary Insights */}
      <section className="insights-section">
        <h2 className="section-label">Key Insights</h2>
        <div className="insights-grid">
          <div className="insight-card">
            <h3>🏆 Top Performer</h3>
            <p><strong>{data.summary.fastest_site}</strong> leads with a score of {data.results.find(s => s.name === data.summary.fastest_site)?.lighthouse.performanceScore}</p>
          </div>
          <div className="insight-card">
            <h3>📊 Industry Leader</h3>
            <p><strong>Education</strong> sector has the highest average score ({data.summary.industry_avg_score.edducation || data.summary.industry_avg_score.education})</p>
          </div>
          <div className="insight-card">
            <h3>⚡ Fastest LCP</h3>
            <p><strong>First National Bank BW</strong> has the best LCP at {data.results.find(s => s.name === 'First National Bank BW')?.lighthouse.lcp.toFixed(2)}s</p>
          </div>
          <div className="insight-card">
            <h3>📈 Improvement Opportunity</h3>
            <p><strong>{data.summary.slowest_site}</strong> needs the most improvement (score: 0)</p>
          </div>
        </div>
      </section>

      <footer className="dash-footer">
        <p>Data generated: {new Date(data.meta.generated_at).toLocaleString()}</p>
        <p>Methodology: {data.meta.methodology} · Outlier detection: {data.meta.outlier_method}</p>
      </footer>
    </div>
  )
}

export default App