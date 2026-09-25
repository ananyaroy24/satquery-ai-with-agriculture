"use client";

import React, { useRef, useState } from "react";
import { 
  Upload, 
  Layers, 
  Radar, 
  Clock, 
  Combine, 
  CheckCircle2, 
  AlertCircle, 
  Trash2,
  FileText,
  Info
} from "lucide-react";
import { InputMode, ImageMeta } from "../types";

interface ImageUploaderProps {
  inputMode: InputMode;
  onSelectMode: (mode: InputMode) => void;
  images: ImageMeta[];
  onUploadSuccess: (newImages: ImageMeta[], mode: InputMode, sessionId: string) => void;
  onClear: () => void;
  apiBaseUrl: string;
  showModeSelector?: boolean;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  inputMode,
  onSelectMode,
  images,
  onUploadSuccess,
  onClear,
  apiBaseUrl,
  showModeSelector = true
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const modeOptions: { id: InputMode; label: string; icon: any; hint: string; filesNeeded: number }[] = [
    { 
      id: "single_optical", 
      label: "Single Optical", 
      icon: Layers, 
      hint: "Sentinel-2, Landsat, Planet (RGB/NIR)",
      filesNeeded: 1
    },
    { 
      id: "single_sar", 
      label: "Single SAR", 
      icon: Radar, 
      hint: "Sentinel-1 C-Band (VV/VH backscatter)",
      filesNeeded: 1
    },
    { 
      id: "bitemporal_pair", 
      label: "Bi-Temporal Pair", 
      icon: Clock, 
      hint: "Same location: Time 1 vs Time 2",
      filesNeeded: 2
    },
    { 
      id: "optical_sar_pair", 
      label: "Optical + SAR Pair", 
      icon: Combine, 
      hint: "Co-incident Sentinel-1 + Sentinel-2",
      filesNeeded: 2
    }
  ];

  const currentMode = modeOptions.find((m) => m.id === inputMode) || modeOptions[0];

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setUploadError(null);

    if (fileList.length !== currentMode.filesNeeded) {
      setUploadError(
        `Mode '${currentMode.label}' requires exactly ${currentMode.filesNeeded} file(s). You selected ${fileList.length}.`
      );
      return;
    }

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append("input_mode", inputMode);
      for (let i = 0; i < fileList.length; i++) {
        formData.append("files", fileList[i]);
      }

      const res = await fetch(`${apiBaseUrl}/api/upload`, {
        method: "POST",
        body: formData
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Failed to upload and validate imagery");
      }

      const data = await res.json();
      onUploadSuccess(data.images, inputMode, data.session_id);
    } catch (err: any) {
      setUploadError(err.message || "An unexpected error occurred during upload.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  };

  return (
    <div className={`space-y-4 ${showModeSelector ? "" : "agriculture-image-uploader"}`}>
      {/* Input Mode Selector Tabs */}
      {showModeSelector && <div>
        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
          Earth Observation Modality
        </label>
        <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-900/90 border border-slate-800">
          {modeOptions.map((opt) => {
            const Icon = opt.icon;
            const isSelected = inputMode === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => {
                  onSelectMode(opt.id);
                  setUploadError(null);
                }}
                className={`flex items-center gap-2 p-2.5 rounded-lg text-left transition ${
                  isSelected
                    ? "bg-gradient-to-r from-cyan-950/80 to-slate-900 text-cyan-300 border border-cyan-700/80 shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isSelected ? "text-cyan-400" : "text-slate-500"}`} />
                <div className="min-w-0">
                  <div className="text-xs font-semibold truncate">{opt.label}</div>
                  <div className="text-[10px] text-slate-500 truncate">{opt.hint}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>}

      {/* Upload Zone / Active Preview */}
      {images.length === 0 ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-xl p-6 text-center transition cursor-pointer ${
            dragActive
              ? "border-cyan-400 bg-cyan-950/20"
              : "border-slate-700 hover:border-cyan-500/80 bg-slate-900/40 hover:bg-slate-900/70"
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            multiple={currentMode.filesNeeded > 1}
            accept=".tif,.tiff,.geotiff,.png,.jpg,.jpeg"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <div className="flex flex-col items-center justify-center gap-2.5">
            <div className="w-12 h-12 rounded-full bg-cyan-950/60 border border-cyan-800/80 flex items-center justify-center text-cyan-400">
              <Upload className="w-6 h-6 animate-bounce" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-200">
                {isUploading ? "Verifying Raster Geometry..." : `Upload ${currentMode.label}`}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Drag & drop {currentMode.filesNeeded} image{currentMode.filesNeeded > 1 ? "s" : ""} or click to browse
              </p>
            </div>
            <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
              <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700">GeoTIFF</span>
              <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700">TIFF</span>
              <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700">PNG</span>
              <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700">JPEG</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Verified Ingestion ({images.length} item{images.length > 1 ? "s" : ""})
            </span>
            <button
              onClick={onClear}
              className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 transition cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
              Reset
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {images.map((img, idx) => (
              <div
                key={idx}
                className="group relative rounded-xl overflow-hidden bg-slate-900 border border-slate-800 p-2 text-xs"
              >
                <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-slate-950 mb-2">
                  <img
                    src={`${apiBaseUrl}${img.url}`}
                    alt={img.filename}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                  <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-950/80 text-cyan-300 border border-cyan-800/80 backdrop-blur-xs">
                    {img.role}
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="font-semibold text-slate-200 truncate" title={img.filename}>
                    {img.filename}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>{img.width} × {img.height} px</span>
                    <span className="text-cyan-400 font-mono">~{img.estimated_gsd_meters}m GSD</span>
                  </div>
                  <div className="text-[10px] text-slate-500 truncate" title={img.sensor_type}>
                    {img.sensor_type}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Validation Error Banner */}
      {uploadError && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-red-950/40 border border-red-800/60 text-xs text-red-300">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
          <div>
            <span className="font-semibold">Validation Error:</span> {uploadError}
          </div>
        </div>
      )}
    </div>
  );
};
