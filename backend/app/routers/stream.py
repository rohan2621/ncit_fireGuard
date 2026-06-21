import asyncio
import subprocess
import threading
import time
import uuid
import cv2
from fastapi import APIRouter, BackgroundTasks
from app.database import SessionLocal
from app.routers.detect import _process_frame_bytes

ACTIVE_STREAMS: dict[str, dict] = {}

router = APIRouter(prefix="/detect", tags=["detect"])

MAX_WATCH_SECONDS = 120
OPEN_TIMEOUT_SECONDS = 20
FRAME_INTERVAL = 0.5  # read a frame every 0.5s max — prevents spin loop


def _open_capture_with_timeout(direct_url: str, timeout: float):
    cap_holder = [None]
    done = threading.Event()

    def _open():
        cap_holder[0] = cv2.VideoCapture(direct_url, cv2.CAP_FFMPEG)
        done.set()

    t = threading.Thread(target=_open, daemon=True)
    t.start()

    if not done.wait(timeout):
        raise TimeoutError(f"VideoCapture open timed out after {timeout}s")

    return cap_holder[0]


def _read_frame_with_timeout(cap: cv2.VideoCapture, timeout: float):
    result = [None, None]
    done = threading.Event()

    def _read():
        result[0], result[1] = cap.read()
        done.set()

    t = threading.Thread(target=_read, daemon=True)
    t.start()

    if not done.wait(timeout):
        raise TimeoutError("cap.read() timed out")

    return result[0], result[1]


def _resolve_and_open(public_url: str, max_attempts: int = 3):
    for attempt in range(1, max_attempts + 1):
        try:
            result = subprocess.run(
                ["yt-dlp", "-f", "best[ext=mp4]/best", "-g", public_url],
                capture_output=True,
                text=True,
                timeout=60,
            )
        except subprocess.TimeoutExpired:
            print(f"[{public_url}] yt-dlp timed out on attempt {attempt}/{max_attempts}")
            if attempt < max_attempts:
                time.sleep(3)
            continue

        if result.returncode != 0 or not result.stdout.strip():
            print(
                f"[{public_url}] yt-dlp attempt {attempt}/{max_attempts} failed: "
                f"{result.stderr.strip()[-300:]}"
            )
            if attempt < max_attempts:
                time.sleep(3)
            continue

        direct_url = result.stdout.strip().splitlines()[0]
        print(f"[{public_url}] Resolved URL (attempt {attempt}):")
        print(direct_url)

        try:
            cap = _open_capture_with_timeout(direct_url, OPEN_TIMEOUT_SECONDS)
        except TimeoutError:
            print(
                f"[{public_url}] VideoCapture open stalled on attempt "
                f"{attempt}/{max_attempts}, re-resolving..."
            )
            if attempt < max_attempts:
                time.sleep(2)
            continue

        if cap is None or not cap.isOpened():
            if cap:
                cap.release()
            print(
                f"[{public_url}] VideoCapture not opened on attempt "
                f"{attempt}/{max_attempts}, re-resolving..."
            )
            if attempt < max_attempts:
                time.sleep(2)
            continue

        return cap, direct_url

    return None, ""


async def _watch_stream(
    stream_id: str,
    public_url: str,
    lat: float,
    lng: float,
    name: str,
):
    tag = f"[{name or public_url} @ {lat},{lng}]"
    db = None
    cap = None

    try:
        print(f"🔍 {tag} Resolving and opening stream...")

        cap, direct_url = await asyncio.wait_for(
            asyncio.to_thread(_resolve_and_open, public_url),
            timeout=200,
        )

        if cap is None:
            print(f"❌ {tag} Failed to resolve and open stream after all attempts")
            return

        print(f"✅ {tag} Stream resolved and opened")

        source_id = f"stream:{name or public_url}:{lat}:{lng}"
        db = SessionLocal()

        frame_idx = 0
        start_time = time.time()
        last_frame_time = 0.0

        while True:
            # Manual stop check
            if stream_id not in ACTIVE_STREAMS:
                print(f"🛑 {tag} Stopped remotely")
                break

            elapsed = time.time() - start_time
            if elapsed > MAX_WATCH_SECONDS:
                print(f"⏱️ {tag} Max watch time ({MAX_WATCH_SECONDS}s) reached, stopping")
                break

            # ── Pace frame reads — don't spin ──────────────────────────
            now = time.time()
            since_last = now - last_frame_time
            if since_last < FRAME_INTERVAL:
                await asyncio.sleep(FRAME_INTERVAL - since_last)
                continue

            remaining = MAX_WATCH_SECONDS - elapsed
            read_timeout = min(15.0, remaining)

            try:
                ret, frame = await asyncio.to_thread(
                    _read_frame_with_timeout, cap, read_timeout
                )
            except TimeoutError:
                print(f"⏱️ {tag} Frame read timed out, stopping")
                break

            last_frame_time = time.time()

            if not ret:
                print(f"⚠️ {tag} Stream ended (ret=False) — video finished or connection dropped")
                break

            # Process every 10th frame (every ~5s at 0.5s interval)
            if frame_idx % 10 == 0:
                ok, buf = cv2.imencode(".jpg", frame)
                if ok:
                    await _process_frame_bytes(
                        buf.tobytes(),
                        source_id,
                        "stream",
                        lat,
                        lng,
                        db,
                    )

            frame_idx += 1

    except asyncio.TimeoutError:
        print(f"❌ {tag} Resolve+open exceeded total time budget, giving up")

    except Exception as e:
        print(f"❌ {tag} Stream watcher crashed: {e}")

    finally:
        if cap is not None:
            cap.release()
        if db is not None:
            db.close()
        ACTIVE_STREAMS.pop(stream_id, None)
        print(f"🛑 {tag} Stream watch ended")


@router.post("/stream")
async def detect_stream(
    url: str,
    lat: float,
    lng: float,
    name: str = "",
    background_tasks: BackgroundTasks = None,
):
    stream_id = str(uuid.uuid4())

    ACTIVE_STREAMS[stream_id] = {
        "url": url,
        "lat": lat,
        "lng": lng,
        "name": name,
    }

    background_tasks.add_task(
        _watch_stream,
        stream_id,
        url,
        lat,
        lng,
        name,
    )

    return {
        "status": "watching",
        "stream_id": stream_id,
        "url": url,
        "lat": lat,
        "lng": lng,
        "name": name,
        "max_duration_seconds": MAX_WATCH_SECONDS,
    }


@router.delete("/stream/{stream_id}")
async def stop_stream(stream_id: str):
    if stream_id not in ACTIVE_STREAMS:
        return {"status": "not_found", "stream_id": stream_id}

    info = ACTIVE_STREAMS.pop(stream_id)
    return {
        "status": "stopped",
        "stream_id": stream_id,
        **info,
    }


@router.get("/stream/active")
async def list_active_streams():
    return {
        "active_streams": [
            {"stream_id": sid, **info}
            for sid, info in ACTIVE_STREAMS.items()
        ],
        "count": len(ACTIVE_STREAMS),
    }