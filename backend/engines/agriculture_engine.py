"""Image-proxy agriculture assessment plus optional live Open-Meteo lookup."""
from __future__ import annotations
import json
from urllib.parse import urlencode
from urllib.request import urlopen
from typing import Any
import numpy as np
from ..utils.image_processor import read_image_to_numpy

def _fetch_json(url: str) -> dict[str, Any] | None:
    try:
        with urlopen(url, timeout=5) as response:
            return json.loads(response.read().decode("utf-8"))
    except Exception:
        return None

def get_weather(location: str) -> dict[str, Any]:
    geocoded = _fetch_json("https://geocoding-api.open-meteo.com/v1/search?" + urlencode({"name": location, "count": 1, "language": "en", "format": "json"}))
    places = (geocoded or {}).get("results", [])
    if not places:
        return {"available": False, "source": "Open-Meteo unavailable — enter a valid town, district, or coordinates."}
    place = places[0]
    forecast = _fetch_json("https://api.open-meteo.com/v1/forecast?" + urlencode({
        "latitude": place["latitude"], "longitude": place["longitude"],
        "current": "temperature_2m,relative_humidity_2m,precipitation",
        "daily": "precipitation_sum", "forecast_days": 7, "timezone": "auto",
    }))
    if not forecast or "current" not in forecast:
        return {"available": False, "source": "Open-Meteo forecast unavailable. Try again shortly."}
    current, daily = forecast["current"], forecast.get("daily", {})
    label = ", ".join(part for part in [place.get("name"), place.get("admin1"), place.get("country")] if part)
    return {"available": True, "source": "Open-Meteo live forecast", "location": label or location,
            "temperature_c": round(float(current.get("temperature_2m", 0)), 1),
            "humidity_percent": round(float(current.get("relative_humidity_2m", 0)), 1),
            "precipitation_mm": round(float(current.get("precipitation", 0)), 1),
            "forecast_rainfall_mm": round(sum(daily.get("precipitation_sum", [])), 1)}

def _image_proxies(image_path: str) -> tuple[float, float, str]:
    array, _ = read_image_to_numpy(image_path)
    rgb = array[:, :, :3].astype(np.float32) / 255.0
    red, green, blue = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    vegetation = float(np.clip(np.mean(green - (red + blue) / 2 + .5), 0, 1))
    dark_fraction = float(np.mean(np.mean(rgb, axis=2) < .34))
    moisture = float(np.clip(.28 + vegetation * .55 + dark_fraction * .17, 0, 1))
    assessment = "Dense vegetation signal with a likely active crop or perennial canopy." if vegetation > .62 else "Moderate vegetation signal; the parcel may support seasonal cropping with moisture management." if vegetation > .45 else "Sparse vegetation signal; inspect soil cover and irrigation access before planting."
    return round(vegetation, 2), round(moisture, 2), assessment

def _score(crop: str, veg: float, moisture: float, temp: float | None, rain: float | None, soil_type: str) -> dict[str, Any]:
    temp, rain = temp if temp is not None else 24., rain if rain is not None else 15.
    profiles = {"Maize": (18,32,.40,.75,"Warm-season crop; benefits from consistent moisture."), "Millet": (20,35,.22,.55,"Drought-tolerant option for lower-rainfall conditions."), "Rice": (20,35,.62,1.,"Suitable only where dependable water supply or irrigation is available."), "Wheat": (10,26,.30,.65,"Cooler-season crop; schedule for the local cool growing window."), "Chickpea": (15,30,.20,.55,"Lower-water legume option; verify soil pH and drainage.")}
    soil_preferences = {"Maize": {"Loamy", "Sandy loam", "Clay loam"}, "Millet": {"Sandy", "Sandy loam", "Loamy"}, "Rice": {"Clay", "Clay loam", "Loamy"}, "Wheat": {"Loamy", "Clay loam", "Silty"}, "Chickpea": {"Loamy", "Sandy loam", "Black cotton"}}
    low_t, high_t, low_m, high_m, rationale = profiles[crop]
    temp_fit = max(0., 1 - max(low_t-temp, temp-high_t, 0) / 12)
    moisture_fit = max(0., 1 - max(low_m-moisture, moisture-high_m, 0) / .45)
    soil_fit = 1.0 if soil_type in soil_preferences[crop] else .56
    score = round(100 * (.34*temp_fit + .27*moisture_fit + .16*(.72 + veg*.28) + .10*min(1., .55 + rain/80) + .13*soil_fit))
    soil_note = "Matches the selected soil type." if soil_fit == 1 else f"May need soil amendment or drainage management for {soil_type.lower()} soil."
    return {"crop": crop, "score": max(0,min(100,score)), "rationale": f"{rationale} {soil_note}", "condition": "Promising" if score >= 74 else "Conditional" if score >= 55 else "Low fit"}

def assess_land(image_path: str, location: str, soil_type: str) -> dict[str, Any]:
    vegetation, moisture, assessment = _image_proxies(image_path)
    weather = get_weather(location)
    crops = sorted([_score(crop, vegetation, moisture, weather.get("temperature_c"), weather.get("forecast_rainfall_mm"), soil_type) for crop in ("Maize","Millet","Rice","Wheat","Chickpea")], key=lambda item: item["score"], reverse=True)
    return {"weather": weather, "vegetation": vegetation, "moisture": moisture, "assessment": assessment, "crops": crops}
