export type InputMode = 
  | "single_optical" 
  | "single_sar" 
  | "optical_sar_pair" 
  | "bitemporal_pair";

export type TaskType = 
  | "vqa" 
  | "captioning" 
  | "grounding" 
  | "change_detection" 
  | "change_description" 
  | "optical_sar_fusion";

export interface BoundingBox {
  label: string;
  box_2d: [number, number, number, number]; // [ymin, xmin, ymax, xmax] 0-1000
  confidence: number;
  color: string;
  category?: string;
  area_hectares?: number;
}

export interface ExecutionStep {
  step_index: number;
  name: string;
  description: string;
  model_name: string;
  execution_time_ms: number;
  status: string;
}

export interface ConfidenceBreakdown {
  semantic_alignment: number;
  spectral_consistency: number;
  spatial_grounding: number;
  overall: number;
}

export interface QuantitativeMetric {
  label: string;
  value: string | number;
  unit?: string;
  trend?: "up" | "down" | "stable";
}

export interface VisualEvidence {
  primary_image_url: string;
  secondary_image_url?: string;
  overlay_image_url?: string;
  diff_mask_url?: string;
  fusion_image_url?: string;
  bboxes: BoundingBox[];
  spectral_indices?: Record<string, number>;
}

export interface QueryResponse {
  answer: string;
  detected_task: TaskType;
  task_description: string;
  selected_model: string;
  confidence_score: number;
  confidence_breakdown: ConfidenceBreakdown;
  execution_trace: ExecutionStep[];
  visual_evidence: VisualEvidence;
  quantitative_metrics: QuantitativeMetric[];
  disclaimer: string;
}

export interface ImageMeta {
  filename: string;
  url: string;
  role: string;
  width: number;
  height: number;
  format: string;
  channels: number;
  estimated_gsd_meters: number;
  sensor_type: string;
}

export interface SampleDatasetItem {
  id: string;
  title: string;
  description: string;
  category: string;
  input_mode: InputMode;
  location: string;
  acquisition_dates: string[];
  images: Array<{ role: string; url: string; title: string }>;
  recommended_queries: string[];
  sensor_details: string;
  taxonomies: string[];
}

export interface CropSuitability {
  crop: string;
  score: number;
  rationale: string;
  condition: "Promising" | "Conditional" | "Low fit";
}

export interface AgricultureResponse {
  location: string;
  weather_source: string;
  weather_available: boolean;
  temperature_c?: number;
  humidity_percent?: number;
  precipitation_mm?: number;
  forecast_rainfall_mm?: number;
  land_assessment: string;
  vegetation_proxy: number;
  soil_moisture_proxy: number;
  soil_type: string;
  crops: CropSuitability[];
  disclaimer: string;
}
