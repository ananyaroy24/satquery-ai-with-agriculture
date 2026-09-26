/**
 * Netlify Serverless Function: /api/agriculture-assessment
 *
 * Mirrors the Python FastAPI endpoint so the agriculture feature works on
 * Netlify (static export) without a separate Python backend.
 *
 * - Fetches live weather from Open-Meteo (free, no API key required)
 * - Computes crop suitability scores using the same algorithm as
 *   backend/engines/agriculture_engine.py
 * - Uses neutral proxy values (vegetation 0.50, moisture 0.50) when no
 *   image backend is available — users still get live weather + crop advice
 */

const HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
};

/* ---------- Weather helpers ---------- */

async function fetchJson(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(7000) });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function getWeather(location) {
  const geoUrl =
    "https://geocoding-api.open-meteo.com/v1/search?" +
    new URLSearchParams({ name: location, count: "1", language: "en", format: "json" });
  const geocoded = await fetchJson(geoUrl);
  const places = (geocoded && geocoded.results) ? geocoded.results : [];

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

  const forecast = await fetchJson(forecastUrl);
  if (!forecast || !forecast.current) {
    return {
      available: false,
      source: "Open-Meteo forecast unavailable. Try again shortly.",
    };
  }

  const current = forecast.current;
  const daily = forecast.daily || {};
  const label = [place.name, place.admin1, place.country].filter(Boolean).join(", ");
  const precipSum = daily.precipitation_sum || [];
  const forecastRain = precipSum.reduce(function(a, b) { return a + b; }, 0);

  return {
    available: true,
    source: "Open-Meteo live forecast",
    location: label || location,
    temperature_c: parseFloat(parseFloat(current.temperature_2m || 0).toFixed(1)),
    humidity_percent: parseFloat(parseFloat(current.relative_humidity_2m || 0).toFixed(1)),
    precipitation_mm: parseFloat(parseFloat(current.precipitation || 0).toFixed(1)),
    forecast_rainfall_mm: parseFloat(parseFloat(forecastRain).toFixed(1)),
  };
}

/* ---------- Crop scoring (ported from agriculture_engine.py) ---------- */

var CROP_PROFILES = {
  Maize:    { lowT: 18, highT: 32, lowM: 0.40, highM: 0.75, rationale: "Warm-season crop; benefits from consistent moisture." },
  Millet:   { lowT: 20, highT: 35, lowM: 0.22, highM: 0.55, rationale: "Drought-tolerant option for lower-rainfall conditions." },
  Rice:     { lowT: 20, highT: 35, lowM: 0.62, highM: 1.00, rationale: "Suitable only where dependable water supply or irrigation is available." },
  Wheat:    { lowT: 10, highT: 26, lowM: 0.30, highM: 0.65, rationale: "Cooler-season crop; schedule for the local cool growing window." },
  Chickpea: { lowT: 15, highT: 30, lowM: 0.20, highM: 0.55, rationale: "Lower-water legume option; verify soil pH and drainage." },
};

var SOIL_PREFERENCES = {
  Maize:    ["Loamy", "Sandy loam", "Clay loam"],
  Millet:   ["Sandy", "Sandy loam", "Loamy"],
  Rice:     ["Clay", "Clay loam", "Loamy"],
  Wheat:    ["Loamy", "Clay loam", "Silty"],
  Chickpea: ["Loamy", "Sandy loam", "Black cotton"],
};

function clamp(val, lo, hi) { return Math.max(lo, Math.min(hi, val)); }

function scoreCrop(crop, veg, moisture, temp, rain, soilType) {
  var profile = CROP_PROFILES[crop];
  var lowT = profile.lowT, highT = profile.highT, lowM = profile.lowM, highM = profile.highM;
  var rationale = profile.rationale;
  var t = (temp !== null && temp !== undefined) ? temp : 24;
  var r = (rain !== null && rain !== undefined) ? rain : 15;

  var tempFit  = Math.max(0, 1 - Math.max(lowT - t, t - highT, 0) / 12);
  var moistFit = Math.max(0, 1 - Math.max(lowM - moisture, moisture - highM, 0) / 0.45);
  var soilFit  = SOIL_PREFERENCES[crop].indexOf(soilType) !== -1 ? 1.0 : 0.56;
  var score    = Math.round(100 * (0.34 * tempFit + 0.27 * moistFit + 0.16 * (0.72 + veg * 0.28) + 0.10 * Math.min(1, 0.55 + r / 80) + 0.13 * soilFit));
  var finalScore = clamp(score, 0, 100);
  var soilNote = soilFit === 1
    ? "Matches the selected soil type."
    : "May need soil amendment or drainage management for " + soilType.toLowerCase() + " soil.";

  return {
    crop: crop,
    score: finalScore,
    rationale: rationale + " " + soilNote,
    condition: finalScore >= 74 ? "Promising" : finalScore >= 55 ? "Conditional" : "Low fit",
  };
}

/* ---------- Netlify handler ---------- */

exports.handler = async function(event) {
  // Handle CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: HEADERS, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: HEADERS, body: JSON.stringify({ detail: "Method not allowed" }) };
  }

  var body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch (e) {
    return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ detail: "Invalid JSON body" }) };
  }

  var location = (body.location || "").trim();
  var soilType = body.soil_type || "Loamy";

  if (location.length < 2) {
    return {
      statusCode: 400,
      headers: HEADERS,
      body: JSON.stringify({ detail: "Enter a valid location (town, district, or coordinates)." }),
    };
  }

  // Use neutral proxy values (no image analysis available in static Netlify deployment)
  var vegetation = 0.50;
  var moisture   = 0.50;
  var assessment =
    "Moderate vegetation signal estimated (no image backend configured for this deployment). " +
    "Crop rankings below are based on live weather data and your soil type selection.";

  var weather = await getWeather(location);

  var crops = Object.keys(CROP_PROFILES).map(function(crop) {
    return scoreCrop(
      crop,
      vegetation,
      moisture,
      weather.temperature_c !== undefined ? weather.temperature_c : null,
      weather.forecast_rainfall_mm !== undefined ? weather.forecast_rainfall_mm : null,
      soilType
    );
  }).sort(function(a, b) { return b.score - a.score; });

  var response = {
    location:             weather.location || location,
    weather_source:       weather.source,
    weather_available:    weather.available,
    temperature_c:        weather.temperature_c,
    humidity_percent:     weather.humidity_percent,
    precipitation_mm:     weather.precipitation_mm,
    forecast_rainfall_mm: weather.forecast_rainfall_mm,
    land_assessment:      assessment,
    vegetation_proxy:     vegetation,
    soil_moisture_proxy:  moisture,
    soil_type:            soilType,
    crops:                crops,
    disclaimer:
      "Preliminary screening only: crop ranking is based on live weather and soil type " +
      "(image analysis not available in this static deployment — connect a backend for full NDVI proxies). " +
      "Confirm crop choice with soil tests, local seasonal forecasts, water availability, and an agronomist.",
  };

  return {
    statusCode: 200,
    headers: HEADERS,
    body: JSON.stringify(response),
  };
};

