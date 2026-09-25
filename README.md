# SatQuery AI with Agriculture 🛰️🌾

> **Agentic Multimodal Remote Sensing & Precision Agricultural Intelligence Platform**  
> An end-to-end intelligent assistant combining satellite remote sensing (optical & SAR), computer vision, and hyperlocal weather analytics to analyze Earth observation imagery, detect change, perform optical-SAR fusion, and screen soil viability & crop suitability. Fully optimized for both desktop and mobile devices (PWA).

---

## 🌟 Key Features

### 🛰️ Satellite Intelligence Hub
- **Multimodal Remote Sensing Analysis**: Ingest and process Single Optical (Sentinel-2, Landsat, Planet), Single SAR (Sentinel-1 C-Band), and Bi-Temporal imagery pairs.
- **AI Agentic Controller**: Intelligent vision-language task routing, grounded segmentation, change detection masks, and optical-SAR fusion.
- **Explainable Execution Traces**: Step-by-step visual chain-of-thought metrics, sensor details, and quantitative confidence reporting.
- **PDF Report Generation**: Downloadable formal mission and analysis reports.

### 🌾 Precision Agriculture & Soil Intelligence
- **Soil & Crop Suitability Engine**: Surface soil moisture evaluation, organic carbon proxy estimation, and nitrogen index calculation.
- **Climate & Agronomy Fusion**: Rainfall anomaly detection, temperature heat-stress scoring, and field viability status.
- **Actionable Agronomy Recommendations**: Fertilizer prescriptions, optimal sowing windows, and climate risk mitigation advice.

### 📱 Responsive & Mobile-First (PWA Ready)
- Optimized for desktop workstations, tablets, and mobile phones.
- Mobile bottom navigation tabs, slide-in drawers, touch-friendly interactions, and viewport optimization.
- Progressive Web App support for installation directly onto iOS & Android home screens.

---

## 📁 Repository Structure

```
├── backend/
│   ├── agent/                 # Agentic controller & reasoning workflows
│   ├── demo_data/             # Sample optical & SAR satellite datasets
│   ├── engines/               # Precision agriculture & soil intelligence engines
│   ├── models/                # Pydantic schemas and data contracts
│   ├── static/                # Static assets, uploads, outputs, and generated reports
│   ├── utils/                 # Image processors, spectral index helpers, PDF generator
│   ├── main.py                # FastAPI backend server
│   └── requirements.txt       # Python dependencies
├── frontend/
│   ├── public/                # Favicon, icons, manifest.json
│   ├── src/
│   │   ├── app/
│   │   │   ├── agriculture/   # Precision agriculture dashboard
│   │   │   ├── globals.css    # Comprehensive styling, responsive breakpoints & themes
│   │   │   ├── layout.tsx     # Root layout with fonts, SEO & PWA metadata
│   │   │   └── page.tsx       # Main satellite intelligence platform
│   │   ├── components/        # UI components (Navbar, ChatPanel, ImageUploader, etc.)
│   │   └── types/             # TypeScript type definitions
│   ├── package.json           # Next.js dependencies and scripts
│   └── tsconfig.json          # TypeScript configuration
├── .gitignore
└── README.md
```

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js**: v18 or later
- **Python**: 3.10 or later

### 1. Backend Setup (FastAPI)
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```
*Backend API docs will be available at: `http://localhost:8000/docs`*

### 2. Frontend Setup (Next.js)
```bash
cd frontend
npm install
npm run dev -- -H 0.0.0.0
```
*Frontend will be running at: `http://localhost:3000`*

### 📱 Mobile Access
Ensure your phone is connected to the same Wi-Fi network as your host computer. Open:
```
http://<YOUR_LOCAL_IP>:3000
```
*(e.g., `http://192.168.31.124:3000`)*

---

## 📄 License
MIT License.
