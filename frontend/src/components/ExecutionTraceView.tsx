"use client";

import React, { useState } from "react";
import { 
  Activity, 
  ChevronDown, 
  ChevronUp, 
  Clock, 
  CheckCircle2, 
  TrendingUp, 
  TrendingDown, 
  Cpu, 
  BarChart3,
  Gauge
} from "lucide-react";
import { ExecutionStep, ConfidenceBreakdown, QuantitativeMetric, TaskType } from "../types";

interface ExecutionTraceViewProps {
  trace: ExecutionStep[];
  detectedTask: TaskType;
  selectedModel: string;
  confidenceScore: number;
  confidenceBreakdown?: ConfidenceBreakdown;
  metrics: QuantitativeMetric[];
}

export const ExecutionTraceView: React.FC<ExecutionTraceViewProps> = ({
  trace,
  detectedTask,
  selectedModel,
  confidenceScore,
  confidenceBreakdown,
  metrics
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  // Confidence color
  const confColor = confidenceScore >= 90 
    ? "text-emerald-400 border-emerald-500/50 bg-emerald-950/30" 
    : confidenceScore >= 75 
    ? "text-cyan-400 border-cyan-500/50 bg-cyan-950/30" 
    : "text-amber-400 border-amber-500/50 bg-amber-950/30";

  return (
    <div className="rounded-2xl glass-panel border border-slate-800 p-4 space-y-4 shadow-xl">
      {/* Top Header: Detected Task & Confidence Score */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-cyan-950 text-cyan-300 border border-cyan-800">
              Task: {detectedTask.replace("_", " ")}
            </span>
            <span className="text-xs text-slate-400 font-mono hidden sm:inline">
              Trace #{trace.length} Steps
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-300 font-semibold">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span className="truncate max-w-[240px] sm:max-w-md">{selectedModel}</span>
          </div>
        </div>

        {/* Confidence Gauge Badge */}
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${confColor}`}>
          <Gauge className="w-4 h-4" />
          <div className="text-right">
            <div className="text-[10px] uppercase font-bold tracking-wider opacity-80">Confidence</div>
            <div className="text-sm font-black font-mono leading-none">{confidenceScore}%</div>
          </div>
        </div>
      </div>

      {/* Quantitative Remote Sensing Metrics Grid */}
      {metrics && metrics.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 mb-2">
            <BarChart3 className="w-3.5 h-3.5 text-cyan-400" />
            Quantitative Earth Observation Metrics
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {metrics.map((m, idx) => (
              <div
                key={idx}
                className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs flex flex-col justify-between"
              >
                <span className="text-[11px] text-slate-400 truncate">{m.label}</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-base font-bold font-mono text-slate-100">{m.value}</span>
                  {m.unit && <span className="text-[10px] text-slate-500 font-mono">{m.unit}</span>}
                  {m.trend === "up" && <TrendingUp className="w-3 h-3 text-emerald-400 ml-auto" />}
                  {m.trend === "down" && <TrendingDown className="w-3 h-3 text-red-400 ml-auto" />}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confidence Breakdown Bars */}
      {confidenceBreakdown && (
        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2 text-xs">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Uncertainty & Reliability Calibration
          </div>
          <div className="space-y-1.5">
            <div>
              <div className="flex justify-between text-[11px] text-slate-300 mb-0.5">
                <span>Semantic Alignment (VLM)</span>
                <span className="font-mono text-cyan-400">{Math.round(confidenceBreakdown.semantic_alignment * 100)}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div 
                  className="h-full bg-cyan-400 rounded-full" 
                  style={{ width: `${confidenceBreakdown.semantic_alignment * 100}%` }} 
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[11px] text-slate-300 mb-0.5">
                <span>Spectral Reflectance Consistency</span>
                <span className="font-mono text-emerald-400">{Math.round(confidenceBreakdown.spectral_consistency * 100)}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div 
                  className="h-full bg-emerald-400 rounded-full" 
                  style={{ width: `${confidenceBreakdown.spectral_consistency * 100}%` }} 
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[11px] text-slate-300 mb-0.5">
                <span>Spatial Bounding Grounding IoU</span>
                <span className="font-mono text-indigo-400">{Math.round(confidenceBreakdown.spatial_grounding * 100)}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div 
                  className="h-full bg-indigo-400 rounded-full" 
                  style={{ width: `${confidenceBreakdown.spatial_grounding * 100}%` }} 
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Accordion: Step-by-step Execution Trace */}
      <div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-slate-800/60 text-xs font-semibold text-slate-300 transition cursor-pointer"
        >
          <span className="flex items-center gap-2 text-cyan-400">
            <Activity className="w-4 h-4" />
            Agentic Processing Trace ({trace.length} Steps)
          </span>
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {isExpanded && (
          <div className="mt-2 space-y-2 relative pl-3 before:absolute before:left-1 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
            {trace.map((step) => (
              <div
                key={step.step_index}
                className="relative p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs space-y-1 group hover:border-cyan-700/60 transition"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-cyan-950 border border-cyan-800 text-cyan-400 font-mono text-[10px] font-bold flex items-center justify-center shrink-0">
                      {step.step_index}
                    </span>
                    <span className="font-bold text-slate-200">{step.name}</span>
                  </div>
                  <div className="flex items-center gap-1 font-mono text-[10px] text-slate-400">
                    <Clock className="w-3 h-3 text-slate-500" />
                    <span>{step.execution_time_ms} ms</span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 pl-7 leading-relaxed">
                  {step.description}
                </p>
                <div className="pl-7 text-[10px] text-cyan-400/80 font-mono flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span>Engine: {step.model_name}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
