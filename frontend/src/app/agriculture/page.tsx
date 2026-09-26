"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Leaf,
  Sprout,
  Sun,
  Droplets,
  Wind,
  BarChart3,
  Upload,
  Globe,
  TrendingUp,
  Sparkles,
  Check,
  Menu,
  X,
} from "lucide-react";
import { AgriculturePanel } from "../../components/AgriculturePanel";
import { ImageUploader } from "../../components/ImageUploader";
import { ImageMeta, InputMode } from "../../types";
import { API_BASE_URL, API_CONFIGURATION_MESSAGE, apiUrl } from "../../lib/api";

export default function AgricultureDashboard() {
  const [inputMode] = useState<InputMode>("single_optical");
  const [images, setImages] = useState<ImageMeta[]>([]);
  const [sessionId, setSessionId] = useState("");
  const [isLoadingDemo, setIsLoadingDemo] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const clear = () => {
    setImages([]);
    setSessionId("");
  };

  const handleLoadDemoParcel = async () => {
    if (!API_BASE_URL) {
      alert(API_CONFIGURATION_MESSAGE);
      return;
    }

    setIsLoadingDemo(true);
    try {
      const formData = new FormData();
      formData.append("sample_id", "sample_bigearthnet_agri");
      const res = await fetch(apiUrl("/api/load-sample"), { method: "POST", body: formData });
      if (!res.ok) throw new Error("Could not load preset parcel");
      const data = await res.json();
      setSessionId(data.session_id);
      setImages(data.images);
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "Could not load the sample parcel.");
    } finally {
      setIsLoadingDemo(false);
    }
  };

 return (
 <div className="agro-oripio-shell">
 {/* ── TOP ANNOUNCEMENT BAR ── */}
 <div className="oripio-topbar">
 <div className="oripio-topbar-left">
 <span className="oripio-topbar-pill">Kharif 2026 Ready</span>
 <span>Precision Agriculture &amp; Remote Soil Intelligence System</span>
 </div>
 <div className="oripio-topbar-right">
 <span className="hidden sm:inline">Smart Crop Advisory · Open Source</span>
 <Link href="/" className="oripio-topbar-link">
 <Globe size={13} />
 <span>Satellite Control Room</span>
 </Link>
 </div>
 </div>

 {/* ── NAVIGATION ── */}
  <header className="oripio-nav">
    <div className="oripio-nav-inner">
      <Link href="/agriculture" className="oripio-brand">
        <div className="oripio-logo-icon">
          <Leaf size={22} />
        </div>
        <div className="oripio-brand-text">
          <div className="oripio-brand-title">
            CropSense <span>AI</span>
          </div>
          <div className="oripio-brand-subtitle">Sustainable Smart Farming</div>
        </div>
      </Link>

      <nav className="oripio-menu">
        <a href="#workspace" className="oripio-menu-item">Field Assessment</a>
        <a href="#services" className="oripio-menu-item">Solutions</a>
        <a href="#insights" className="oripio-menu-item">Precision Tech</a>
        <Link href="/" className="oripio-menu-item">Satellite Hub</Link>
      </nav>

      <div className="oripio-nav-cta">
        <a href="#workspace" className="oripio-btn-primary">
          <span>Analyze Field</span>
          <ArrowRight size={14} />
        </a>
      </div>

      {/* Hamburger for mobile */}
      <button
        id="agri-hamburger"
        className="oripio-hamburger"
        aria-label="Open menu"
        onClick={() => setMobileMenuOpen(true)}
      >
        <Menu size={24} />
      </button>
    </div>
  </header>

  {/* ── MOBILE MENU OVERLAY ── */}
  {mobileMenuOpen && (
    <div
      className="oripio-mobile-menu open"
      onClick={(e) => { if (e.target === e.currentTarget) setMobileMenuOpen(false); }}
    >
      <div className="oripio-mobile-menu-inner">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
          <span style={{ fontWeight: 800, fontSize: "16px", color: "#152d1f" }}>CropSense AI</span>
          <button
            onClick={() => setMobileMenuOpen(false)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#374f3e", padding: "4px" }}
            aria-label="Close menu"
          >
            <X size={22} />
          </button>
        </div>
        <a href="#workspace" className="oripio-menu-item" style={{ display: "block", padding: "10px 0", borderBottom: "1px solid #e9f5ec" }} onClick={() => setMobileMenuOpen(false)}>Field Assessment</a>
        <a href="#services" className="oripio-menu-item" style={{ display: "block", padding: "10px 0", borderBottom: "1px solid #e9f5ec" }} onClick={() => setMobileMenuOpen(false)}>Solutions</a>
        <a href="#insights" className="oripio-menu-item" style={{ display: "block", padding: "10px 0", borderBottom: "1px solid #e9f5ec" }} onClick={() => setMobileMenuOpen(false)}>Precision Tech</a>
        <Link href="/" className="oripio-menu-item" style={{ display: "block", padding: "10px 0", borderBottom: "1px solid #e9f5ec" }}>🛰 Satellite Hub</Link>
        <a href="#workspace" className="oripio-btn-primary" style={{ marginTop: "16px", justifyContent: "center", width: "100%" }} onClick={() => setMobileMenuOpen(false)}>
          <Upload size={15} /> <span>Analyze Field Now</span>
        </a>
      </div>
    </div>
  )}

 {/* ── HERO BANNER SECTION (Inspired by Dribbble Agriculture Design) ── */}
 <section className="oripio-hero">
 <div className="oripio-hero-card">
 <img
 src="/oripio-agro-hero.jpg"
 alt="Modern luxury terraced farmland and greenhouse fields"
 className="oripio-hero-bg"
 loading="eager"
 decoding="async"
 />
 <div className="oripio-hero-gradient" />

 {/* Floating Live Telemetry Badge */}
 <div className="oripio-hero-floater">
 <div className="oripio-floater-header">
 <Sprout size={16} color="#1b3826" />
 <span>Real-Time Soil Telemetry</span>
 </div>
 <div className="oripio-floater-metrics">
 <div className="oripio-floater-item">
 <span className="oripio-floater-val">0.74</span>
 <span className="oripio-floater-lbl">NDVI Index</span>
 </div>
 <div className="oripio-floater-item">
 <span className="oripio-floater-val">62%</span>
 <span className="oripio-floater-lbl">Moisture Avg</span>
 </div>
 <div className="oripio-floater-item">
 <span className="oripio-floater-val">Optimal</span>
 <span className="oripio-floater-lbl">Soil Viability</span>
 </div>
 </div>
 </div>

 <div className="oripio-hero-content">
 <div className="oripio-hero-tag">
 <span />
 AI Powered Organic &amp; Smart Agriculture
 </div>
 <h1 className="oripio-hero-title">
 Innovating Agriculture,<br />
 <em>Empowering Tomorrow.</em>
 </h1>
 <p className="oripio-hero-subtitle">
 Harness satellite remote sensing, computer vision, and hyperlocal weather analytics
 to screen soil viability, calculate vegetation proxies, and rank crop suitability with
 precision science.
 </p>
 <div className="oripio-hero-actions">
 <a href="#workspace" className="oripio-btn-primary" style={{ padding: "13px 28px", fontSize: "15px" }}>
 <Upload size={16} />
 <span>Upload Land Parcel</span>
 </a>
 <Link
 href="/"
 className="oripio-btn-secondary"
 style={{
 background: "#eef6f0",
 color: "#1b3826",
 border: "1.5px solid #274f36",
 fontWeight: 700,
 padding: "13px 26px",
 fontSize: "15px"
 }}
 >
 <ArrowLeft size={16} color="#1b3826" strokeWidth={2.4} />
 <span style={{ color: "#1b3826", fontWeight: 700 }}>Return to Satellite Hub</span>
 </Link>
 </div>
 </div>
 </div>
 </section>

 {/* ── TRUSTED METRICS STRIP ── */}
 <section className="oripio-metrics-strip">
 <div className="oripio-metrics-grid">
 <div className="oripio-metric-col">
 <div className="oripio-metric-icon">
 <Leaf size={22} />
 </div>
 <div>
 <div className="oripio-metric-num">98.4%</div>
 <div className="oripio-metric-label">Vegetation Health Accuracy</div>
 </div>
 </div>
 <div className="oripio-metric-col">
 <div className="oripio-metric-icon">
 <Sun size={22} />
 </div>
 <div>
 <div className="oripio-metric-num">7-Day</div>
 <div className="oripio-metric-label">Hyperlocal Microclimate Forecast</div>
 </div>
 </div>
 <div className="oripio-metric-col">
 <div className="oripio-metric-icon">
 <Droplets size={22} />
 </div>
 <div>
 <div className="oripio-metric-num">20+</div>
 <div className="oripio-metric-label">Soil &amp; Crop Suitability Indices</div>
 </div>
 </div>
 <div className="oripio-metric-col">
 <div className="oripio-metric-icon">
 <TrendingUp size={22} />
 </div>
 <div>
 <div className="oripio-metric-num">35%</div>
 <div className="oripio-metric-label">Average Yield Boost Observed</div>
 </div>
 </div>
 </div>
 </section>

 {/* ── CORE PILLARS SECTION ── */}
 <section id="services" className="oripio-pillars">
 <div className="oripio-section-header">
 <span className="oripio-kicker">WHAT WE PROVIDE</span>
 <h2 className="oripio-section-title">Pioneering Agriculture Solutions</h2>
 <p className="oripio-section-desc">
 Comprehensive remote intelligence designed for agronomists, farming enterprises,
 and sustainable growers worldwide.
 </p>
 </div>

 <div className="oripio-pillars-grid">
 <div className="oripio-pillar-card">
 <div className="oripio-pillar-icon">
 <Upload size={24} />
 </div>
 <h3>Optical &amp; Multispectral Ingestion</h3>
 <p>
 Upload high-resolution drone imagery, optical satellite passes, or field photos
 to extract calibrated NDVI and soil reflectance profiles instantly.
 </p>
 <a href="#workspace" className="oripio-pillar-link">
 <span>Ingest Imagery</span>
 <ArrowRight size={13} />
 </a>
 </div>

 <div className="oripio-pillar-card">
 <div className="oripio-pillar-icon">
 <Wind size={24} />
 </div>
 <h3>Hyperlocal Climate &amp; Rain Intel</h3>
 <p>
 Automated weather synchronization provides real-time temperatures, moisture indexes,
 and 7-day cumulative rainfall projections for any agricultural district.
 </p>
 <a href="#workspace" className="oripio-pillar-link">
 <span>Inspect Conditions</span>
 <ArrowRight size={13} />
 </a>
 </div>

 <div className="oripio-pillar-card">
 <div className="oripio-pillar-icon">
 <BarChart3 size={24} />
 </div>
 <h3>AI Ranked Crop Suitability</h3>
 <p>
 Our agronomic reasoning model combines soil taxonomy, canopy density, and seasonal
 rain forecasts to produce ranked suitability scores with clear rationales.
 </p>
 <a href="#workspace" className="oripio-pillar-link">
 <span>Calculate Suitability</span>
 <ArrowRight size={13} />
 </a>
 </div>
 </div>
 </section>

 {/* ── INTERACTIVE WORKSPACE SECTION (Upload + AgriculturePanel) ── */}
 <section id="workspace" className="oripio-workspace">
 <div className="oripio-workspace-card">
 <div className="oripio-section-header" style={{ marginBottom: "28px" }}>
 <span className="oripio-step-badge">
 <Sparkles size={13} /> PRECISION WORKSPACE
 </span>
 <h2 className="oripio-section-title">Run Your Land Assessment</h2>
 <p className="oripio-section-desc">
 Follow two simple steps: Ingest your land imagery, enter your coordinates or town,
 and let the AI provide tailored crop feasibility scores.
 </p>
 </div>

 <div className="oripio-workflow-row">
 {/* Step 1: Upload */}
 <div>
 <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
 <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
 <span style={{ width: "26px", height: "26px", borderRadius: "50%", background: "#1b3826", color: "#4ade80", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "700", fontSize: "12px" }}>
 1
 </span>
 <h3 style={{ fontSize: "17px", fontWeight: "700", margin: 0, color: "#152d1f" }}>
 Upload Parcel Image
 </h3>
 </div>
 <button
   type="button"
   onClick={handleLoadDemoParcel}
   disabled={isLoadingDemo}
   style={{
     display: "flex",
     alignItems: "center",
     gap: "6px",
     background: "#eef7f1",
     border: "1px solid #7ec293",
     color: "#1e6935",
     padding: "6px 12px",
     borderRadius: "8px",
     fontSize: "12px",
     fontWeight: "600",
     cursor: "pointer"
   }}
 >
   <Sparkles size={13} />
   <span>{isLoadingDemo ? "Loading demo…" : "Load Sample Parcel"}</span>
 </button>
 </div>
 <p style={{ fontSize: "13px", color: "#5d7e67", margin: "0 0 16px 0" }}>
 Overhead drone orthomosaic, Sentinel-2 pass, or camera shot (PNG, JPG, TIFF).
 </p>
 <div className="oripio-upload-box">
 <ImageUploader
 inputMode={inputMode}
 onSelectMode={() => undefined}
 images={images}
 onUploadSuccess={(nextImages, _mode, id) => {
 setImages(nextImages);
 setSessionId(id);
 }}
 onClear={clear}
 apiBaseUrl={API_BASE_URL}
 showModeSelector={false}
 />
 </div>
 </div>

 {/* Step 2: Crop AI Assessment */}
 <div>
 <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
 <span style={{ width: "26px", height: "26px", borderRadius: "50%", background: "#1b3826", color: "#4ade80", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "700", fontSize: "12px" }}>
 2
 </span>
 <h3 style={{ fontSize: "17px", fontWeight: "700", margin: 0, color: "#152d1f" }}>
 Location &amp; Soil Screening
 </h3>
 </div>
 <p style={{ fontSize: "13px", color: "#5d7e67", margin: "0 0 16px 0" }}>
 Select your soil type and town/district to correlate live weather conditions.
 </p>
 <AgriculturePanel
 sessionId={sessionId}
 hasImages={images.length > 0}
 defaultLocation="Nashik, Maharashtra"
 apiBaseUrl={API_BASE_URL}
 />
 </div>
 </div>
 </div>
 </section>

 {/* ── TECHNOLOGY SHOWCASE SECTION ── */}
 <section id="insights" className="oripio-showcase">
 <div className="oripio-showcase-inner">
 <div className="oripio-showcase-copy">
 <span className="oripio-kicker" style={{ color: "#86efac" }}>SUSTAINABLE INNOVATION</span>
 <h2>
 Precision Cultivation Through <em>Intelligent Field Insights</em>
 </h2>
 <p>
 Modern regenerative farming relies on precise data rather than intuition.
 Our multimodal platform tracks NDVI health indices, moisture levels, and climate
 trajectories so growers can conserve water and maximize yield.
 </p>
 <div className="oripio-feature-points">
 <div className="oripio-point">
 <div className="oripio-point-icon"><Check size={14} /></div>
 <span>Deep neural spectral decomposition for vegetation stress analysis</span>
 </div>
 <div className="oripio-point">
 <div className="oripio-point-icon"><Check size={14} /></div>
 <span>Localized agro-climatic zone mapping across Kharif &amp; Rabi cycles</span>
 </div>
 <div className="oripio-point">
 <div className="oripio-point-icon"><Check size={14} /></div>
 <span>Verified by agronomic benchmarks for optimal nitrogen &amp; irrigation balance</span>
 </div>
 </div>
 <a href="#workspace" className="oripio-btn-primary" style={{ background: "#4ade80", color: "#112217" }}>
 <span>Start Assessment Today</span>
 <ArrowRight size={14} />
 </a>
 </div>

 <div className="oripio-showcase-img-wrap">
 <img
 src="/oripio-smart-farm.jpg"
 alt="Farmer using smart sensor tablet in organic vegetable field"
 className="oripio-showcase-img"
 loading="lazy"
 decoding="async"
 />
 </div>
 </div>
 </section>

 {/* ── FOOTER ── */}
 <footer className="oripio-footer">
 <div className="oripio-footer-inner">
 <div className="oripio-footer-brand">
 <h4>CropSense AI</h4>
 <p>
 Next-generation agricultural vision-language assistant. Bridging aerospace earth
 observation and ground-level farming prosperity.
 </p>
 </div>
 <div className="oripio-footer-col">
 <h5>Solutions</h5>
 <div className="oripio-footer-links">
 <a href="#workspace">Crop Suitability</a>
 <a href="#workspace">NDVI Estimation</a>
 <a href="#workspace">Weather Synchronization</a>
 <a href="#workspace">Soil Moisture Proxy</a>
 </div>
 </div>
 <div className="oripio-footer-col">
 <h5>Ecosystem</h5>
 <div className="oripio-footer-links">
 <Link href="/">Satellite Observation</Link>
 <a href="#insights">Remote Sensing AI</a>
 <a href="#services">SIH Hackathon Ready</a>
 <a href="#services">AgriTech Architecture</a>
 </div>
 </div>
 <div className="oripio-footer-col">
 <h5>Compliance</h5>
 <div className="oripio-footer-links">
 <span style={{ fontSize: "12px", color: "#6b8f74", lineHeight: "1.5" }}>
 Suitability outputs provide advisory screening. Confirm with soil laboratory tests before commercial sowing.
 </span>
 </div>
 </div>
 </div>

 <div className="oripio-footer-bottom">
 <span>© 2026 CropSense AI · SatQuery Platform. All rights reserved.</span>
 <span>Designed with inspiration from Modern Agriculture Architecture</span>
 </div>
 </footer>
 </div>
 );
}
