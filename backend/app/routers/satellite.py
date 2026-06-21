import os
import time
import requests
from fastapi import APIRouter
from app.ws_manager import manager
ACTIVE_STREAMS = set()
router = APIRouter(prefix="/satellite", tags=["satellite"])

FIRMS_API_KEY = os.getenv("FIRMS_API_KEY", "")
FIRMS_URL = "https://firms.modaps.eosdis.nasa.gov/api/area/csv/{key}/VIIRS_SNPP_NRT/{bbox}/2"

# Tracks scheduler status so the frontend can display real info, not guesswork
scan_status = {
    "last_scan_at": None,
    "last_scan_count": 0,
    "next_scan_in_seconds": None,
    "is_running": False,
}


async def scan_for_hotspots(min_lng: float, min_lat: float, max_lng: float, max_lat: float):
    """Core FIRMS lookup, shared by the on-demand REST endpoint and the
    background scheduler — one source of truth, no duplicated logic."""
    if not FIRMS_API_KEY:
        return {"error": "FIRMS_API_KEY not set", "features": []}

    bbox = f"{min_lng},{min_lat},{max_lng},{max_lat}"
    url = FIRMS_URL.format(key=FIRMS_API_KEY, bbox=bbox)

    try:
        resp = requests.get(url, timeout=10)
        resp.raise_for_status()
        lines = resp.text.strip().split("\n")[1:]

        features = []
        for line in lines:
            parts = line.split(",")
            if len(parts) < 9:
                continue
            hotspot = {
                "lat": float(parts[0]),
                "lng": float(parts[1]),
                "confidence": parts[9],
                "source": "NASA_FIRMS",
            }
            features.append(hotspot)
            await manager.broadcast("satellite_hotspot", f"firms:{hotspot['lat']}:{hotspot['lng']}", hotspot)

        return {"features": features}
    except Exception as e:
        return {"error": str(e), "features": []}


@router.get("/firms")
async def get_firms_hotspots(min_lng: float, min_lat: float, max_lng: float, max_lat: float):
    """On-demand check of a specific bounding box."""
    return await scan_for_hotspots(min_lng, min_lat, max_lng, max_lat)


@router.get("/status")
def get_scan_status():
    """Lets the frontend show real scheduler info — last scan time, count, etc."""
    return scan_status