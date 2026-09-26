"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  CloudSun, Droplets, LoaderCircle, MapPin,
  Sprout, Thermometer, Upload, Waves, X,
} from "lucide-react";
import { AgricultureResponse } from "../types";

interface AgriculturePanelProps {
  sessionId: string;
  hasImages: boolean;
  defaultLocation?: string;
  apiBaseUrl: string;
}

/* ──────────────────────────────────────────────────────────────────────────
   Canvas-based image analysis — mirrors Python agriculture_engine.py logic
   Runs entirely in the browser; no backend required.
   ────────────────────────────────────────────────────────────────────────── */
async function analyzeImagePixels(
  file: File
): Promise<{ vegetation: number; moisture: number; assessment: string }> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      // Downsample for speed (≤ 512 px on longest side)
      const MAX = 512;
      const scale = Math.min(MAX / img.width, MAX / img.height, 1);
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);

      const { data } = ctx.getImageData(0, 0, w, h);
      const totalPixels = w * h;
      let vegSum = 0;
      let darkCount = 0;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i] / 255;
        const g = data[i + 1] / 255;
        const b = data[i + 2] / 255;
        // green-channel dominance proxy (mirrors Python formula)
        vegSum += Math.min(1, Math.max(0, g - (r + b) / 2 + 0.5));
        if ((r + g + b) / 3 < 0.34) darkCount++;
      }

      const vegetation = Math.round((vegSum / totalPixels) * 100) / 100;
      const darkFraction = darkCount / totalPixels;
      const moisture = Math.min(
        1,
        Math.max(0, 0.28 + vegetation * 0.55 + darkFraction * 0.17)
      );

      const assessment =
        vegetation > 0.62
          ? "Dense vegetation signal detected — active crop cover or perennial canopy likely present."
          : vegetation > 0.45
          ? "Moderate vegetation signal — the parcel may support seasonal cropping with moisture management."
          : "Sparse vegetation signal — inspect soil cover and irrigation access before planting.";

      resolve({
        vegetation,
        moisture: Math.round(moisture * 100) / 100,
        assessment,
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      // Graceful fallback: neutral proxy values
      resolve({
        vegetation: 0.5,
        moisture: 0.5,
        assessment:
          "Image could not be decoded by the browser. Using neutral proxy values for crop scoring.",
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
        setLoadingMsg("Analysing image pixels…");
        const { vegetation, moisture, assessment } = await analyzeImagePixels(localImage!);

        // ── Step 2: call Netlify serverless function with real proxy values ──
        setLoadingMsg("Fetching live weather & scoring crops…");
        endpoint = "/api/agriculture-assessment";
        body = {
          location: location.trim(),
          soil_type: soilType,
          vegetation_proxy: vegetation,
          soil_moisture_proxy: moisture,
          land_assessment_override: assessment,
        };
      } else {
        // ── Python backend path ──
        setLoadingMsg("Assessing land…");
        endpoint = `${apiBaseUrl}/api/agriculture-assessment`;
        body = {
          session_id: sessionId,
          location: location.trim(),
          soil_type: soilType,
        };
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json();
      if (!response.ok)
        throw new Error(payload.detail || "Could not complete the agriculture assessment.");
      setResult(payload);
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
            <span>
              Vegetation proxy <b>{Math.round(result.vegetation_proxy * 100)}%</b>
            </span>
            <span>
              Moisture proxy <b>{Math.round(result.soil_moisture_proxy * 100)}%</b>
            </span>
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
