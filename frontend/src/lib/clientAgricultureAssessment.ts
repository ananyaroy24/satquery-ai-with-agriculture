import { AgricultureResponse, CropSuitability } from "../types";

interface CropProfile {
  lowT: number;
  highT: number;
  lowM: number;
  highM: number;
  rationale: string;
}

const CROP_PROFILES: Record<string, CropProfile> = {
  Maize: { lowT: 18, highT: 32, lowM: 0.40, highM: 0.75, rationale: "Warm-season crop; benefits from consistent moisture." },
  Millet: { lowT: 20, highT: 35, lowM: 0.22, highM: 0.55, rationale: "Drought-tolerant option for lower-rainfall conditions." },
  Rice: { lowT: 20, highT: 35, lowM: 0.62, highM: 1.00, rationale: "Suitable only where dependable water supply or irrigation is available." },
  Wheat: { lowT: 10, highT: 26, lowM: 0.30, highM: 0.65, rationale: "Cooler-season crop; schedule for the local cool growing window." },
  Chickpea: { lowT: 15, highT: 30, lowM: 0.20, highM: 0.55, rationale: "Lower-water legume option; verify soil pH and drainage." },
};

const SOIL_PREFERENCES: Record<string, string[]> = {
  Maize: ["Loamy", "Sandy loam", "Clay loam"],
  Millet: ["Sandy", "Sandy loam", "Loamy"],
  Rice: ["Clay", "Clay loam", "Loamy"],
  Wheat: ["Loamy", "Clay loam", "Silty"],
  Chickpea: ["Loamy", "Sandy loam", "Black cotton"],
};

function clamp(val: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, val));
}

function scoreCrop(
  crop: string,
  veg: number,
  moisture: number,
  temp: number | null,
  rain: number | null,
  soilType: string
): CropSuitability {
  const profile = CROP_PROFILES[crop];
  const { lowT, highT, lowM, highM, rationale } = profile;
  const t = temp ?? 24;
  const r = rain ?? 15;

  const tempFit = Math.max(0, 1 - Math.max(lowT - t, t - highT, 0) / 12);
  const moistFit = Math.max(0, 1 - Math.max(lowM - moisture, moisture - highM, 0) / 0.45);
  const soilFit = (SOIL_PREFERENCES[crop] || []).includes(soilType) ? 1.0 : 0.56;
  const rawScore = Math.round(
    100 * (0.34 * tempFit + 0.27 * moistFit + 0.16 * (0.72 + veg * 0.28) + 0.10 * Math.min(1, 0.55 + r / 80) + 0.13 * soilFit)
  );
  const score = clamp(rawScore, 0, 100);
  const soilNote =
    soilFit === 1
      ? "Matches the selected soil type."
      : `May need soil amendment or drainage management for ${soilType.toLowerCase()} soil.`;

  return {
    crop,
    score,
    rationale: `${rationale} ${soilNote}`,
    condition: score >= 74 ? "Promising" : score >= 55 ? "Conditional" : "Low fit",
  };
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(7000) });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function getWeather(location: string) {
  const geoUrl =
    "https://geocoding-api.open-meteo.com/v1/search?" +
    new URLSearchParams({ name: location, count: "1", language: "en", format: "json" });
  const geocoded = await fetchJson<{ results?: Array<{ latitude: number; longitude: number; name: string; admin1?: string; country?: string }> }>(geoUrl);
  const places = geocoded?.results || [];

  if (!places.length) {
    return {
      available: false,
      source: "Open-Meteo unavailable — enter a valid town, district, or coordinates.",
    };
  }

  const place = places[0];
  const forecastUrl =
    "https://api.open-meteo.com/v1/forecast?" +
    new URLSearchParams({
      latitude: String(place.latitude),
      longitude: String(place.longitude),
      current: "temperature_2m,relative_humidity_2m,precipitation",
      daily: "precipitation_sum",
      forecast_days: "7",
      timezone: "auto",
    });

  const forecast = await fetchJson<{
    current?: { temperature_2m?: number; relative_humidity_2m?: number; precipitation?: number };
    daily?: { precipitation_sum?: number[] };
  }>(forecastUrl);

  if (!forecast?.current) {
    return {
      available: false,
      source: "Open-Meteo forecast unavailable. Try again shortly.",
    };
  }

  const current = forecast.current;
  const daily = forecast.daily || {};
  const label = [place.name, place.admin1, place.country].filter(Boolean).join(", ");
  const precipSum = daily.precipitation_sum || [];
  const forecastRain = precipSum.reduce((a, b) => a + b, 0);

  return {
    available: true,
    source: "Open-Meteo live forecast",
    location: label || location,
    temperature_c: Number(Number(current.temperature_2m || 0).toFixed(1)),
    humidity_percent: Number(Number(current.relative_humidity_2m || 0).toFixed(1)),
    precipitation_mm: Number(Number(current.precipitation || 0).toFixed(1)),
    forecast_rainfall_mm: Number(Number(forecastRain).toFixed(1)),
  };
}

export async function runClientAgricultureAssessment(
  location: string,
  soilType: string,
  vegetationProxy?: number,
  soilMoistureProxy?: number,
  landAssessmentOverride?: string,
  imageSourceType?: string,
  exgIndex?: number,
  variIndex?: number
): Promise<AgricultureResponse> {
  const vegetation =
    typeof vegetationProxy === "number" && !isNaN(vegetationProxy)
      ? Math.min(1, Math.max(0, vegetationProxy))
      : 0.50;
  const moisture =
    typeof soilMoistureProxy === "number" && !isNaN(soilMoistureProxy)
      ? Math.min(1, Math.max(0, soilMoistureProxy))
      : 0.50;
  const hasRealProxies = typeof vegetationProxy === "number";

  const assessment =
    landAssessmentOverride && typeof landAssessmentOverride === "string"
      ? landAssessmentOverride
      : hasRealProxies
      ? vegetation > 0.62
        ? "Dense vegetation signal detected — active crop cover or perennial canopy likely present."
        : vegetation > 0.45
        ? "Moderate vegetation signal — the parcel may support seasonal cropping with moisture management."
        : "Sparse vegetation signal — inspect soil cover and irrigation access before planting."
      : "Moderate vegetation signal estimated (location-only mode — upload an image for pixel-level NDVI analysis).";

  const weather = await getWeather(location);

  const crops = Object.keys(CROP_PROFILES)
    .map((crop) =>
      scoreCrop(
        crop,
        vegetation,
        moisture,
        weather.temperature_c ?? null,
        weather.forecast_rainfall_mm ?? null,
        soilType
      )
    )
    .sort((a, b) => b.score - a.score);

  return {
    location: weather.location || location,
    weather_source: weather.source,
    weather_available: weather.available,
    temperature_c: weather.temperature_c,
    humidity_percent: weather.humidity_percent,
    precipitation_mm: weather.precipitation_mm,
    forecast_rainfall_mm: weather.forecast_rainfall_mm,
    land_assessment: assessment,
    vegetation_proxy: vegetation,
    soil_moisture_proxy: moisture,
    soil_type: soilType,
    crops,
    disclaimer:
      "Preliminary screening: crop ranking is based on live Open-Meteo weather and browser multi-spectral ExG/VARI pixel analysis. Confirm crop choice with soil tests, local seasonal forecasts, water availability, and an agronomist.",
    image_source_type: imageSourceType,
    exg_index: exgIndex,
    vari_index: variIndex,
  };
}
