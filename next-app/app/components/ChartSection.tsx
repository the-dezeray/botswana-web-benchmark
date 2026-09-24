"use client";

import dynamic from "next/dynamic";
import { Globe } from "lucide-react";
function ChartSkeleton() {
  return (
    <div className="w-full py-16 flex items-center justify-center">
      <span className="text-xs font-mono text-stone-500 animate-pulse">
        Loading chart…
      </span>
    </div>
  );
}

const PerformanceChart = dynamic(
  () => import("@/components/PerformanceChart"),
  { ssr: false, loading: () => <ChartSkeleton /> }
);

const CoreWebVitalsAnalysis = dynamic(
  () => import("@/components/CoreWebVitalsAnalysis"),
  { ssr: false, loading: () => <ChartSkeleton /> }
);

const PageSizeAndRequests = dynamic(
  () => import("@/components/PageSizeAndRequests"),
  { ssr: false, loading: () => <ChartSkeleton /> }
);

const TtiSiTbtComparison = dynamic(
  () => import("@/components/TtiSiTbtComparison"),
  { ssr: false, loading: () => <ChartSkeleton /> }
);

const PageWeightCorrelation = dynamic(
  () => import("@/components/PageWeightCorrelation"),
  { ssr: false, loading: () => <ChartSkeleton /> }
);

const SiteSizeAndSpeedRanking = dynamic(
  () => import("@/components/SiteSizeAndSpeedRanking"),
  { ssr: false, loading: () => <ChartSkeleton /> }
);

interface Props {
  siteData: any[];
}

export default function ChartSection({ siteData }: Props) {
  return (
    <>
      <PerformanceChart />

   <section className="w-full px-6 py-8 sm:px-10 lg:px-12">
  <div className="relative overflow-hidden rounded-[24px] border border-black/10 bg-[#FDE68A] shadow-[0_10px_30px_rgba(0,0,0,0.08)]">
    {/* Large clipped decorative Lucide Icon */}
    <Globe 
      className="absolute -bottom-10 -right-10 h-64 w-64 text-black/10 pointer-events-none select-none stroke-[1.25]" 
      aria-hidden="true" 
    />

    <div className="relative z-10 flex flex-col gap-5 px-6 py-7 sm:flex-row sm:items-end sm:justify-between sm:px-8 lg:px-10">
      <div className="max-w-2xl">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-black/70">
          Research Support
        </p>
        <h2 className="text-[18px] font-semibold tracking-tight text-black sm:text-[22px]">
          This project provides insights into Botswana&apos;s digital ecosystem. Companies interested in supporting open technology research can sponsor future reports.
        </h2>
      </div>
      <a
        href="mailto:hello@atsb.dev"
        className="group relative shrink-0 overflow-hidden rounded-full border border-black/20 bg-black px-5 py-2.5 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#FDE68A] transition hover:-translate-y-0.5"
      >
        <span
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "repeating-linear-gradient(135deg, #FDE68A 0 2px, transparent 2px 8px)",
          }}
        />
        <span className="relative z-10">Sponsor</span>
      </a>
    </div>
  </div>
</section>

      <CoreWebVitalsAnalysis />
      <PageSizeAndRequests />
      <TtiSiTbtComparison />
      <PageWeightCorrelation />

      {siteData.length > 0 && (
        <section
          id="size-speed-ranking"
          className="w-full bg-[#f7f2e7] text-[#1c1917] px-6 sm:px-10 py-16 border-t border-[#e5dcc8]"
        >
          <div className="max-w-[1400px] mx-auto">
            <div className="mb-8">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#1c1917] mb-2 font-space-grotesk">
                Site Size &amp; Speed Rankings
              </h2>
              <p className="text-stone-600 text-sm max-w-2xl font-sans">
                Comparing audited Botswana websites by total page size (MB) and
                Largest Contentful Paint (LCP) speed.
              </p>
            </div>
            <SiteSizeAndSpeedRanking data={siteData} />
          </div>
        </section>
      )}
    </>
  );
}
