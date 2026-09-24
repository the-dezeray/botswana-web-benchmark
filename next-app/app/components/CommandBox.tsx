"use client";

import { useState } from "react";

export function CommandBox() {
  const [copied, setCopied] = useState(false);
  const command = "npx atsb run";

  const handleCopy = () => {
    navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col items-center justify-center gap-3 w-full max-w-[580px] py-4">
      <p className="text-[10px] uppercase tracking-[0.2em] text-stone-600 font-mono font-medium text-center">
        Run the benchmark yourself
      </p>

      <button
        onClick={handleCopy}
        className="group relative flex items-center gap-3 bg-neutral-950 text-neutral-100 px-5 py-3 rounded-full font-mono text-sm border border-neutral-800 hover:border-neutral-700 transition-all duration-200 shadow-2xl hover:shadow-neutral-900/50 active:scale-[0.98] cursor-pointer"
        title="Click to copy command"
      >
        <span className="text-emerald-400 font-semibold select-none">$</span>
        <code className="text-neutral-200 tracking-tight">{command}</code>

        <div className="ml-2 pl-3 border-l border-neutral-800 flex items-center justify-center text-neutral-400 group-hover:text-neutral-100 transition-colors">
          {copied ? (
            <svg className="w-4 h-4 text-emerald-400 animate-in zoom-in-50 duration-150" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-4 h-4 opacity-60 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          )}
        </div>
      </button>

      <span className={`text-[11px] font-mono transition-all duration-200 ${copied ? "opacity-100 text-emerald-500 translate-y-0" : "opacity-0 text-transparent -translate-y-1 select-none"}`}>
        copied to clipboard!
      </span>
    </div>
  );
}