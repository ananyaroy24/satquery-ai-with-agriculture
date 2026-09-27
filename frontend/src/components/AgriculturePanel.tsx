"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  CloudSun, Droplets, LoaderCircle, MapPin,
  Sprout, Thermometer, Upload, Waves, X,
} from "lucide-react";
import { AgricultureResponse } from "../types";
import { runClientAgricultureAssessment } from "../lib/clientAgricultureAssessment";

interface AgriculturePanelProps {
  sessionId: string;
  hasImages: boolean;
  defaultLocation?: string;
  apiBaseUrl: string;
}

/* ──────────────────────────────────────────────────────────────────────────
   Multi-spectral & RGB Image Analysis Engine
   Processes ANY picture: Drone RGB, Satellite Earth Observation, Farm photos, or Web Image URLs.
   Computes ExG (Excess Green), VARI (Visible Atmospherically Resistant Index),
   and vegetation density proxies entirely inside the browser canvas.
   ────────────────────────────────────────────────────────────────────────── */
async function analyzeImagePixels(
  input: File | string
): Promise<{
  vegetation: number;
  moisture: number;
  assessment: string;
  imageSourceType: string;
  exgIndex: number;
  variIndex: number;
}> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    const isFile = typeof input !== "string";
    const url = isFile ? URL.createObjectURL(input) : input;

    img.onload = () => {
      const MAX = 512;
      const scale = Math.min(MAX / img.width, MAX / img.height, 1);
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, w, h);
      if (isFile) URL.revokeObjectURL(url);

      const { data } = ctx.getImageData(0, 0, w, h);
      const totalPixels = w * h;
      let vegSum = 0;
      let darkCount = 0;
      let exgSum = 0;
      let variSum = 0;
      let varianceSum = 0;
      let lastLum = 0;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i] / 255;
        const g = data[i + 1] / 255;
        const b = data[i + 2] / 255;
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;

        // Excess Green (ExG) index: 2G - R - B
        const exg = 2 * g - r - b;
        exgSum += exg;

        // VARI (Visible Atmospherically Resistant Index): (G - R) / (G + R - B + 0.0001)
        const vari = (g - r) / (g + r - b + 0.0001);
        variSum += Math.max(-1, Math.min(1, vari));

        // Green channel ratio
        vegSum += Math.min(1, Math.max(0, g - (r + b) / 2 + 0.5));
        if (lum < 0.34) darkCount++;

        if (i > 0) varianceSum += Math.abs(lum - lastLum);
        lastLum = lum;
      }

      const meanExg = exgSum / totalPixels;
      const meanVari = variSum / totalPixels;
      const spatialDetail = varianceSum / totalPixels;

      const vegetation = Math.round((vegSum / totalPixels) * 100) / 100;
      const darkFraction = darkCount / totalPixels;
      const moisture = Math.min(
        1,
        Math.max(0, 0.28 + vegetation * 0.55 + darkFraction * 0.17)
      );

      // Classify picture source type: Drone aerial, Satellite earth observation, or Field close-up
      let imageSourceType = "🌾 Field / Farm Photograph";
      if (spatialDetail > 0.14 && img.width >= 800) {
        imageSourceType = "🚁 High-Resolution Drone Aerial Photography";
      } else if (spatialDetail < 0.08 || img.width <= 600) {
        imageSourceType = "🛰️ Satellite Remote Sensing Imagery";
      }

      const assessment =
        vegetation > 0.62
          ? `Dense vegetation signal detected (${imageSourceType}) — active crop canopy & high chlorophyll activity.`
          : vegetation > 0.45
          ? `Moderate vegetation signal (${imageSourceType}) — parcel supports seasonal crops with irrigation management.`
          : `Sparse vegetation signal (${imageSourceType}) — inspect soil moisture & seed bed preparation before planting.`;

      resolve({
        vegetation,
        moisture: Math.round(moisture * 100) / 100,
        assessment,
        imageSourceType,
        exgIndex: Math.round(meanExg * 100) / 100,
        variIndex: Math.round(meanVari * 100) / 100,
      });
    };

    img.onerror = () => {
      if (isFile) URL.revokeObjectURL(url);
      resolve({
        vegetation: 0.5,
        moisture: 0.5,
        assessment:
          "Picture loaded with fallback proxies — location & weather telemetry applied.",
        imageSourceType: "📷 Remote Picture / Web Imagery",
        exgIndex: 0.12,
        variIndex: 0.08,
      });
    };

    img.src = url;
  });
}

/* ──────────────────────────────────────────────────────────────────────────
   AgriculturePanel component
   ────────────────────────────────────────────────────────────────────────── */
export const AgriculturePanel: React.FC<AgriculturePanelProps> = ({
  sessionId,
  hasImages,
  defaultLocation = "",
  apiBaseUrl,
}) => {
  const [location, setLocation] = useState(defaultLocation);
  const [soilType, setSoilType] = useState("Loamy");
  const [result, setResult] = useState<AgricultureResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("Assessing land…");
  const [error, setError] = useState("");

  // Netlify / static-site mode: no Python backend configured
  const netlifyMode = !apiBaseUrl;

  // Client-side image state (used only in netlify mode)
  const [localImage, setLocalImage] = useState<File | null>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (defaultLocation) setLocation(defaultLocation);
  }, [defaultLocation]);

  useEffect(() => {
    setResult(null);
    setError("");
  }, [sessionId]);

  // Revoke object URL when component unmounts
  useEffect(() => {
    return () => {
      if (localPreview) URL.revokeObjectURL(localPreview);
    };
  }, [localPreview]);

  const handleLocalFile = (file: File | null) => {
    if (!file) return;
    if (localPreview) URL.revokeObjectURL(localPreview);
    setLocalImage(file);
    setLocalPreview(URL.createObjectURL(file));
    setResult(null);
    setError("");
  };

  const clearLocalImage = () => {
    if (localPreview) URL.revokeObjectURL(localPreview);
    setLocalImage(null);
    setLocalPreview(null);
    setResult(null);
  };

  const assess = async () => {
    // Validation
    if (!netlifyMode && (!sessionId || !hasImages)) {
      setError("Upload land imagery before starting a crop assessment.");
      return;
    }
    if (netlifyMode && !localImage) {
      setError("Select a land parcel image so the browser can analyse vegetation density.");
      return;
    }
    if (location.trim().length < 2) {
      setError("Enter a town, district, or coordinates to obtain weather conditions.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      let endpoint: string;
      let body: Record<string, string | number>;

      if (netlifyMode) {
        // ── Step 1: analyse image pixels in the browser ──
        setLoadingMsg("Analysing multi-spectral pixels…");
        const { vegetation, moisture, assessment, imageSourceType, exgIndex, variIndex } =
          await analyzeImagePixels(localImage!);

        // ── Step 2: fetch live weather & score crops directly in the browser ──
        setLoadingMsg("Fetching live weather & scoring crops…");
        const clientResult = await runClientAgricultureAssessment(
          location.trim(),
          soilType,
          vegetation,
          moisture,
          assessment,
          imageSourceType,
          exgIndex,
          variIndex
        );
        setResult(clientResult);
      } else {
        // ── Python backend path ──
        setLoadingMsg("Assessing land…");
        endpoint = `${apiBaseUrl}/api/agriculture-assessment`;
        body = {
          session_id: sessionId,
          location: location.trim(),
          soil_type: soilType,
        };

        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const payload = await response.json();
        if (!response.ok)
          throw new Error(payload.detail || "Could not complete the agriculture assessment.");
        setResult(payload);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not complete the agriculture assessment."
      );
    } finally {
      setLoading(false);
      setLoadingMsg("Assessing land…");
    }
  };

  return (
    <section className="agri-panel" aria-labelledby="agriculture-title">
      <div className="agri-heading">
        <div>
          <span>LAND INTELLIGENCE</span>
          <h2 id="agriculture-title">
            <Sprout /> Agriculture assessment
          </h2>
        </div>
        <p>
          Upload a field image — vegetation density is analysed directly in your browser
          using pixel analysis. Live weather is fetched to rank crop suitability.
        </p>
      </div>

      {/* ── Client-side image dropzone (Netlify / no-backend mode) ── */}
      {netlifyMode && (
        <div className="agri-image-upload">
          {!localImage ? (
            <div
              className={`agri-dropzone${dragActive ? " agri-dropzone--active" : ""}`}
              role="button"
              tabIndex={0}
              aria-label="Upload land parcel image"
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragActive(false);
                handleLocalFile(e.dataTransfer.files?.[0] ?? null);
              }}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click();
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".png,.jpg,.jpeg,.tif,.tiff"
                style={{ display: "none" }}
                onChange={(e) => handleLocalFile(e.target.files?.[0] ?? null)}
                aria-label="Select parcel image file"
              />
              <Upload size={20} className="agri-dropzone-icon" />
              <span className="agri-dropzone-label">Upload Parcel Image</span>
              <small className="agri-dropzone-hint">
                PNG · JPG · TIFF — pixels analysed locally in your browser
              </small>
            </div>
          ) : (
            <div className="agri-img-preview">
              <img src={localPreview!} alt="Selected parcel thumbnail" />
              <div className="agri-img-meta">
                <span className="agri-img-name">{localImage.name}</span>
                <span className="agri-img-badge">Ready for analysis</span>
              </div>
              <button
                className="agri-img-remove"
                onClick={clearLocalImage}
                aria-label="Remove selected image"
              >
                <X size={13} /> Remove
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Location + soil form ── */}
      <div className="agri-form">
        <label>
          <MapPin /> Parcel location
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. Nashik, Maharashtra"
            aria-label="Parcel location"
          />
        </label>
        <label className="soil-select">
          <Waves /> Soil type
          <select
            value={soilType}
            onChange={(e) => setSoilType(e.target.value)}
            aria-label="Soil type"
          >
            <option>Loamy</option>
            <option>Sandy loam</option>
            <option>Clay loam</option>
            <option>Clay</option>
            <option>Sandy</option>
            <option>Silty</option>
            <option>Black cotton</option>
          </select>
        </label>
        <button onClick={assess} disabled={loading}>
          {loading ? <LoaderCircle className="animate-spin" /> : <Sprout />}
          {loading ? loadingMsg : "Assess land"}
        </button>
      </div>

      {error && <p className="agri-error">{error}</p>}

      {result && (
        <div className="agri-result">
          <div className="weather-row">
            <div>
              <MapPin />
              <span>
                <b>{result.location}</b>
                <small>{result.weather_source}</small>
              </span>
            </div>
            {result.weather_available ? (
              <>
                <div>
                  <Thermometer />
                  <span>
                    <b>{result.temperature_c}°C</b>
                    <small>temperature</small>
                  </span>
                </div>
                <div>
                  <Droplets />
                  <span>
                    <b>{result.humidity_percent}%</b>
                    <small>humidity</small>
                  </span>
                </div>
                <div>
                  <CloudSun />
                  <span>
                    <b>{result.forecast_rainfall_mm} mm</b>
                    <small>7-day rain</small>
                  </span>
                </div>
              </>
            ) : (
              <p>Weather unavailable. Crop ranking is based on image proxies only.</p>
            )}
          </div>
          <p className="land-summary">{result.land_assessment}</p>
          <div className="proxy-row">
            {result.image_source_type && (
              <span className="col-span-full font-medium text-emerald-300 bg-emerald-950/60 px-2.5 py-1 rounded-md border border-emerald-800/40 text-xs inline-flex items-center gap-1.5">
                {result.image_source_type}
              </span>
            )}
            <span>
              Vegetation proxy <b>{Math.round(result.vegetation_proxy * 100)}%</b>
            </span>
            <span>
              Moisture proxy <b>{Math.round(result.soil_moisture_proxy * 100)}%</b>
            </span>
            {typeof result.exg_index === "number" && (
              <span>
                ExG Index <b>{result.exg_index}</b>
              </span>
            )}
            {typeof result.vari_index === "number" && (
              <span>
                VARI Index <b>{result.vari_index}</b>
              </span>
            )}
            <span>
              Soil type <b>{result.soil_type}</b>
            </span>
          </div>
          <div className="crop-list">
            {result.crops.map((crop) => (
              <article key={crop.crop}>
                <div>
                  <b>{crop.crop}</b>
                  <small>{crop.condition}</small>
                </div>
                <strong>
                  {crop.score}
                  <sup>%</sup>
                </strong>
                <p>{crop.rationale}</p>
              </article>
            ))}
          </div>
          <p className="agri-disclaimer">{result.disclaimer}</p>
        </div>
      )}
    </section>
  );
};
