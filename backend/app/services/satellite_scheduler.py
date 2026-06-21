import asyncio
import time
from app.routers.satellite import scan_for_hotspots, scan_status
from app.ws_manager import manager

# Bounding box covering all of Nepal
NEPAL_BBOX = {"min_lng": 80.0, "min_lat": 26.0, "max_lng": 88.5, "max_lat": 30.5}
SCAN_INTERVAL_SECONDS = 900  # 15 minutes — FIRMS data itself only updates a few times/day,
                              # so checking more often than this wastes calls for no new data


async def run_continuous_satellite_monitoring():
    """Runs forever in the background: scans all of Nepal for NASA FIRMS
    hotspots every SCAN_INTERVAL_SECONDS, broadcasts results, and keeps
    scan_status updated so the frontend can show real monitoring state."""
    scan_status["is_running"] = True
    while True:
        result = await scan_for_hotspots(**NEPAL_BBOX)
        count = len(result.get("features", []))

        scan_status["last_scan_at"] = time.time()
        scan_status["last_scan_count"] = count
        scan_status["next_scan_in_seconds"] = SCAN_INTERVAL_SECONDS

        await manager.broadcast("satellite_scan", "nepal-wide-scan", {
            "count": count,
            "timestamp": scan_status["last_scan_at"],
            "next_scan_in_seconds": SCAN_INTERVAL_SECONDS,
        })

        await asyncio.sleep(SCAN_INTERVAL_SECONDS)