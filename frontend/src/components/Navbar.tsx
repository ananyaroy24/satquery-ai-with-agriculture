"use client";

import React from "react";
import Link from "next/link";
import { 
  Satellite, 
  FileDown,
  Sprout
} from "lucide-react";

interface NavbarProps {
  onDownloadReport: () => void;
  hasResult: boolean;
  isGeneratingReport: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  onDownloadReport,
  hasResult,
  isGeneratingReport
}) => {
  return (
    <header className="mission-nav sticky top-0 z-50 w-full glass-panel border-b border-slate-700/60 px-3 sm:px-4 lg:px-6 py-2.5 sm:py-3 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
        {/* Brand & Logo */}
        <Link href="/" className="flex items-center gap-2.5 sm:gap-3 group focus:outline-none">
          <div className="orbital-logo relative flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-cyan-600 via-sky-500 to-indigo-600 text-white shadow-lg shadow-cyan-500/30 shrink-0">
            <Satellite className="w-4 h-4 sm:w-5 sm:h-5 animate-pulse" />
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 sm:h-3 sm:w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-full w-full bg-emerald-500"></span>
            </span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1 className="text-base sm:text-xl font-black tracking-tight bg-gradient-to-r from-cyan-400 via-sky-200 to-white bg-clip-text text-transparent truncate">
                SatQuery AI
              </h1>
              <span className="px-1.5 py-0.5 text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-800/80 shrink-0">
                PRO
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-400 truncate max-w-[160px] sm:max-w-none">
              Remote Sensing & Agro Vision
            </p>
          </div>
        </Link>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <Link 
            href="/agriculture"
            prefetch={true}
            className="agri-nav-link flex items-center gap-1.5 text-xs font-semibold px-2.5 sm:px-3 py-2 rounded-lg transition"
          >
            <Sprout className="w-3.5 h-3.5 text-emerald-400" />
            <span className="inline">Agriculture</span>
          </Link>
          {/* Download PDF Intelligence Report */}
          <button
            onClick={onDownloadReport}
            disabled={!hasResult || isGeneratingReport}
            className={`flex items-center gap-1.5 sm:gap-2 text-xs font-semibold px-2.5 sm:px-3 py-2 rounded-lg transition shadow-sm ${
              hasResult
                ? "bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold glow-cyan cursor-pointer active:scale-95"
                : "bg-slate-800/60 text-slate-500 border border-slate-800 cursor-not-allowed opacity-60"
            }`}
            title={hasResult ? "Download publication-ready PDF report" : "Execute a query first to generate a report"}
          >
            <FileDown className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              {isGeneratingReport ? "Generating..." : "Export Report"}
            </span>
            <span className="sm:hidden text-[11px]">
              {isGeneratingReport ? "PDF…" : "PDF"}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};
