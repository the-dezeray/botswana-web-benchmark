/**
 * Utility functions to process results_quick.json data for visualizations
 */

type ShorthandMap = Record<string, string>;

const applyShorthand = (name: string, shorthand?: ShorthandMap): string => {
  return shorthand?.[name] || name;
};

export interface SiteRanking {
  rank: number;
  name: string;
  score: number;
  lcp: number;
  totalSizeKB: number;
}

export interface SiteDetail {
  name: string;
  url: string;
  industry: string;
  audited_at: string;
  runs_completed: number;
  lighthouse: {
    performanceScore: number;
    lcp: number;
    cls: number;
    tbt: number;
    fcp: number;
    si: number;
    tti: number;
  };
  network: {
    totalSizeKB: number;
    totalRequests: number;
    thirdPartyRequests: number;
    thirdPartyRatio: number;
    byCategory: {
      [key: string]: {
        count: number;
        sizeKB: number;
      };
    };
  };
  largest_resources?: Array<{
    url: string;
    category: string;
    sizeKB: number;
  }>;
}

export interface ResultsData {
  meta: {
    generated_at: string;
    tool_versions: {
      lighthouse: string;
      playwright: string;
    };
    methodology: string;
    runs_per_site: number;
    outlier_method: string;
    sites_audited: number;
    last_zero_score_audit: string;
  };
  summary: {
    fastest_site: string;
    slowest_site: string;
    ranking: SiteRanking[];
    industry_avg_score: {
      [key: string]: number;
    };
  };
  results: SiteDetail[];
}

/**
 * Get color based on performance score
 */
export const getScoreColor = (score: number): string => {
  if (score >= 60) return '#10b981'; // Green
  if (score >= 30) return '#f59e0b'; // Yellow/Orange
  return '#ef4444'; // Red
};

/**
 * Get top N sites by performance score
 */
export const getTopSites = (data: ResultsData, count: number = 15, shorthand?: ShorthandMap) => {
  return data.summary.ranking
    .filter(site => site.score > 0)
    .slice(0, count)
    .map(site => ({
      ...site,
      name: applyShorthand(site.name, shorthand),
      color: getScoreColor(site.score),
    }));
};

/**
 * Get bottom N sites by performance score
 */
export const getBottomSites = (data: ResultsData, count: number = 10, shorthand?: ShorthandMap) => {
  const validSites = data.summary.ranking.filter(site => site.score > 0);
  return validSites.slice(-count).map(site => ({
    ...site,
    name: applyShorthand(site.name, shorthand),
    color: getScoreColor(site.score),
  }));
};

/**
 * Process data for histogram (score distribution)
 */
export const getScoreDistribution = (data: ResultsData) => {
  const buckets = [
    { range: '0-10', min: 0, max: 10, count: 0 },
    { range: '10-20', min: 10, max: 20, count: 0 },
    { range: '20-30', min: 20, max: 30, count: 0 },
    { range: '30-40', min: 30, max: 40, count: 0 },
    { range: '40-50', min: 40, max: 50, count: 0 },
    { range: '50-60', min: 50, max: 60, count: 0 },
    { range: '60-70', min: 60, max: 70, count: 0 },
    { range: '70-80', min: 70, max: 80, count: 0 },
    { range: '80-90', min: 80, max: 90, count: 0 },
    { range: '90-100', min: 90, max: 100, count: 0 },
  ];

  data.summary.ranking
    .filter(site => site.score > 0)
    .forEach(site => {
      const bucket = buckets.find(
        b => site.score >= b.min && site.score < b.max
      );
      if (bucket) bucket.count++;
    });

  return buckets;
};

/**
 * Get scatter data for LCP vs Performance Score
 */
export const getLcpVsScoreData = (data: ResultsData, shorthand?: ShorthandMap) => {
  return data.summary.ranking
    .filter(site => site.score > 0 && site.lcp > 0)
    .map(site => ({
      name: applyShorthand(site.name, shorthand),
      lcp: site.lcp,
      score: site.score,
      size: site.totalSizeKB,
      color: getScoreColor(site.score),
    }));
};

/**
 * Get scatter data for Page Size vs Performance
 */
export const getSizeVsScoreData = (data: ResultsData, shorthand?: ShorthandMap) => {
  const siteDetails = new Map(
    data.results.map(site => [site.name, site.industry])
  );

  return data.summary.ranking
    .filter(site => site.score > 0 && site.totalSizeKB > 0)
    .map(site => ({
      name: applyShorthand(site.name, shorthand),
      size: site.totalSizeKB,
      score: site.score,
      industry: siteDetails.get(site.name) || 'unknown',
      color: getScoreColor(site.score),
    }));
};

/**
 * Get industry comparison data
 */
export const getIndustryComparison = (data: ResultsData) => {
  return Object.entries(data.summary.industry_avg_score)
    .map(([industry, score]) => ({
      industry: industry.charAt(0).toUpperCase() + industry.slice(1),
      score: score,
      color: getScoreColor(score),
    }))
    .sort((a, b) => b.score - a.score);
};

/**
 * Get Core Web Vitals comparison (top vs bottom performers)
 */
export const getCoreWebVitalsComparison = (data: ResultsData) => {
  const topSites = data.results
    .filter(site => site.lighthouse.performanceScore >= 50)
    .slice(0, 10);
  
  const bottomSites = data.results
    .filter(site => site.lighthouse.performanceScore > 0 && site.lighthouse.performanceScore < 30)
    .slice(0, 10);

  const calculateAverage = (sites: SiteDetail[], metric: keyof SiteDetail['lighthouse']) => {
    if (sites.length === 0) return 0;
    const sum = sites.reduce((acc, site) => acc + (site.lighthouse[metric] as number), 0);
    return sum / sites.length;
  };

  return [
    {
      group: 'Top Performers',
      LCP: calculateAverage(topSites, 'lcp'),
      CLS: calculateAverage(topSites, 'cls'),
      TBT: calculateAverage(topSites, 'tbt'),
      FCP: calculateAverage(topSites, 'fcp'),
      SI: calculateAverage(topSites, 'si'),
      TTI: calculateAverage(topSites, 'tti'),
    },
    {
      group: 'Bottom Performers',
      LCP: calculateAverage(bottomSites, 'lcp'),
      CLS: calculateAverage(bottomSites, 'cls'),
      TBT: calculateAverage(bottomSites, 'tbt'),
      FCP: calculateAverage(bottomSites, 'fcp'),
      SI: calculateAverage(bottomSites, 'si'),
      TTI: calculateAverage(bottomSites, 'tti'),
    },
  ];
};

/**
 * Get resource breakdown by category
 */
export const getResourceBreakdown = (data: ResultsData) => {
  const topSites = data.results
    .filter(site => site.lighthouse.performanceScore >= 50)
    .slice(0, 10);
  
  const bottomSites = data.results
    .filter(site => site.lighthouse.performanceScore > 0 && site.lighthouse.performanceScore < 30)
    .slice(0, 10);

  const calculateCategoryAverage = (sites: SiteDetail[]) => {
    const categories = ['js', 'css', 'image', 'font', 'other'];
    const result: any = { group: '' };
    
    categories.forEach(cat => {
      const total = sites.reduce((acc, site) => {
        return acc + (site.network.byCategory[cat]?.sizeKB || 0);
      }, 0);
      result[cat] = sites.length > 0 ? total / sites.length : 0;
    });
    
    return result;
  };

  const topAvg = calculateCategoryAverage(topSites);
  topAvg.group = 'Top Performers';
  
  const bottomAvg = calculateCategoryAverage(bottomSites);
  bottomAvg.group = 'Bottom Performers';

  return [topAvg, bottomAvg];
};

/**
 * Get third-party dependencies impact data
 */
export const getThirdPartyImpact = (data: ResultsData, shorthand?: ShorthandMap) => {
  return data.results
    .filter(site => 
      site.lighthouse.performanceScore > 0 && 
      site.network.thirdPartyRatio !== undefined
    )
    .map(site => ({
      name: applyShorthand(site.name, shorthand),
      thirdPartyRatio: site.network.thirdPartyRatio,
      score: site.lighthouse.performanceScore,
      thirdPartyRequests: site.network.thirdPartyRequests,
      color: getScoreColor(site.lighthouse.performanceScore),
    }));
};

/**
 * Get request count vs performance data
 */
export const getRequestCountVsScore = (data: ResultsData, shorthand?: ShorthandMap) => {
  return data.results
    .filter(site => 
      site.lighthouse.performanceScore > 0 && 
      site.network.totalRequests > 0
    )
    .map(site => ({
      name: applyShorthand(site.name, shorthand),
      requests: site.network.totalRequests,
      score: site.lighthouse.performanceScore,
      size: site.network.totalSizeKB,
      color: getScoreColor(site.lighthouse.performanceScore),
    }));
};

/**
 * Get LCP and FCP metrics in seconds per site (sorted by LCP)
 */
export const getLcpFcpData = (data: ResultsData, shorthand?: ShorthandMap) => {
  return data.results
    .filter(site => site.lighthouse.lcp > 0 && site.lighthouse.fcp > 0)
    .map(site => ({
      name: applyShorthand(site.name, shorthand),
      lcp: parseFloat(site.lighthouse.lcp.toFixed(2)),
      fcp: parseFloat(site.lighthouse.fcp.toFixed(2)),
      score: site.lighthouse.performanceScore,
    }))
    .sort((a, b) => a.lcp - b.lcp);
};

/**
 * Get Page Size in MB alongside Requests & Third Party metrics
 */
export const getPageSizeAndRequestsData = (data: ResultsData, shorthand?: ShorthandMap) => {
  return data.results
    .filter(site => site.network.totalSizeKB > 0)
    .map(site => {
      const sizeMB = parseFloat((site.network.totalSizeKB / 1024).toFixed(2));
      const totalRequests = site.network.totalRequests || 0;
      const thirdPartyRequests = site.network.thirdPartyRequests || 0;
      const firstPartyRequests = Math.max(0, totalRequests - thirdPartyRequests);
      const thirdPartyRatioPct = Math.round((site.network.thirdPartyRatio || 0) * 100);

      return {
        name: applyShorthand(site.name, shorthand),
        sizeMB,
        totalRequests,
        firstPartyRequests,
        thirdPartyRequests,
        thirdPartyRatioPct,
        score: site.lighthouse.performanceScore,
      };
    })
    .sort((a, b) => b.sizeMB - a.sizeMB);
};

/**
 * Get TTI, SI, and TBT metrics for split chart visualizer
 */
export const getTtiSiTbtData = (data: ResultsData, shorthand?: ShorthandMap) => {
  return data.results
    .filter(site => site.lighthouse.tti > 0)
    .map(site => ({
      name: applyShorthand(site.name, shorthand),
      tti: parseFloat(site.lighthouse.tti.toFixed(2)),
      si: parseFloat(site.lighthouse.si.toFixed(2)),
      tbt: Math.round(site.lighthouse.tbt || 0),
      score: site.lighthouse.performanceScore,
    }))
    .sort((a, b) => a.tti - b.tti);
};

/**
 * Get multi-metric correlation data for Page Weight Analysis
 */
export const getPageWeightCorrelationData = (data: ResultsData, shorthand?: ShorthandMap) => {
  return data.results
    .filter(site => site.network.totalSizeKB > 0 && site.lighthouse.performanceScore > 0)
    .map(site => ({
      name: applyShorthand(site.name, shorthand),
      sizeMB: parseFloat((site.network.totalSizeKB / 1024).toFixed(2)),
      score: site.lighthouse.performanceScore,
      requests: site.network.totalRequests || 0,
      industry: site.industry,
      color: getScoreColor(site.lighthouse.performanceScore),
    }));
};

