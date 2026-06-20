import os
import requests
from fastapi import APIRouter

router = APIRouter(prefix="/satellite", tags=["satellite"])

FIRMS_API_KEY = os.getenv("FIRMS_API_KEY", "")
FIRMS_URL = "https://firms.modaps.eosdis.nasa.gov/api/area/csv/{key}/VIIRS_SNPP_NRT/{bbox}/2"

@router.get("/firms")
def get_firms_hotspots(min_lng: float, min_lat: float, max_lng: float, max_lat: float):
    """Polls NASA FIRMS for active fire hotspots in a bounding box."""
    if not FIRMS_API_KEY:
        return {"error": "FIRMS_API_KEY not set", "features": []}

    bbox = f"{min_lng},{min_lat},{max_lng},{max_lat}"
    url = FIRMS_URL.format(key=FIRMS_API_KEY, bbox=bbox)

    try:
        resp = requests.get(url, timeout=10)
        resp.raise_for_status()
        lines = resp.text.strip().split("\n")[1:]  # skip CSV header row

        features = []
        for line in lines:
            parts = line.split(",")
            if len(parts) < 9:
                continue
            features.append({
                "lat": float(parts[0]),
                "lng": float(parts[1]),
                "confidence": parts[9],
                "source": "NASA_FIRMS",
            })
        return {"features": features}
    except Exception as e:
        return {"error": str(e), "features": []}
