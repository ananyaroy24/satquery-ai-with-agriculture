"use client";

import React, { useEffect, useState } from "react";
import { CloudSun, Droplets, LoaderCircle, MapPin, Sprout, Thermometer, Waves } from "lucide-react";
import { AgricultureResponse } from "../types";

interface AgriculturePanelProps {
  sessionId: string;
  hasImages: boolean;
  defaultLocation?: string;
  apiBaseUrl: string;
}

export const AgriculturePanel: React.FC<AgriculturePanelProps> = ({ sessionId, hasImages, defaultLocation = "", apiBaseUrl }) => {
  const [location, setLocation] = useState(defaultLocation);
  const [soilType, setSoilType] = useState("Loamy");
  const [result, setResult] = useState<AgricultureResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // true when running on Netlify without a Python backend configured
  const netlifyMode = !apiBaseUrl;

  useEffect(() => { if (defaultLocation) setLocation(defaultLocation); }, [defaultLocation]);
  useEffect(() => { setResult(null); setError(""); }, [sessionId]);

  const assess = async () => {
    if (!netlifyMode && !sessionId) {
      setError("Upload land imagery before starting a crop assessment.");
      return;
    }
    if (!netlifyMode && !hasImages) {
      setError("Upload land imagery before starting a crop assessment.");
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
      let body: Record<string, string>;

      if (netlifyMode) {
        // Use Netlify serverless function — no backend required
        endpoint = "/api/agriculture-assessment";
        body = { location: location.trim(), soil_type: soilType };
      } else {
        // Use configured Python backend
        endpoint = `${apiBaseUrl}/api/agriculture-assessment`;
        body = { session_id: sessionId, location: location.trim(), soil_type: soilType };
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.detail || "Could not complete the agriculture assessment.");
      setResult(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not complete the agriculture assessment.");
    } finally {
      setLoading(false);
    }
  };

  return <section className="agri-panel" aria-labelledby="agriculture-title">
    <div className="agri-heading"><div><span>LAND INTELLIGENCE</span><h2 id="agriculture-title"><Sprout /> Agriculture assessment</h2></div><p>Use {netlifyMode ? "a location-based weather lookup" : "land imagery plus a location-based weather lookup"} to screen crop options.{netlifyMode && <span style={{ display: "block", fontSize: "12px", color: "#6b8f74", marginTop: "4px" }}>💡 Connect a backend for full image-based NDVI analysis.</span>}</p></div>
    <div className="agri-form"><label><MapPin /> Parcel location<input value={location} onChange={event => setLocation(event.target.value)} placeholder="e.g. Nashik, Maharashtra" aria-label="Parcel location" /></label><label className="soil-select"><Waves /> Soil type<select value={soilType} onChange={event => setSoilType(event.target.value)} aria-label="Soil type"><option>Loamy</option><option>Sandy loam</option><option>Clay loam</option><option>Clay</option><option>Sandy</option><option>Silty</option><option>Black cotton</option></select></label><button onClick={assess} disabled={loading}>{loading ? <LoaderCircle className="animate-spin" /> : <Sprout />}{loading ? "Assessing land…" : "Assess land"}</button></div>
    {error && <p className="agri-error">{error}</p>}
    {result && <div className="agri-result">
      <div className="weather-row"><div><MapPin /><span><b>{result.location}</b><small>{result.weather_source}</small></span></div>{result.weather_available ? <><div><Thermometer /><span><b>{result.temperature_c}°C</b><small>temperature</small></span></div><div><Droplets /><span><b>{result.humidity_percent}%</b><small>humidity</small></span></div><div><CloudSun /><span><b>{result.forecast_rainfall_mm} mm</b><small>7-day rain</small></span></div></> : <p>Weather unavailable. Crop ranking is based on image proxies only.</p>}</div>
      <p className="land-summary">{result.land_assessment}</p>
      <div className="proxy-row"><span>Vegetation proxy <b>{Math.round(result.vegetation_proxy * 100)}%</b></span><span>Moisture proxy <b>{Math.round(result.soil_moisture_proxy * 100)}%</b></span><span>Soil type <b>{result.soil_type}</b></span></div>
      <div className="crop-list">{result.crops.map(crop => <article key={crop.crop}><div><b>{crop.crop}</b><small>{crop.condition}</small></div><strong>{crop.score}<sup>%</sup></strong><p>{crop.rationale}</p></article>)}</div>
      <p className="agri-disclaimer">{result.disclaimer}</p>
    </div>}
  </section>;
};
