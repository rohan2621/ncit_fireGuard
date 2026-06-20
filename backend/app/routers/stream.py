import subprocess
import time
import cv2
from fastapi import APIRouter, BackgroundTasks
from app.database import SessionLocal
from app.routers.detect import _process_frame_bytes

router = APIRouter(prefix="/detect", tags=["detect"])

MAX_WATCH_SECONDS = 120  # hard cap for testing — raise/remove for real deployment


def _resolve_stream_url(public_url: str, max_attempts: int = 3) -> str:
    for attempt in range(1, max_attempts + 1):
        result = subprocess.run(
 	   ["yt-dlp", "-g", public_url],
    		capture_output=True, text=True, timeout=60,
		)
        if result.returncode == 0 and result.stdout.strip():
            return result.stdout.strip().split("\n")[0]
        print(f"yt-dlp attempt {attempt}/{max_attempts} failed: {result.stderr.strip()[-300:]}")
        if attempt < max_attempts:
            time.sleep(3)
    return ""

async def _watch_stream(public_url: str, lat: float, lng: float):
    direct_url = _resolve_stream_url(public_url)
    if not direct_url:
        print(f"Failed to resolve stream URL: {public_url}")
        return

    print(f"✅ Stream resolved successfully, starting capture for {public_url}")
    cap = cv2.VideoCapture(direct_url)
    source_id = f"stream:{public_url}"
    db = SessionLocal()
    frame_idx = 0
    start_time = time.time()
    try:
        while True:
            if time.time() - start_time > MAX_WATCH_SECONDS:
                print(f"⏱️ Max watch time ({MAX_WATCH_SECONDS}s) reached, stopping: {public_url}")
                break
            ret, frame = cap.read()
            if not ret:
                print(f"⚠️ Stream read failed or ended: {public_url}")
                break
            if frame_idx % 10 == 0:
                ok, buf = cv2.imencode(".jpg", frame)
                await _process_frame_bytes(buf.tobytes(), source_id, "stream", lat, lng, db)
            frame_idx += 1
    finally:
        cap.release()
        db.close()
        print(f"🛑 Stream watch ended: {public_url}")


@router.post("/stream")
async def detect_stream(url: str, lat: float, lng: float, background_tasks: BackgroundTasks):
    """Kicks off a background watch on a public livestream, capped at
    MAX_WATCH_SECONDS to prevent runaway resource usage during testing."""
    background_tasks.add_task(_watch_stream, url, lat, lng)
    return {"status": "watching", "url": url, "max_duration_seconds": MAX_WATCH_SECONDS}
