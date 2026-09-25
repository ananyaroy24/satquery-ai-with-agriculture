"use client";

import React, { useState, useRef } from "react";
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Layers, 
  Sliders, 
  SplitSquareVertical, 
  Crosshair, 
  Eye, 
  EyeOff,
  Maximize2
} from "lucide-react";
import { VisualEvidence, BoundingBox } from "../types";

interface CanvasViewerProps {
  visualEvidence?: VisualEvidence;
  apiBaseUrl: string;
  isPairMode?: boolean;
}

export const CanvasViewer: React.FC<CanvasViewerProps> = ({
  visualEvidence,
  apiBaseUrl,
  isPairMode = false
}) => {
  const [zoom, setZoom] = useState(1);
  const [activeLayer, setActiveLayer] = useState<"original" | "overlay" | "diff" | "fusion" | "split">("overlay");
  const [overlayOpacity, setOverlayOpacity] = useState(0.85);
  const [showBBoxes, setShowBBoxes] = useState(true);
  const [selectedBBox, setSelectedBBox] = useState<BoundingBox | null>(null);
  const [splitPos, setSplitPos] = useState(50); // percentage for split slider
  const [isDraggingSplit, setIsDraggingSplit] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const primaryUrl = visualEvidence?.primary_image_url 
    ? `${apiBaseUrl}${visualEvidence.primary_image_url}` 
    : null;

  const secondaryUrl = visualEvidence?.secondary_image_url 
    ? `${apiBaseUrl}${visualEvidence.secondary_image_url}` 
    : null;

  const overlayUrl = visualEvidence?.overlay_image_url 
    ? `${apiBaseUrl}${visualEvidence.overlay_image_url}` 
    : null;

  const diffUrl = visualEvidence?.diff_mask_url 
    ? `${apiBaseUrl}${visualEvidence.diff_mask_url}` 
    : null;

  const fusionUrl = visualEvidence?.fusion_image_url 
    ? `${apiBaseUrl}${visualEvidence.fusion_image_url}` 
    : null;

  const bboxes = visualEvidence?.bboxes || [];

  // Determine available layers
  const hasOverlay = !!overlayUrl;
  const hasDiff = !!diffUrl;
  const hasFusion = !!fusionUrl;
  const canSplit = !!(primaryUrl && (secondaryUrl || overlayUrl || diffUrl));

  const handleSplitMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingSplit || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    setSplitPos((x / rect.width) * 100);
  };

  if (!primaryUrl) {
    return (
      <div className="space-empty-state relative w-full aspect-video rounded-2xl glass-panel border border-slate-800 flex flex-col items-center justify-center p-8 text-center bg-radar-grid overflow-hidden">
        <div className="w-16 h-16 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-center text-slate-500 mb-3 animate-pulse">
          <Crosshair className="w-8 h-8 text-cyan-500/70" />
        </div>
        <h3 className="text-sm font-bold text-slate-300">Geo-Vision Canvas Ready</h3>
        <p className="text-xs text-slate-500 max-w-sm mt-1">
          Upload satellite imagery or select a demo scenario to activate multimodal AI spatial analysis.
        </p>
      </div>
    );
  }

  return (
    <div className="space-canvas relative w-full rounded-2xl glass-panel border border-slate-800/80 overflow-hidden shadow-2xl flex flex-col">
      {/* Canvas Top Bar Controls */}
      <div className="canvas-console flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-slate-900/90 border-b border-slate-800/80 text-xs">
        {/* Layer Toggles */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
          <span className="text-slate-500 font-semibold uppercase tracking-wider text-[10px] mr-1 hidden sm:inline">
            Layers:
          </span>

          <button
            onClick={() => setActiveLayer("original")}
            className={`px-2.5 py-1 rounded-md transition font-medium cursor-pointer ${
              activeLayer === "original"
                ? "bg-cyan-500 text-slate-950 font-bold glow-cyan"
                : "bg-slate-800/70 text-slate-300 hover:bg-slate-800"
            }`}
          >
            Raw Base
          </button>

          {hasOverlay && (
            <button
              onClick={() => setActiveLayer("overlay")}
              className={`px-2.5 py-1 rounded-md transition font-medium cursor-pointer ${
                activeLayer === "overlay"
                  ? "bg-cyan-500 text-slate-950 font-bold glow-cyan"
                  : "bg-slate-800/70 text-slate-300 hover:bg-slate-800"
              }`}
            >
              Evidence Overlay
            </button>
          )}

          {hasDiff && (
            <button
              onClick={() => setActiveLayer("diff")}
              className={`px-2.5 py-1 rounded-md transition font-medium cursor-pointer ${
                activeLayer === "diff"
                  ? "bg-amber-500 text-slate-950 font-bold"
                  : "bg-slate-800/70 text-slate-300 hover:bg-slate-800"
              }`}
            >
              Change Heatmap
            </button>
          )}

          {hasFusion && (
            <button
              onClick={() => setActiveLayer("fusion")}
              className={`px-2.5 py-1 rounded-md transition font-medium cursor-pointer ${
                activeLayer === "fusion"
                  ? "bg-indigo-500 text-white font-bold"
                  : "bg-slate-800/70 text-slate-300 hover:bg-slate-800"
              }`}
            >
              Optical-SAR Composite
            </button>
          )}

          {canSplit && (
            <button
              onClick={() => setActiveLayer("split")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition font-medium cursor-pointer ${
                activeLayer === "split"
                  ? "bg-emerald-500 text-slate-950 font-bold glow-emerald"
                  : "bg-slate-800/70 text-slate-300 hover:bg-slate-800"
              }`}
            >
              <SplitSquareVertical className="w-3 h-3" />
              Split Slider
            </button>
          )}
        </div>

        {/* Zoom & Overlay Opacity Controls */}
        <div className="flex items-center gap-3">
          {/* Opacity slider if active layer is overlay or diff */}
          {(activeLayer === "overlay" || activeLayer === "diff") && (
            <div className="flex items-center gap-2 text-slate-400">
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={overlayOpacity}
                onChange={(e) => setOverlayOpacity(parseFloat(e.target.value))}
                className="w-16 sm:w-20 accent-cyan-400 cursor-pointer"
                title={`Overlay Opacity: ${Math.round(overlayOpacity * 100)}%`}
              />
            </div>
          )}

          {/* Bounding Box Visibility Toggle */}
          {bboxes.length > 0 && (
            <button
              onClick={() => setShowBBoxes(!showBBoxes)}
              className={`p-1.5 rounded-md border transition cursor-pointer ${
                showBBoxes
                  ? "bg-cyan-950 text-cyan-400 border-cyan-700"
                  : "bg-slate-800 text-slate-500 border-slate-700"
              }`}
              title={showBBoxes ? "Hide bounding boxes" : "Show bounding boxes"}
            >
              {showBBoxes ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            </button>
          )}

          {/* Zoom buttons */}
          <div className="flex items-center rounded-lg bg-slate-800/80 border border-slate-700 p-0.5">
            <button
              onClick={() => setZoom((z) => Math.max(0.6, z - 0.2))}
              className="p-1 hover:text-cyan-400 text-slate-400 transition cursor-pointer"
              title="Zoom out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-1.5 font-mono text-[10px] text-slate-300">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom((z) => Math.min(2.5, z + 0.2))}
              className="p-1 hover:text-cyan-400 text-slate-400 transition cursor-pointer"
              title="Zoom in"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoom(1)}
              className="p-1 hover:text-cyan-400 text-slate-400 transition border-l border-slate-700 cursor-pointer"
              title="Reset view"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Interactive Stage */}
      <div
        ref={containerRef}
        onMouseMove={handleSplitMouseMove}
        onMouseUp={() => setIsDraggingSplit(false)}
        onMouseLeave={() => setIsDraggingSplit(false)}
        className="scan-stage relative w-full aspect-video min-h-[360px] md:min-h-[480px] bg-slate-950 flex items-center justify-center overflow-hidden select-none bg-radar-grid"
      >
        {/* Transform wrapper */}
        <div
          style={{ transform: `scale(${zoom})`, transition: "transform 0.15s ease-out" }}
          className="relative max-w-full max-h-full flex items-center justify-center"
        >
          {/* 1. Split Slider Mode */}
          {activeLayer === "split" ? (
            <div className="relative overflow-hidden rounded-lg shadow-2xl border border-slate-800">
              {/* Secondary or Overlay Image (Underneath) */}
              <img
                src={secondaryUrl || overlayUrl || diffUrl || primaryUrl}
                alt="After or Evidence"
                className="block max-w-full max-h-[70vh] object-contain"
                draggable={false}
              />

              {/* Primary Image (Clipped by split percentage) */}
              <div
                style={{ clipPath: `inset(0 ${100 - splitPos}% 0 0)` }}
                className="absolute inset-0"
              >
                <img
                  src={primaryUrl}
                  alt="Before or Base"
                  className="block max-w-full max-h-[70vh] object-contain"
                  draggable={false}
                />
              </div>

              {/* Draggable Divider Bar */}
              <div
                style={{ left: `${splitPos}%` }}
                onMouseDown={() => setIsDraggingSplit(true)}
                className="absolute top-0 bottom-0 w-1 bg-cyan-400 cursor-ew-resize z-20 flex items-center justify-center -translate-x-1/2 shadow-lg shadow-cyan-500/50"
              >
                <div className="w-6 h-6 rounded-full bg-cyan-400 text-slate-950 flex items-center justify-center shadow-md">
                  <SplitSquareVertical className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Badges */}
              <span className="absolute top-3 left-3 px-2 py-1 rounded bg-slate-950/80 text-cyan-300 font-mono text-[10px] font-bold border border-cyan-800 z-10">
                {isPairMode ? "T1: Pre-Development" : "Base Radiance"}
              </span>
              <span className="absolute top-3 right-3 px-2 py-1 rounded bg-slate-950/80 text-amber-300 font-mono text-[10px] font-bold border border-amber-800 z-10">
                {isPairMode ? "T2: Post-Development / Changed" : "Evidence Hotspot"}
              </span>
            </div>
          ) : (
            /* 2. Standard Layer Stacking Mode */
            <div className="relative overflow-hidden rounded-lg shadow-2xl border border-slate-800">
              {/* Base Image */}
              <img
                src={primaryUrl}
                alt="Primary Satellite"
                className="block max-w-full max-h-[70vh] object-contain"
                draggable={false}
              />

              {/* Overlay Layer (Grounding or Change Mask or Fusion) */}
              {activeLayer === "overlay" && overlayUrl && (
                <img
                  src={overlayUrl}
                  alt="Evidence Overlay"
                  style={{ opacity: overlayOpacity }}
                  className="absolute inset-0 w-full h-full object-contain pointer-events-none transition-opacity"
                />
              )}

              {activeLayer === "diff" && diffUrl && (
                <img
                  src={diffUrl}
                  alt="Difference Heatmap"
                  style={{ opacity: overlayOpacity }}
                  className="absolute inset-0 w-full h-full object-contain pointer-events-none transition-opacity"
                />
              )}

              {activeLayer === "fusion" && fusionUrl && (
                <img
                  src={fusionUrl}
                  alt="Optical-SAR Fusion"
                  className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                />
              )}

              {/* Interactive Bounding Box Click Targets */}
              {showBBoxes && (
                <div className="absolute inset-0 pointer-events-none">
                  {bboxes.map((b, i) => {
                    const [ymin, xmin, ymax, xmax] = b.box_2d;
                    const top = `${ymin / 10}%`;
                    const left = `${xmin / 10}%`;
                    const height = `${(ymax - ymin) / 10}%`;
                    const width = `${(xmax - xmin) / 10}%`;

                    return (
                      <div
                        key={i}
                        onClick={() => setSelectedBBox(b)}
                        style={{
                          top,
                          left,
                          height,
                          width,
                          borderColor: b.color || "#00F0FF"
                        }}
                        className="absolute border-2 rounded-sm pointer-events-auto cursor-pointer hover:bg-cyan-500/20 transition group"
                      >
                        <span
                          style={{ backgroundColor: b.color || "#00F0FF" }}
                          className="absolute -top-5 left-0 px-1.5 py-0.5 rounded text-[10px] font-bold text-slate-950 uppercase tracking-tight shadow-md whitespace-nowrap"
                        >
                          {b.label} ({Math.round(b.confidence * 100)}%)
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Selected Bounding Box Details Modal / Floating Badge */}
        {selectedBBox && (
          <div className="absolute bottom-4 left-4 z-30 p-3 rounded-xl bg-slate-900/95 border border-cyan-500 text-xs shadow-2xl backdrop-blur-md max-w-xs">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="font-bold text-cyan-300">{selectedBBox.label}</span>
              <button
                onClick={() => setSelectedBBox(null)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>
            <div className="space-y-1 text-slate-300 text-[11px]">
              <div>Category: <span className="font-semibold text-slate-100">{selectedBBox.category || "Feature"}</span></div>
              <div>Localization Confidence: <span className="font-mono text-emerald-400 font-bold">{Math.round(selectedBBox.confidence * 100)}%</span></div>
              {selectedBBox.area_hectares && (
                <div>Estimated Footprint: <span className="font-mono text-amber-300">{selectedBBox.area_hectares} ha</span></div>
              )}
              <div className="text-[10px] text-slate-500 font-mono">
                Extents: [{selectedBBox.box_2d.join(", ")}]
              </div>
            </div>
          </div>
        )}

        {/* Bottom Status Bar */}
        <div className="absolute top-3 left-3 z-10 mission-readout text-[9px] font-mono text-cyan-100/80">
          <span>ORBIT: LEO-07</span><span>LINK: NOMINAL</span><span>SCAN: ACTIVE</span>
        </div>
        <div className="absolute bottom-2 right-3 z-10 flex items-center gap-2 text-[10px] font-mono text-slate-400 bg-slate-900/80 px-2.5 py-1 rounded-md border border-slate-800 backdrop-blur-xs">
          <span>WGS-84 Projection</span>
          <span>•</span>
          <span className="text-cyan-400 font-semibold">10m GSD</span>
          <span>•</span>
          <span>{bboxes.length} Target{bboxes.length === 1 ? "" : "s"} Grounded</span>
        </div>
      </div>
    </div>
  );
};
