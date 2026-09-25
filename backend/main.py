import os
import shutil
import uuid
from typing import List, Optional
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from .models.schemas import (
    InputMode, TaskType, QueryRequest, QueryResponse,
    UploadResponse, ImageMeta, SampleDatasetItem, ReportRequest
)
from .agent.controller import AgenticController
from .utils.image_processor import (
    ALLOWED_EXTENSIONS, read_image_to_numpy, save_numpy_as_png,
    validate_image_pair, ensure_dir
)
from .utils.pdf_generator import generate_pdf_report
from .engines.agriculture_engine import assess_land
from .models.schemas import AgricultureRequest, AgricultureResponse

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "static")
UPLOADS_DIR = os.path.join(STATIC_DIR, "uploads")
OUTPUTS_DIR = os.path.join(STATIC_DIR, "outputs")
DEMO_DIR = os.path.join(BASE_DIR, "demo_data")
REPORTS_DIR = os.path.join(STATIC_DIR, "reports")

for d in [STATIC_DIR, UPLOADS_DIR, OUTPUTS_DIR, REPORTS_DIR]:
    ensure_dir(d)

# Copy demo data into static/demo_data for direct web serving
STATIC_DEMO_DIR = os.path.join(STATIC_DIR, "demo_data")
ensure_dir(STATIC_DEMO_DIR)
for f in os.listdir(DEMO_DIR):
    src = os.path.join(DEMO_DIR, f)
    if os.path.isfile(src) and f.endswith(".png"):
        shutil.copy2(src, os.path.join(STATIC_DEMO_DIR, f))

app = FastAPI(
    title="SatQuery AI API",
    description="Agentic Vision-Language Assistant for Multimodal Remote Sensing Image Analysis",
    version="1.0.0"
)

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

agent = AgenticController(static_dir=OUTPUTS_DIR)

# In-memory session store mapping session_id -> list of image filepaths
SESSION_IMAGES = {}
SESSION_INPUT_MODES = {}

# -------------------------------------------------------------
# Preset Sample Datasets
# -------------------------------------------------------------
SAMPLE_DATASETS: List[SampleDatasetItem] = [
    SampleDatasetItem(
        id="sample_coastal_port",
        title="Rotterdam Maritime Port & Estuary",
        description="High-resolution coastal harbor with berths, container yards, docked cargo vessels, sports arena, and transportation networks.",
        category="Maritime & Infrastructure (RSVQA / VRSBench)",
        input_mode=InputMode.SINGLE_OPTICAL,
        location="Rotterdam, Netherlands (51.92° N, 4.47° E)",
        acquisition_dates=["2024-05-18"],
        images=[
            {"role": "primary", "url": "/static/demo_data/sentinel2_coastal_port.png", "title": "Sentinel-2 MSI Level-2A RGB"}
        ],
        recommended_queries=[
            "Show the river and port docks",
            "Highlight the stadium",
            "How many water bodies are present?",
            "Describe this scene in detail",
            "What major objects can be observed?"
        ],
        sensor_details="Sentinel-2 MSI • 10m GSD • 12 Spectral Bands",
        taxonomies=["Port Infrastructure", "Container Terminal", "Water Bodies", "Sports Complex", "Urban Road Network"]
    ),
    SampleDatasetItem(
        id="sample_urban_expansion",
        title="Austin Peri-Urban Expansion (2021 vs 2024)",
        description="Bi-temporal satellite pair capturing massive transition of open agricultural greenfields into commercial logistics centers and arterial highways.",
        category="Bi-Temporal Change Detection (CDVQA)",
        input_mode=InputMode.BITEMPORAL_PAIR,
        location="Austin Metropolitan Area, Texas, USA",
        acquisition_dates=["2021-06-12 (T1)", "2024-06-19 (T2)"],
        images=[
            {"role": "time1", "url": "/static/demo_data/bitemporal_austin_2021_t1.png", "title": "Pre-Development (T1 2021)"},
            {"role": "time2", "url": "/static/demo_data/bitemporal_austin_2024_t2.png", "title": "Post-Development (T2 2024)"}
        ],
        recommended_queries=[
            "What changed between these dates?",
            "Where did urban expansion occur?",
            "Has vegetation increased or decreased?",
            "Describe the new infrastructure built in T2"
        ],
        sensor_details="PlanetScope & Sentinel-2 Harmonized Surface Reflectance • 10m GSD",
        taxonomies=["Urban Expansion", "Vegetation Loss", "Arterial Highway", "Industrial Warehousing", "Land Use Conversion"]
    ),
    SampleDatasetItem(
        id="sample_flood_fusion",
        title="Kerala Inundation: Optical + SAR Fusion",
        description="Dual-sensor observation of monsoon flood disaster. Sentinel-2 Optical is partially blinded by heavy cloud cover; Sentinel-1 C-Band SAR penetrates clouds to map water boundaries.",
        category="Multimodal Optical-SAR Fusion",
        input_mode=InputMode.OPTICAL_SAR_PAIR,
        location="Periyar Basin, Kerala, India",
        acquisition_dates=["2023-08-14 (Co-incident Orbit)"],
        images=[
            {"role": "optical", "url": "/static/demo_data/kerala_flood_optical_s2.png", "title": "Sentinel-2 Optical (Cloud Occlusion)"},
            {"role": "sar", "url": "/static/demo_data/kerala_flood_sar_s1.png", "title": "Sentinel-1 SAR C-Band (Microwave)"}
        ],
        recommended_queries=[
            "Detect flooded areas using SAR backscatter",
            "Locate critical infrastructure surviving the flood",
            "Explain why SAR and Optical fusion is superior to optical alone",
            "Calculate percentage of submerged surface"
        ],
        sensor_details="Sentinel-1 C-Band SAR (VV/VH, 10m) + Sentinel-2 MSI (RGB/NIR, 10m)",
        taxonomies=["Specular Radar Water Absorption", "Cloud Penetration", "Double-Bounce Urban Reflector", "Emergency Inundation Mapping"]
    ),
    SampleDatasetItem(
        id="sample_bigearthnet_agri",
        title="Central Valley Agro-Forestry Parcels",
        description="Multispectral agricultural landscape showing center-pivot irrigation circles, alfalfa fields, orchard clusters, and irrigation canals.",
        category="Land Cover & Vegetation (BigEarthNet)",
        input_mode=InputMode.SINGLE_OPTICAL,
        location="San Joaquin Valley, California",
        acquisition_dates=["2024-04-02"],
        images=[
            {"role": "primary", "url": "/static/demo_data/bigearthnet_agricultural_plots.png", "title": "Sentinel-2 Agro-Reflectance"}
        ],
        recommended_queries=[
            "What land-cover classes are visible?",
            "Locate agricultural fields and irrigation circles",
            "What is the dominant vegetation type?",
            "Describe the irrigation canal distribution"
        ],
        sensor_details="Sentinel-2 MultiSpectral Instrument • 10m GSD",
        taxonomies=["Permanently Irrigated Land", "Arable Land", "Riparian Canal", "Orchards", "BigEarthNet 19-class"]
    )
]

# -------------------------------------------------------------
# Endpoints
# -------------------------------------------------------------
@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "SatQuery AI Remote Sensing Vision-Language Assistant",
        "version": "1.0.0",
        "active_models": [
            "Qwen2.5-VL-7B (RS Fine-tuned)",
            "Florence-2-RS-Large (Grounding & Dense Caption)",
            "ChangeFormer-v2 (Bi-Temporal Metric Transformer)",
            "SAR-OptiNet-v2 (Multimodal Cross-Attention Fusion)",
            "RemoteCLIP (ViT-L/14 Earth Observation Alignment)"
        ],
        "device": "PyTorch Accelerated Engine",
        "supported_formats": list(ALLOWED_EXTENSIONS)
    }

@app.get("/api/sample-datasets", response_model=List[SampleDatasetItem])
def get_sample_datasets():
    return SAMPLE_DATASETS

@app.post("/api/load-sample")
def load_sample_dataset(sample_id: str = Form(...)):
    """Loads a pre-packaged sample dataset into an active session."""
    selected = next((s for s in SAMPLE_DATASETS if s.id == sample_id), None)
    if not selected:
        raise HTTPException(status_code=404, detail="Sample dataset not found")

    session_id = f"demo_{uuid.uuid4().hex[:8]}"
    image_paths = []
    image_metas = []

    for img_info in selected.images:
        url = img_info["url"]
        fname = os.path.basename(url)
        src_path = os.path.join(STATIC_DEMO_DIR, fname)
        if not os.path.exists(src_path):
            src_path = os.path.join(DEMO_DIR, fname)
        
        # Copy to session uploads
        dest_filename = f"{session_id}_{fname}"
        dest_path = os.path.join(UPLOADS_DIR, dest_filename)
        shutil.copy2(src_path, dest_path)
        image_paths.append(dest_path)

        arr, meta = read_image_to_numpy(dest_path)
        image_metas.append(ImageMeta(
            filename=dest_filename,
            url=f"/static/uploads/{dest_filename}",
            role=img_info.get("role", "primary"),
            width=meta["width"],
            height=meta["height"],
            format=meta["format"],
            channels=meta["channels"],
            estimated_gsd_meters=10.0,
            sensor_type=selected.sensor_details
        ))

    SESSION_IMAGES[session_id] = image_paths
    SESSION_INPUT_MODES[session_id] = selected.input_mode

    return {
        "session_id": session_id,
        "input_mode": selected.input_mode,
        "sample": selected,
        "images": image_metas,
        "validation_status": "success",
        "validation_message": f"Successfully loaded '{selected.title}' ({len(image_metas)} assets verified)."
    }

@app.post("/api/upload", response_model=UploadResponse)
async def upload_images(
    input_mode: InputMode = Form(...),
    files: List[UploadFile] = File(...)
):
    """
    Validates uploaded satellite images according to input mode, format,
    and spatial compatibility.
    """
    # 1. Validate count
    expected_count = 2 if input_mode in [InputMode.OPTICAL_SAR_PAIR, InputMode.BITEMPORAL_PAIR] else 1
    if len(files) != expected_count:
        raise HTTPException(
            status_code=400,
            detail=f"Input mode '{input_mode.value}' requires exactly {expected_count} image(s), but received {len(files)}."
        )

    session_id = uuid.uuid4().hex[:10]
    saved_paths = []
    image_metas = []

    # Roles assignment
    roles = ["primary"]
    if input_mode == InputMode.BITEMPORAL_PAIR:
        roles = ["time1", "time2"]
    elif input_mode == InputMode.OPTICAL_SAR_PAIR:
        roles = ["optical", "sar"]
    elif input_mode == InputMode.SINGLE_SAR:
        roles = ["sar"]

    for i, file in enumerate(files):
        ext = os.path.splitext(file.filename)[1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported format '{ext}'. Allowed remote sensing formats: GeoTIFF (.tif, .tiff), PNG, JPEG."
            )

        saved_name = f"{session_id}_{roles[i]}_{file.filename}"
        saved_path = os.path.join(UPLOADS_DIR, saved_name)

        # Write uploaded file
        with open(saved_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Process and normalize
        arr, meta = read_image_to_numpy(saved_path)
        
        # Save as web-safe normalized PNG if it was TIFF/GeoTIFF
        if ext in [".tif", ".tiff", ".geotiff"]:
            png_name = f"{session_id}_{roles[i]}.png"
            png_path = os.path.join(UPLOADS_DIR, png_name)
            save_numpy_as_png(arr, png_path)
            web_url = f"/static/uploads/{png_name}"
            saved_paths.append(png_path)
        else:
            web_url = f"/static/uploads/{saved_name}"
            saved_paths.append(saved_path)

        sensor = "Sentinel-1 SAR C-Band" if roles[i] == "sar" else "Sentinel-2 Optical MSI"
        image_metas.append(ImageMeta(
            filename=os.path.basename(web_url),
            url=web_url,
            role=roles[i],
            width=meta["width"],
            height=meta["height"],
            format=meta["format"],
            channels=meta["channels"],
            estimated_gsd_meters=10.0,
            sensor_type=sensor
        ))

    # Spatial Compatibility Check for pairs
    validation_msg = "Image validated successfully."
    if len(saved_paths) == 2:
        valid_pair, pair_msg = validate_image_pair(saved_paths[0], saved_paths[1])
        if not valid_pair:
            raise HTTPException(status_code=400, detail=pair_msg)
        validation_msg = pair_msg

    SESSION_IMAGES[session_id] = saved_paths
    SESSION_INPUT_MODES[session_id] = input_mode

    return UploadResponse(
        session_id=session_id,
        input_mode=input_mode,
        images=image_metas,
        validation_status="success",
        validation_message=validation_msg
    )

@app.post("/api/query", response_model=QueryResponse)
def execute_query(req: QueryRequest):
    """
    Main Agentic Assistant query pipeline.
    Parses natural language question, selects remote sensing model,
    returns grounded answer, visual evidence, metrics, and execution trace.
    """
    session_id = req.session_id
    image_paths = SESSION_IMAGES.get(session_id)

    if not image_paths or not all(os.path.exists(p) for p in image_paths):
        # Fallback to demo port image if session not found
        default_img = os.path.join(STATIC_DEMO_DIR, "sentinel2_coastal_port.png")
        image_paths = [default_img]

    meta_list = []
    for p in image_paths:
        _, m = read_image_to_numpy(p)
        meta_list.append(m)

    response = agent.execute_pipeline(
        query=req.query,
        input_mode=req.input_mode,
        image_paths=image_paths,
        meta_list=meta_list,
        override_task=req.override_task
    )

    return response

@app.post("/api/agriculture-assessment", response_model=AgricultureResponse)
def agriculture_assessment(req: AgricultureRequest):
    """Image-based proxy assessment combined with weather for crop screening."""
    image_paths = SESSION_IMAGES.get(req.session_id)
    if not image_paths or not os.path.exists(image_paths[0]):
        raise HTTPException(status_code=404, detail="Upload an image before requesting an agriculture assessment.")
    report = assess_land(image_paths[0], req.location, req.soil_type)
    weather = report["weather"]
    return AgricultureResponse(location=weather.get("location", req.location), weather_source=weather["source"], weather_available=weather["available"], temperature_c=weather.get("temperature_c"), humidity_percent=weather.get("humidity_percent"), precipitation_mm=weather.get("precipitation_mm"), forecast_rainfall_mm=weather.get("forecast_rainfall_mm"), land_assessment=report["assessment"], vegetation_proxy=report["vegetation"], soil_moisture_proxy=report["moisture"], soil_type=req.soil_type, crops=report["crops"], disclaimer="Preliminary screening only: RGB imagery cannot measure soil nutrients, pH, disease, groundwater, or field-scale temperature. Confirm crop choice with soil tests, local seasonal forecasts, water availability, and an agronomist.")

@app.post("/api/generate-report")
def generate_report(req: ReportRequest):
    """
    Generates downloadable PDF mission intelligence report.
    """
    report_filename = f"satquery_report_{uuid.uuid4().hex[:8]}.pdf"
    output_pdf = os.path.join(REPORTS_DIR, report_filename)

    # Resolve local file paths for images
    resolved_paths = {}
    for key, url in req.image_urls.items():
        if url:
            # url is like /static/uploads/... or /static/outputs/...
            rel_path = url.replace("/static/", "")
            local_path = os.path.join(STATIC_DIR, rel_path)
            if os.path.exists(local_path):
                resolved_paths[key] = local_path

    generate_pdf_report(
        query=req.query,
        answer=req.answer,
        detected_task=req.detected_task,
        selected_model=req.selected_model,
        confidence_score=req.confidence_score,
        metrics=req.quantitative_metrics,
        execution_trace=req.execution_trace,
        image_paths=resolved_paths,
        output_pdf_path=output_pdf
    )

    return {
        "report_url": f"/static/reports/{report_filename}",
        "filename": report_filename,
        "status": "ready"
    }

@app.get("/api/download-report/{filename}")
def download_report(filename: str):
    pdf_path = os.path.join(REPORTS_DIR, filename)
    if not os.path.exists(pdf_path):
        raise HTTPException(status_code=404, detail="Report not found")
    return FileResponse(
        pdf_path,
        media_type="application/pdf",
        filename=filename
    )
