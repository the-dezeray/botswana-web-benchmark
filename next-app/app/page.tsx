"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Space_Grotesk, IBM_Plex_Mono } from "next/font/google";
import PerformanceChart from "@/components/PerformanceChart";
import CoreWebVitalsAnalysis from "@/components/CoreWebVitalsAnalysis";
import PageSizeAndRequests from "@/components/PageSizeAndRequests";
import TtiSiTbtComparison from "@/components/TtiSiTbtComparison";
import PageWeightCorrelation from "@/components/PageWeightCorrelation";
import StatsCard from "@/components/StatsCard";

const spaceGrotesk = Space_Grotesk({ 
  subsets: ["latin"], 
  weight: ["400", "500", "600", "700"] 
});
const ibmPlexMono = IBM_Plex_Mono({ 
  subsets: ["latin"], 
  weight: ["400", "500"] 
});

export default function Home() {
  const [activeImage, setActiveImage] = useState(0);
  const [activeSiteIndex, setActiveSiteIndex] = useState(0);

  const imagePlaceholders = [
    "https://placehold.co/800x800/f8f9fa/0A2ADB?text=3D+Graphic+01",
    "https://placehold.co/800x800/f8f9fa/0A2ADB?text=3D+Graphic+02",
    "https://placehold.co/800x800/f8f9fa/0A2ADB?text=3D+Graphic+03",
    "https://placehold.co/800x800/f8f9fa/0A2ADB?text=3D+Graphic+04",
    "https://placehold.co/800x800/f8f9fa/0A2ADB?text=3D+Graphic+05",
  ];

  const siteImages = [
    { src: "/sites/ub.jpg", alt: "UB" },
    { src: "/sites/bpc.jpg", alt: "BPC" },
    { src: "/sites/biust.jpg", alt: "BIUST" },
    { src: "/sites/debswana.jpg", alt: "Debswana" },
    { src: "/sites/images.png", alt: "Site" },
    { src: null, alt: "+more" },
  ];

  // Cycle through sites
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveSiteIndex((prev) => (prev + 1) % siteImages.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <main className={`relative w-full min-h-screen bg-white text-[#0A2ADB] ${ibmPlexMono.className}`}>
      
      {/* Landing Page Hero Section */}
      <section className="relative w-full h-screen overflow-hidden flex flex-col justify-between">
        {/* Mesh Texture Overlay */}
        <div className="mesh-overlay"></div>
        
        {/* 3D Image Replacement Area - Now showing cycling site images */}
        <div className="absolute inset-0 z-0 flex items-center justify-end pr-[10%] pointer-events-none">
          <div className="w-full max-w-[550px] h-[550px] relative">
            {siteImages.map((site, index) => (
              site.src && (
                <img 
                  key={index}
                  src={site.src} 
                  alt={site.alt}
                  className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${
                    index === activeSiteIndex ? 'opacity-100' : 'opacity-0'
                  }`}
                />
              )
            ))}
          </div>
        </div>

        {/* Site Screenshots Grid - Upper Left - Just thumbnails */}
        <div className="absolute top-24 left-6 sm:left-10 z-10">
          <div className="bg-white/70 backdrop-blur-sm rounded-lg p-3">
    
            <div className="flex gap-2">
              {siteImages.map((site, index) => (
                <div 
                  key={index} 
                  className="w-12 h-12 rounded  hover:scale-110 " 
            
  
                  onClick={() => setActiveSiteIndex(index)}
                >
                  {site.src ? (
                    <img src={site.src} alt={site.alt} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-[#0A2ADB]/5 flex items-center justify-center">
                      <span className="text-[8px] font-mono text-[#0A2ADB]/60">{site.alt}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Navbar */}
        <nav className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-6 sm:px-10 py-6">
          <div className={`flex items-center gap-3 ${spaceGrotesk.className}`}>
            <img src="/logo.png" alt="BW Logo" className="h-8 w-auto" />
            <div className="flex items-center gap-2 px-3 py-1.5 bg-[#0A2ADB]/5 border border-[#0A2ADB]/20 rounded">
              <span className="text-[12px] font-bold text-[#0A2ADB] tracking-[0.05em]">BW</span>
              <span className="text-[11px] text-[#0A2ADB]/50">|</span>
              <span className="text-[11px] font-mono text-[#0A2ADB]/60 tracking-wider">V-0.1</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4 text-[12.5px]">
            <a href="https://github.com/yourusername/bw-site-metrics" target="_blank" rel="noopener noreferrer" className="opacity-70 hover:opacity-100 transition-opacity" title="View on GitHub">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
            </a>
            <a href="https://www.buymeacoffee.com/yourusername" target="_blank" rel="noopener noreferrer" className="opacity-70 hover:opacity-100 transition-opacity" title="Buy me a coffee">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.216 6.415l-.132-.666c-.119-.598-.388-1.163-1.001-1.379-.197-.069-.42-.098-.57-.241-.152-.143-.196-.366-.231-.572-.065-.378-.125-.756-.192-1.133-.057-.325-.102-.69-.25-.987-.195-.4-.597-.634-.996-.788a5.723 5.723 0 00-.626-.194c-1-.263-2.05-.36-3.077-.416a25.834 25.834 0 00-3.7.062c-.915.083-1.88.184-2.75.5-.318.116-.646.256-.888.501-.297.302-.393.77-.177 1.146.154.267.415.456.692.58.36.162.737.284 1.123.366 1.075.238 2.189.331 3.287.37 1.218.05 2.437.01 3.65-.118.299-.033.598-.073.896-.119.352-.054.578-.513.474-.834-.124-.383-.457-.531-.834-.473-.466.074-.96.108-1.382.146-1.177.08-2.358.082-3.536.006a22.228 22.228 0 01-1.157-.107c-.086-.01-.18-.025-.258-.036-.243-.036-.484-.08-.724-.13-.111-.027-.111-.185 0-.212h.005c.277-.06.557-.108.838-.147h.002c.131-.009.263-.032.394-.048a25.076 25.076 0 013.426-.12c.674.019 1.347.067 2.017.144l.228.031c.267.04.533.088.798.145.392.085.895.113 1.07.542.055.137.08.288.111.431l.319 1.484a.237.237 0 01-.199.284h-.003c-.037.006-.075.01-.112.015a36.704 36.704 0 01-4.743.295 37.059 37.059 0 01-4.699-.304c-.14-.017-.293-.042-.417-.06-.326-.048-.649-.108-.973-.161-.393-.065-.768-.032-1.123.161-.29.16-.527.404-.675.701-.154.316-.199.66-.267 1-.069.34-.176.707-.135 1.056.087.753.613 1.365 1.37 1.502a39.69 39.69 0 0011.343.376.483.483 0 01.535.53l-.071.697-1.018 9.907c-.041.41-.047.832-.125 1.237-.122.637-.553 1.028-1.182 1.171-.577.131-1.165.2-1.756.205-.656.004-1.31-.025-1.966-.022-.699.004-1.556-.06-2.095-.58-.475-.458-.54-1.174-.605-1.793l-.731-7.013-.322-3.094c-.037-.351-.286-.695-.678-.678-.336.015-.718.3-.678.679l.228 2.185.949 9.112c.147 1.344 1.174 2.068 2.446 2.272.742.12 1.503.144 2.257.156.966.016 1.942.053 2.892-.122 1.408-.258 2.465-1.198 2.616-2.657.34-3.332.683-6.663 1.024-9.995l.215-2.087a.484.484 0 01.39-.426c.402-.078.787-.212 1.074-.518.455-.488.546-1.124.385-1.766zm-1.478.772c-.145.137-.363.201-.578.233-2.416.359-4.866.54-7.308.46-1.748-.06-3.477-.254-5.207-.498-.17-.024-.353-.055-.47-.18-.22-.236-.111-.71-.054-.995.052-.26.152-.609.463-.646.484-.057 1.046.148 1.526.22.577.088 1.156.149 1.736.207 2.234.226 4.484.33 6.723.108.52-.05 1.04-.123 1.553-.225.334-.07.809-.232.87.1.044.24-.025.488-.181.684l-.073.082z"/></svg>
            </a>
            <Link href="#performance-chart" className={`flex items-center gap-2 bg-[#0A2ADB] text-white px-4 py-2 rounded-md font-medium text-[13px] ${spaceGrotesk.className}`}>
              View Audit ↘
            </Link>
          </div>
        </nav>

        {/* Hero Copy */}
        <div className="absolute left-6 sm:left-10 bottom-16 z-10 max-w-[640px]">
          <h1 className={`font-semibold text-[clamp(30px,4.2vw,52px)] leading-[1.12] tracking-[-0.01em] ${spaceGrotesk.className}`}>
            Botswana Web Performance<br />
            & Core Web Vitals<br />
            Benchmark Analytics.
          </h1>
          
          {/* NPX Command Box */}
          <div className="mt-6 bg-slate-900 rounded-lg p-5 max-w-[580px] border border-slate-800">
            <p className="text-[10px] uppercase tracking-[0.15em] text-slate-400 mb-3 font-medium">Run the benchmark yourself:</p>
            <div className="flex items-center gap-3">
              <span className="text-emerald-400 text-sm font-mono">$</span>
              <code className="flex-1 text-white font-mono text-[14px]">npx bw-site-metrics run</code>
              <button 
                onClick={() => navigator.clipboard.writeText('npx bw-site-metrics run')}
                className="opacity-60 hover:opacity-100 transition-opacity p-1.5 hover:bg-slate-800 rounded"
                title="Copy to clipboard"
              >
                <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
          </div>

          <div className="mt-7 flex flex-wrap items-center gap-4">
            <Link href="#performance-chart" className={`inline-flex items-center gap-2 bg-[#0A2ADB] text-white px-5 py-3 rounded-md font-medium text-[14px] ${spaceGrotesk.className}`}>
              Explore Audit Data ↘
            </Link>
            <a href="/docs" className={`inline-flex items-center gap-2 bg-white text-[#0A2ADB] border border-[#0A2ADB]/30 px-5 py-3 rounded-md font-medium text-[14px] hover:bg-[#0A2ADB]/5 transition-colors ${spaceGrotesk.className}`}>
              Read Docs →
            </a>
          </div>
        </div>

   
      </section>

      {/* 1. Performance Score Chart Section */}
      <PerformanceChart />

      {/* 2. Core Web Vitals Analysis Section */}
      <CoreWebVitalsAnalysis />

      {/* 3. Page Weight & Network Requests (Side-by-side) */}
      <PageSizeAndRequests />

      {/* 4. TTI / SI / TBT Comparison (Split Layout) */}
      <TtiSiTbtComparison />

      {/* 5. Page Weight Correlation Analysis Section */}
      <PageWeightCorrelation />

      {/* Footer */}
      <footer className="w-full bg-[#0A2ADB]/5 text-[#0A2ADB] text-[11px] px-6 sm:px-10 py-6 border-t border-[#0A2ADB]/10">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex flex-col gap-1">
            <span className="opacity-70">Botswana Website Performance Audit Benchmark — Complete Core Web Vitals Analysis</span>
            <span className="opacity-70 font-mono">Data source: results_quick.json</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="https://github.com/yourusername/bw-site-metrics" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 opacity-70 hover:opacity-100 transition-opacity">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
              <span className="text-[10px] uppercase tracking-wider">GitHub</span>
            </a>
            <a href="https://www.buymeacoffee.com/yourusername" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 opacity-70 hover:opacity-100 transition-opacity">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.216 6.415l-.132-.666c-.119-.598-.388-1.163-1.001-1.379-.197-.069-.42-.098-.57-.241-.152-.143-.196-.366-.231-.572-.065-.378-.125-.756-.192-1.133-.057-.325-.102-.69-.25-.987-.195-.4-.597-.634-.996-.788a5.723 5.723 0 00-.626-.194c-1-.263-2.05-.36-3.077-.416a25.834 25.834 0 00-3.7.062c-.915.083-1.88.184-2.75.5-.318.116-.646.256-.888.501-.297.302-.393.77-.177 1.146.154.267.415.456.692.58.36.162.737.284 1.123.366 1.075.238 2.189.331 3.287.37 1.218.05 2.437.01 3.65-.118.299-.033.598-.073.896-.119.352-.054.578-.513.474-.834-.124-.383-.457-.531-.834-.473-.466.074-.96.108-1.382.146-1.177.08-2.358.082-3.536.006a22.228 22.228 0 01-1.157-.107c-.086-.01-.18-.025-.258-.036-.243-.036-.484-.08-.724-.13-.111-.027-.111-.185 0-.212h.005c.277-.06.557-.108.838-.147h.002c.131-.009.263-.032.394-.048a25.076 25.076 0 013.426-.12c.674.019 1.347.067 2.017.144l.228.031c.267.04.533.088.798.145.392.085.895.113 1.07.542.055.137.08.288.111.431l.319 1.484a.237.237 0 01-.199.284h-.003c-.037.006-.075.01-.112.015a36.704 36.704 0 01-4.743.295 37.059 37.059 0 01-4.699-.304c-.14-.017-.293-.042-.417-.06-.326-.048-.649-.108-.973-.161-.393-.065-.768-.032-1.123.161-.29.16-.527.404-.675.701-.154.316-.199.66-.267 1-.069.34-.176.707-.135 1.056.087.753.613 1.365 1.37 1.502a39.69 39.69 0 0011.343.376.483.483 0 01.535.53l-.071.697-1.018 9.907c-.041.41-.047.832-.125 1.237-.122.637-.553 1.028-1.182 1.171-.577.131-1.165.2-1.756.205-.656.004-1.31-.025-1.966-.022-.699.004-1.556-.06-2.095-.58-.475-.458-.54-1.174-.605-1.793l-.731-7.013-.322-3.094c-.037-.351-.286-.695-.678-.678-.336.015-.718.3-.678.679l.228 2.185.949 9.112c.147 1.344 1.174 2.068 2.446 2.272.742.12 1.503.144 2.257.156.966.016 1.942.053 2.892-.122 1.408-.258 2.465-1.198 2.616-2.657.34-3.332.683-6.663 1.024-9.995l.215-2.087a.484.484 0 01.39-.426c.402-.078.787-.212 1.074-.518.455-.488.546-1.124.385-1.766zm-1.478.772c-.145.137-.363.201-.578.233-2.416.359-4.866.54-7.308.46-1.748-.06-3.477-.254-5.207-.498-.17-.024-.353-.055-.47-.18-.22-.236-.111-.71-.054-.995.052-.26.152-.609.463-.646.484-.057 1.046.148 1.526.22.577.088 1.156.149 1.736.207 2.234.226 4.484.33 6.723.108.52-.05 1.04-.123 1.553-.225.334-.07.809-.232.87.1.044.24-.025.488-.181.684l-.073.082z"/></svg>
              <span className="text-[10px] uppercase tracking-wider">Support</span>
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}  