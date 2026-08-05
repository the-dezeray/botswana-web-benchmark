"use client";

import { Space_Grotesk, IBM_Plex_Mono } from "next/font/google";

const spaceGrotesk = Space_Grotesk({ 
  subsets: ["latin"], 
  weight: ["400", "500", "600", "700"] 
});
const ibmPlexMono = IBM_Plex_Mono({ 
  subsets: ["latin"], 
  weight: ["400", "500", "600", "700"] 
});

export default function StatsCard() {
  return (
    <section className="w-full bg-[#0A0A0A] py-12 px-6 sm:px-10 border-y border-white/10">
      <div className="max-w-[1400px] mx-auto">
        {/* Full Width Horizontal Layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12 items-start">
          
          {/* Showing Sites */}
          <div className="text-center lg:text-left min-h-[140px] flex flex-col justify-center">
            <div className={`text-white/60 text-[11px] uppercase tracking-[0.2em] mb-3 ${ibmPlexMono.className}`}>
              Showing Sites
            </div>
            <div className={`text-white text-[56px] font-bold leading-none mb-2 ${spaceGrotesk.className}`}>
              48
            </div>
            <div className="h-1 w-16 bg-gradient-to-r from-[#0A2ADB] to-[#0A2ADB]/40 mx-auto lg:mx-0"></div>
          </div>

          {/* Average Score */}
          <div className="text-center lg:text-left min-h-[140px] flex flex-col justify-center lg:border-l lg:border-white/10 lg:pl-12">
            <div className={`text-white/60 text-[11px] uppercase tracking-[0.2em] mb-3 ${ibmPlexMono.className}`}>
              Average Score
            </div>
            <div className={`text-white text-[56px] font-bold leading-none mb-2 ${spaceGrotesk.className}`}>
              36.0
            </div>
            <div className="h-1 w-16 bg-gradient-to-r from-[#0A2ADB] to-[#0A2ADB]/40 mx-auto lg:mx-0"></div>
          </div>

          {/* Top Performer */}
          <div className="text-center lg:text-left min-h-[140px] flex flex-col justify-center lg:border-l lg:border-white/10 lg:pl-12">
            <div className={`text-white/60 text-[11px] uppercase tracking-[0.2em] mb-3 ${ibmPlexMono.className}`}>
              Top Performer
            </div>
            <div className={`text-white text-[28px] font-bold leading-tight mb-1 ${spaceGrotesk.className}`}>
              BA ISAGO
            </div>
            <div className={`text-[#0A2ADB] text-[20px] font-semibold ${ibmPlexMono.className}`}>
              66.67<span className="text-white/40 text-[16px]">/100</span>
            </div>
            <div className="h-1 w-16 bg-gradient-to-r from-[#0A2ADB] to-[#0A2ADB]/40 mx-auto lg:mx-0 mt-3"></div>
          </div>

          {/* Benchmark Info */}
          <div className="text-center lg:text-right min-h-[140px] flex flex-col justify-center lg:border-l lg:border-white/10 lg:pl-12">
            <p className={`text-white/40 text-[10px] uppercase tracking-[0.15em] ${ibmPlexMono.className}`}>
              Benchmark Data • Core Web Vitals Analysis
            </p>
          </div>

        </div>
      </div>
    </section>
  );
}
