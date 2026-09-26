"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Navbar } from "../components/Navbar";
import { ImageUploader } from "../components/ImageUploader";
import { ExecutionTraceView } from "../components/ExecutionTraceView";
import { ChatPanel, ChatMessage } from "../components/ChatPanel";
import {
  InputMode,
  ImageMeta,
  SampleDatasetItem,
  QueryResponse
} from "../types";
import {
  Info,
  MapPin,
  Calendar,
  Layers,
  FileDown,
  Satellite,
  Globe,
  Radio,
  Activity,
  ChevronRight,
  Zap,
  Eye,
  Target,
  Cpu,
  Sparkles,
  X,
  BookOpen,
} from "lucide-react";

const API_BASE = typeof window !== "undefined" ? `${window.location.protocol}//${window.location.hostname}:8000` : "http://localhost:8000";

const SYSTEM_STATS = [
  { label: "Satellites Online", value: "847", unit: "", icon: Satellite, color: "sol-stat-cyan" },
  { label: "Coverage", value: "98.4", unit: "%", icon: Globe, color: "sol-stat-purple" },
  { label: "Data Rate", value: "12.8", unit: "GB/s", icon: Activity, color: "sol-stat-green" },
  { label: "Uptime", value: "99.97", unit: "%", icon: Radio, color: "sol-stat-amber" },
];

export default function Home() {
  const [samples, setSamples] = useState<SampleDatasetItem[]>([]);
  const [selectedSampleId, setSelectedSampleId] = useState<string>("");
  const [inputMode, setInputMode] = useState<InputMode>("single_optical");
  const [sessionId, setSessionId] = useState<string>("");
  const [images, setImages] = useState<ImageMeta[]>([]);
  const [activeSample, setActiveSample] = useState<SampleDatasetItem | null>(null);
  const [currentResult, setCurrentResult] = useState<QueryResponse | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [activePanel, setActivePanel] = useState<"upload" | "chat" | "trace">("upload");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/api/sample-datasets`)
      .then((res) => res.json())
      .then((data: unknown) => {
        const availableSamples = Array.isArray(data) ? data as SampleDatasetItem[] : [];
        setSamples(availableSamples);
        if (availableSamples.length > 0) handleSelectSample(availableSamples[0].id, availableSamples);
      })
      .catch((err) => console.error("Could not fetch samples:", err));
  }, []);

  const handleSelectSample = async (sampleId: string, availableSamples = samples) => {
    setSelectedSampleId(sampleId);
    if (!sampleId) return;
    const sample = availableSamples.find((s) => s.id === sampleId);
    if (!sample) return;
    setActiveSample(sample);
    setInputMode(sample.input_mode);
    try {
      const formData = new FormData();
      formData.append("sample_id", sampleId);
      const res = await fetch(`${API_BASE}/api/load-sample`, { method: "POST", body: formData });
      if (!res.ok) throw new Error("Failed to load preset");
      const data = await res.json();
      setSessionId(data.session_id);
      setImages(data.images);
      setCurrentResult(null);
      setMessages([{ id: `msg_welcome_${Date.now()}`, sender: "assistant", content: `🛰️ **Satellite Dataset Loaded: ${sample.title}**\n\n${sample.description}\n\n• **Sensor**: ${sample.sensor_details}\n• **Location**: ${sample.location}\n• **Acquisition**: ${sample.acquisition_dates.join(", ")}\n\nYou can ask any question below, or click one of the suggested prompts to start reasoning!`, timestamp: new Date().toLocaleTimeString() }]);
    } catch (err) { console.error("Error loading sample:", err); }
  };

  const handleUploadSuccess = (newImages: ImageMeta[], mode: InputMode, newSessionId: string) => {
    setImages(newImages); setInputMode(mode); setSessionId(newSessionId);
    setActiveSample(null); setSelectedSampleId(""); setCurrentResult(null);
    setMessages([{ id: `msg_upload_${Date.now()}`, sender: "assistant", content: `✅ **Successfully Ingested ${newImages.length} Image(s)**\nMode: \`${mode}\` • Resolution: ${newImages[0].width}×${newImages[0].height} px.\nWhat would you like to analyze?`, timestamp: new Date().toLocaleTimeString() }]);
  };

  const handleClear = () => { setImages([]); setCurrentResult(null); setSessionId(""); setActiveSample(null); setSelectedSampleId(""); setMessages([]); };

  const handleSendMessage = async (queryText: string) => {
    if (images.length === 0) { alert("Please upload imagery or load a demo scenario first!"); return; }
    setMessages((prev) => [...prev, { id: `msg_user_${Date.now()}`, sender: "user", content: queryText, timestamp: new Date().toLocaleTimeString() }]);
    setIsProcessing(true);
    setActivePanel("chat");
    try {
      const res = await fetch(`${API_BASE}/api/query`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query: queryText, input_mode: inputMode, session_id: sessionId }) });
      if (!res.ok) { const err = await res.json(); throw new Error(err.detail || "Query execution failed"); }
      const result: QueryResponse = await res.json();
      setCurrentResult(result);
      setMessages((prev) => [...prev, { id: `msg_asst_${Date.now()}`, sender: "assistant", content: result.answer, timestamp: new Date().toLocaleTimeString(), queryResponse: result }]);
    } catch (err: any) {
      setMessages((prev) => [...prev, { id: `msg_err_${Date.now()}`, sender: "assistant", content: `⚠️ **Processing Error**: ${err.message || "Failed to process query."}`, timestamp: new Date().toLocaleTimeString() }]);
    } finally { setIsProcessing(false); }
  };

  const handleDownloadReport = async () => {
    if (!currentResult || !sessionId) return;
    setIsGeneratingReport(true);
    try {
      const res = await fetch(`${API_BASE}/api/generate-report`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ session_id: sessionId, query: messages.filter((m) => m.sender === "user").slice(-1)[0]?.content || "Remote Sensing Analysis", answer: currentResult.answer, detected_task: currentResult.detected_task, selected_model: currentResult.selected_model, confidence_score: currentResult.confidence_score, execution_trace: currentResult.execution_trace, quantitative_metrics: currentResult.quantitative_metrics, image_urls: { primary: currentResult.visual_evidence.primary_image_url, overlay: currentResult.visual_evidence.overlay_image_url, diff: currentResult.visual_evidence.diff_mask_url, fusion: currentResult.visual_evidence.fusion_image_url } }) });
      if (!res.ok) throw new Error("Report generation failed");
      const data = await res.json();
      window.open(`${API_BASE}${data.report_url}`, "_blank");
    } catch { alert("Failed to compile PDF report."); }
    finally { setIsGeneratingReport(false); }
  };

  const recommendedQueries = activeSample ? activeSample.recommended_queries : ["Show the river and water bodies", "What land-cover classes are visible?", "Describe this scene in detail", "Locate built-up infrastructure"];

  return (
    <div className="sol-shell">
      {/* Deep space starfield layers */}
      <div className="sol-stars-1" aria-hidden="true" />
      <div className="sol-stars-2" aria-hidden="true" />
      <div className="sol-nebula-left" aria-hidden="true" />
      <div className="sol-nebula-right" aria-hidden="true" />

      {/* TOP NAV */}
      <Navbar onDownloadReport={handleDownloadReport} hasResult={!!currentResult} isGeneratingReport={isGeneratingReport} />

      {/* ── 3-COLUMN LAYOUT ── */}
      <div className="sol-layout">

        {/* ══ LEFT SIDEBAR ══ */}
        <aside className="sol-sidebar">
          <div className="sol-sidebar-header">
            <span className="sol-sidebar-label">MISSION LIBRARY</span>
            <span className="sol-sidebar-count">{samples.length}</span>
          </div>

          <nav className="sol-mission-list">
            {samples.map((s) => (
              <button key={s.id} onClick={() => { handleSelectSample(s.id); setMobileSidebarOpen(false); }} className={`sol-mission-card ${selectedSampleId === s.id ? "sol-mission-active" : ""}`}>
                <div className="sol-mission-icon"><Globe size={14} /></div>
                <div className="sol-mission-info">
                  <span className="sol-mission-title">{s.title}</span>
                  <span className="sol-mission-sub">{s.location}</span>
                </div>
                <ChevronRight size={12} className="sol-mission-arrow" />
              </button>
            ))}
          </nav>

          {/* System stats */}
          <div className="sol-sidebar-stats">
            <div className="sol-stats-label">SYSTEM STATUS</div>
            {SYSTEM_STATS.map((stat) => (
              <div key={stat.label} className={`sol-stat-row ${stat.color}`}>
                <stat.icon size={11} />
                <span>{stat.label}</span>
                <b>{stat.value}{stat.unit}</b>
              </div>
            ))}
          </div>
        </aside>

        {/* ══ CENTER COLUMN ══ */}
        <main className="sol-center">

          {/* PLANET HERO */}
          <section className="sol-planet-hero">
            <div className="sol-orbit sol-orbit-1" />
            <div className="sol-orbit sol-orbit-2" />
            <div className="sol-orbit sol-orbit-3" />
            <div className="sol-planet-glow" />
            <div className="sol-planet">
              <video autoPlay muted loop playsInline preload="metadata" className="sol-planet-video">
                <source src="/earth-globe-loop.mp4" type="video/mp4" />
              </video>
              <div className="sol-planet-atm" />
            </div>
            {/* Orbiting satellites */}
            <div className="sol-sat sol-sat-1"><Satellite size={10} /></div>
            <div className="sol-sat sol-sat-2"><Zap size={8} /></div>
            <div className="sol-sat sol-sat-3"><Eye size={8} /></div>
            {/* Floating badges */}
            <div className="sol-badge sol-badge-tl"><span className="sol-badge-dot sol-dot-green" /><span>ORBITAL SYNC · LIVE</span></div>
            <div className="sol-badge sol-badge-tr"><Target size={10} /><span>{activeSample?.location || "SELECT MISSION"}</span></div>
            <div className="sol-badge sol-badge-br"><Cpu size={10} /><span>AI ACTIVE · <b>SatQuery v1</b></span></div>
            {/* Hero text */}
            <div className="sol-hero-text">
              <div className="sol-hero-kicker"><span className="sol-dot-pulse" />ORBITAL OBSERVATION COMMAND</div>
              <h1 className="sol-hero-h1">{activeSample ? activeSample.title : "See the planet"}<em> in a new light.</em></h1>
              <p className="sol-hero-p">{activeSample ? activeSample.sensor_details : "Route optical, radar, and time-series imagery through an evidence-grounded AI mission control."}</p>
            </div>
          </section>

          {/* Mission metadata strip */}
          {activeSample && (
            <div className="sol-meta-strip">
              <div className="sol-meta-item"><MapPin size={11} /><span>{activeSample.location}</span></div>
              <div className="sol-meta-item"><Calendar size={11} /><span>{activeSample.acquisition_dates.join(" · ")}</span></div>
              <div className="sol-meta-item"><Info size={11} /><span>{activeSample.taxonomies.slice(0,2).join(" · ")}</span></div>
              <div className="sol-meta-item"><Activity size={11} /><span>{activeSample.input_mode.replace(/_/g," ").toUpperCase()}</span></div>
            </div>
          )}

          {/* Panel tabs - hidden on mobile (use bottom bar instead) */}
          <div className="sol-tabs sol-tabs-desktop">
            <button className={`sol-tab ${activePanel === "upload" ? "sol-tab-active" : ""}`} onClick={() => setActivePanel("upload")}>
              <Layers size={12} /> Payload Ingestion
            </button>
            <button className={`sol-tab ${activePanel === "chat" ? "sol-tab-active" : ""}`} onClick={() => setActivePanel("chat")}>
              <Sparkles size={12} /> AI Analysis {isProcessing && <span className="sol-tab-pulse" />}
            </button>
            {currentResult && (
              <button className={`sol-tab ${activePanel === "trace" ? "sol-tab-active" : ""}`} onClick={() => setActivePanel("trace")}>
                <Activity size={12} /> Execution Trace
              </button>
            )}
          </div>

          {/* Panel content */}
          <div className="sol-panel">
            {activePanel === "upload" && (
              <ImageUploader inputMode={inputMode} onSelectMode={(mode) => setInputMode(mode)} images={images} onUploadSuccess={handleUploadSuccess} onClear={handleClear} apiBaseUrl={API_BASE} />
            )}
            {activePanel === "chat" && (
              <div className="sol-chat-wrap">
                <ChatPanel messages={messages} onSendMessage={handleSendMessage} isProcessing={isProcessing} recommendedQueries={recommendedQueries} onDownloadReport={handleDownloadReport} hasResult={!!currentResult} />
              </div>
            )}
            {activePanel === "trace" && currentResult && (
              <ExecutionTraceView trace={currentResult.execution_trace} detectedTask={currentResult.detected_task} selectedModel={currentResult.selected_model} confidenceScore={currentResult.confidence_score} confidenceBreakdown={currentResult.confidence_breakdown} metrics={currentResult.quantitative_metrics} />
            )}
          </div>
        </main>

        {/* ══ RIGHT SIDEBAR ══ */}
        <aside className="sol-right">
          <div className="sol-right-section">
            <div className="sol-right-label">QUICK ACTIONS</div>
            <button onClick={() => setActivePanel("upload")} className="sol-action-btn sol-action-primary"><Layers size={13} /> Load Imagery</button>
            <button onClick={handleDownloadReport} disabled={!currentResult || isGeneratingReport} className="sol-action-btn sol-action-report"><FileDown size={13} />{isGeneratingReport ? "Generating…" : "Export PDF Report"}</button>
          </div>

          <div className="sol-right-section">
            <div className="sol-right-label">SUGGESTED QUERIES</div>
            <div className="sol-query-list">
              {recommendedQueries.slice(0, 4).map((q, i) => (
                <button key={i} onClick={() => { setActivePanel("chat"); handleSendMessage(q); }} className="sol-query-btn">
                  <Sparkles size={9} /><span>{q}</span>
                </button>
              ))}
            </div>
          </div>

          {activeSample && (
            <div className="sol-right-section">
              <div className="sol-right-label">ACTIVE MISSION</div>
              <div className="sol-mission-detail">
                <div className="sol-mission-detail-title">{activeSample.title}</div>
                <p className="sol-mission-detail-desc">{activeSample.description.slice(0, 110)}…</p>
                <div className="sol-mission-detail-tags">
                  {activeSample.taxonomies.slice(0, 3).map((t) => <span key={t} className="sol-tag">{t}</span>)}
                </div>
              </div>
            </div>
          )}

          {currentResult && (
            <div className="sol-right-section">
              <div className="sol-right-label">LAST RESULT</div>
              <div className="sol-result-mini">
                <div className="sol-result-row"><span>Task</span><b>{currentResult.detected_task}</b></div>
                <div className="sol-result-row"><span>Model</span><b>{currentResult.selected_model}</b></div>
                <div className="sol-result-row"><span>Confidence</span><b className="sol-conf">{Math.round(currentResult.confidence_score * 100)}%</b></div>
                <div className="sol-conf-bar"><div className="sol-conf-fill" style={{ width: `${currentResult.confidence_score * 100}%` }} /></div>
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* ══ ORBITA STYLE FOOTER ══ */}
      <footer className="relative w-full bg-black text-white font-sans overflow-hidden border-t border-neutral-900 flex flex-col justify-between mt-auto">
        {/* Background Image & Gradient */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <img src="/footer-bg.jpg" alt="Martian Terrain" className="w-full h-full object-cover opacity-40 mix-blend-screen" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent"></div>
        </div>

        {/* Top CTA Header Block */}
        <div className="max-w-7xl w-full mx-auto pt-14 px-8 flex flex-col md:flex-row justify-between items-start z-10">
          <div className="max-w-xl">
            <span className="text-xs font-mono tracking-[0.25em] text-neutral-400 uppercase block mb-3">PARTNERSHIP</span>
            <h2 className="text-4xl md:text-5xl font-semibold tracking-tight text-white leading-tight">
              Join The Next Era Of Human<br />Exploration
            </h2>
            <p className="text-sm text-neutral-400 mt-4">
              Partner with ORBITA and help shape humanity's future beyond Earth.
            </p>
          </div>

          <div className="flex flex-col gap-3 mt-6 md:mt-0 w-64">
            <a href="#" className="bg-white text-black font-semibold text-xs tracking-wider uppercase px-6 py-3.5 flex justify-between items-center hover:bg-neutral-200 transition">
              BECOME A PARTNER <span>↗</span>
            </a>
            <a href="#" className="bg-transparent border border-neutral-700 text-white font-semibold text-xs tracking-wider uppercase px-6 py-3.5 flex justify-between items-center hover:border-white transition">
              CONTACT MISSION TEAM <span>↗</span>
            </a>
          </div>
        </div>

        {/* Horizontal Divider Line */}
        <div className="w-full border-t border-neutral-800 my-8 z-10"></div>

        {/* Lower Links & Legal Block */}
        <div className="max-w-7xl w-full mx-auto pb-16 px-8 flex flex-col md:flex-row justify-between items-start gap-12 z-10 relative">
          <div className="text-[11px] text-neutral-500 tracking-wider leading-relaxed font-mono">
            © 2026 ORBITA SPACE. ALL RIGHTS<br />RESERVED.
          </div>

          <div className="flex flex-row gap-16 md:gap-24">
            {/* Quick Links */}
            <div>
              <h4 className="text-white text-sm font-medium mb-4">Quick Link</h4>
              <div className="flex gap-12 text-xs text-neutral-400 font-medium">
                <ul className="space-y-2.5">
                  <li><a href="#" className="hover:text-white transition">MISSION</a></li>
                  <li><a href="#" className="hover:text-white transition">TECHNOLOGY</a></li>
                  <li><a href="#" className="hover:text-white transition">RESEARCH</a></li>
                  <li><a href="#" className="hover:text-white transition">ROADMAP</a></li>
                </ul>
                <ul className="space-y-2.5">
                  <li><a href="#" className="hover:text-white transition">PARTNERS</a></li>
                  <li><a href="#" className="hover:text-white transition">CAREERS</a></li>
                  <li><a href="#" className="hover:text-white transition">CONTACT</a></li>
                </ul>
              </div>
            </div>

            {/* Social Links */}
            <div>
              <h4 className="text-white text-sm font-medium mb-4">Social</h4>
              <ul className="space-y-2.5 text-xs text-neutral-400 font-medium">
                <li><a href="#" className="hover:text-white transition">FACEBOOK</a></li>
                <li><a href="#" className="hover:text-white transition">LINKDIN</a></li>
                <li><a href="#" className="hover:text-white transition">INSTAGRAM</a></li>
                <li><a href="#" className="hover:text-white transition">SPACEX</a></li>
              </ul>
            </div>
          </div>
        </div>
      </footer>

      {/* ══ MOBILE BOTTOM TAB BAR ══ */}
      <nav className="sol-mobile-tabs" aria-label="Mobile navigation">
        <button
          id="mob-tab-upload"
          className={`sol-mobile-tab ${activePanel === "upload" ? "sol-mobile-tab-active" : ""}`}
          onClick={() => setActivePanel("upload")}
        >
          <Layers size={18} />
          <span>Upload</span>
        </button>
        <button
          id="mob-tab-missions"
          className={`sol-mobile-tab ${mobileSidebarOpen ? "sol-mobile-tab-active" : ""}`}
          onClick={() => setMobileSidebarOpen(true)}
        >
          <BookOpen size={18} />
          <span>Missions</span>
        </button>
        <button
          id="mob-tab-ai"
          className={`sol-mobile-tab ${activePanel === "chat" ? "sol-mobile-tab-active" : ""}`}
          onClick={() => setActivePanel("chat")}
        >
          <Sparkles size={18} />
          <span>AI Chat {isProcessing && <span className="sol-tab-pulse" style={{display:"inline-block",marginLeft:"2px"}} />}</span>
        </button>
        {currentResult ? (
          <button
            id="mob-tab-trace"
            className={`sol-mobile-tab ${activePanel === "trace" ? "sol-mobile-tab-active" : ""}`}
            onClick={() => setActivePanel("trace")}
          >
            <Activity size={18} />
            <span>Trace</span>
          </button>
        ) : (
          <Link
            href="/agriculture"
            className="sol-mobile-tab"
            id="mob-tab-agri"
          >
            <Globe size={18} />
            <span>AgriAI</span>
          </Link>
        )}
      </nav>

      {/* ══ MOBILE MISSION DRAWER ══ */}
      {mobileSidebarOpen && (
        <div
          className="sol-mobile-drawer-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) setMobileSidebarOpen(false); }}
        >
          <div className="sol-mobile-drawer">
            <div className="sol-mobile-drawer-header">
              <span className="sol-sidebar-label">MISSION LIBRARY</span>
              <button
                onClick={() => setMobileSidebarOpen(false)}
                className="sol-mobile-drawer-close"
                aria-label="Close missions"
              >
                <X size={20} />
              </button>
            </div>
            <nav className="sol-mobile-drawer-list">
              {samples.map((s) => (
                <button
                  key={s.id}
                  onClick={() => { handleSelectSample(s.id); setMobileSidebarOpen(false); }}
                  className={`sol-mission-card ${selectedSampleId === s.id ? "sol-mission-active" : ""}`}
                  style={{width:"100%"}}
                >
                  <div className="sol-mission-icon"><Globe size={14} /></div>
                  <div className="sol-mission-info">
                    <span className="sol-mission-title">{s.title}</span>
                    <span className="sol-mission-sub">{s.location}</span>
                  </div>
                  <ChevronRight size={12} className="sol-mission-arrow" />
                </button>
              ))}
            </nav>
          </div>
        </div>
      )}
    </div>
  );
}
