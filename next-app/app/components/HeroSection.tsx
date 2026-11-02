"use client";

import Link from "next/link";
import { CommandBox } from "./CommandBox";
import { ChevronDown} from "lucide-react";
import { FaGithub } from 'react-icons/fa';
// Base images from your original setup
const baseImages = [
  { src: "/sites/ub.jpg", alt: "UB" },
  { src: "/sites/bpc.jpg", alt: "BPC" },
  { src: "/sites/biust.jpg", alt: "BIUST" },
  { src: "/sites/debswana.jpg", alt: "Debswana" },
  { src: "/sites/images.png", alt: "Site" },
];

// Generate an array of exactly 24 items to create the 12x2 grid
const gridImages = Array.from({ length: 24 }).map(
  (_, i) => baseImages[i % baseImages.length]
);

export default function HeroSection({ auditDate }: { auditDate?: string }) {
  const auditLabel = auditDate
    ? new Date(auditDate).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      })
    : null;
  return (
    <section className="relative w-full h-screen overflow-hidden flex flex-col justify-center items-center bg-[#f7f2e7] text-[#1c1917]">
      {/* Mesh Texture Overlay */}
      <div className="mesh-overlay absolute inset-0 z-0 pointer-events-none"></div>

      {/* Navbar */}
      <nav className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-6 sm:px-10 py-6">
        <div className="flex items-center gap-3 font-space-grotesk">
          <img src="/logo.png" alt="ATSB Logo" className="h-8 w-auto" />
          <div className="flex items-center gap-2 px-3 py-1.5 border border-[#e5dcc8] bg-[#fffef9] rounded shadow-sm">
            <span className="text-[12px] font-bold text-[#1c1917]  tracking-[0.05em]">
              ATSB
            </span>
            <span className="text-[11px] text-stone-400">|</span>
            <span className="text-[11px] font-mono text-stone-600 tracking-wider">
              V-0.6
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-[12.5px]">
          <Link
            href="https://github.com"
            className="flex items-center gap-2 bg-[#0A2ADB] text-white px-4 py-2 rounded-md font-medium text-[13px] font-space-grotesk shadow-sm transition hover:opacity-90"
          >
            <FaGithub className="h-4 w-4" />
            <span>Read me</span>
          </Link>
        </div>
      </nav>

      {/* Main Content - Centered to maximize negative space */}
      <div className="z-10 flex flex-col items-center w-full max-w-4xl px-6 -mt-4 sm:-mt-6 md:-mt-8">
        
        {/* 1. Minimal Header Section */}
        <div className="text-center mb-10 flex flex-col items-center">
          <h1 className="text-[32px] md:text-[38px] font-medium tracking-tight font-space-grotesk mb-3 text-[#1c1917]">
            <span className="inline-block bg-[#1c1917] text-[#FDE68A] font-mono px-2.5 py-0.5 rounded-md">ATSB</span> v-0.6-beta
          </h1>
          <p className="text-[16px] md:text-[18px] font-light leading-relaxed max-w-xl mx-auto text-stone-600">
            A Tiny Scanner For Botswana
          </p>
        </div>

        {auditLabel && (
          <div className="absolute bottom-6 left-6 z-10 rounded-lg border border-black/10 bg-[#FDE68A] px-3 py-2 shadow-[0_8px_30px_rgba(0,0,0,0.25)] backdrop-blur-sm">
            <div className="text-[12px] md:text-[13px] text-black font-mono tracking-wide">
              {auditLabel}
            </div>
          </div>
        )}

        {/* 2. 12x2 Grid (32px by 32px photos) */}
        <div className="grid grid-cols-12 gap-[6px] mb-14">
          {gridImages.map((site, index) => (
            <div
              key={index}
              className="w-8 h-8 rounded bg-[#fffef9] overflow-hidden flex items-center justify-center border border-[#e5dcc8] shadow-sm"
            >
              {site.src ? (
                <img
                  src={site.src}
                  alt={site.alt}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.style.backgroundColor = "#e7e5e4";
                  }}
                />
              ) : (
                <div className="w-full h-full bg-[#0A2ADB]/5 flex items-center justify-center rounded">
                  <span className="text-[8px] font-mono text-stone-500">
                    {site.alt}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* 3. NPX Command Box */}
        <CommandBox />

        {/* Down chevron - dark on paper */}
        <a
          id="chevron-down"
          href="#performance-chart"
          aria-label="Scroll down"
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-10 text-stone-800 p-10 hover:translate-y-1 transition-transform"
        >
          <ChevronDown className="w-16 h-16" />
        </a>

      </div>
    </section>
  );
}