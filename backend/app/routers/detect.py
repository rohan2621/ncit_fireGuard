import cv2
import numpy as np
from fastapi import APIRouter, UploadFile, File, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Incident
from app.ml.detector import detect_fire
from app.services.temporal_confirmation import confirmer
from app.ws_manager import manager

router = APIRouter(prefix="/detect", tags=["detect"])


async def _process_frame_bytes(frame_bytes: bytes, source_id: str, source_type: str,
                                lat: float, lng: float, db: Session):
    if not frame_bytes:
        return {"status": "bad_frame"}

    nparr = np.frombuffer(frame_bytes, np.uint8)
    try:
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    except Exception:
        return {"status": "bad_frame"}

    if frame is None:
        return {"status": "bad_frame"}
    result = detect_fire(frame)
    confirmed = confirmer.update(source_id, detected=result is not None)

    if confirmed:
        incident = Incident(
            lat=lat, lng=lng,
            confidence=result["confidence"],
            status="confirmed",
            source=source_type,
        )
        db.add(incident)
        db.commit()
        db.refresh(incident)

        await manager.broadcast("detection_new", incident.id, {
            "lat": incident.lat, "lng": incident.lng,
            "timestamp": incident.timestamp.isoformat(),
            "confidence": incident.confidence,
            "source": incident.source,
        })
        return {"status": "incident_created", "incident_id": incident.id}

    return {"status": "monitoring", "positive": result is not None}


@router.post("/upload")
async def detect_upload(file: UploadFile = File(...), lat: float = 0.0, lng: float = 0.0,
                         db: Session = Depends(get_db)):
    contents = await file.read()
    tmp_path = f"/tmp/{file.filename}"
    with open(tmp_path, "wb") as f:
        f.write(contents)

    cap = cv2.VideoCapture(tmp_path)
    source_id = f"upload:{file.filename}"
    frame_idx = 0
    positive_frames = 0
    total_sampled = 0
    incident_id = None

    while True:
        ret, frame = cap.read()
        if not ret:
            break
        if frame_idx % 5 == 0:
            ok, buf = cv2.imencode(".jpg", frame)
            result = await _process_frame_bytes(buf.tobytes(), source_id, "upload", lat, lng, db)
            total_sampled += 1
            if result.get("positive"):
                positive_frames += 1
            if result.get("status") == "incident_created":
                incident_id = result["incident_id"]
                break  # stop early once confirmed, no need to keep scanning
        frame_idx += 1

    cap.release()

    if incident_id:
        return {"status": "incident_created", "incident_id": incident_id,
                "positive_frames": positive_frames, "total_sampled": total_sampled}
    return {"status": "no_incident", "positive_frames": positive_frames, "total_sampled": total_sampled}
@router.post("/webcam")
async def detect_webcam(file: UploadFile = File(...), lat: float = 0.0, lng: float = 0.0,
                         db: Session = Depends(get_db)):
    """Browser sends one frame (JPEG blob) at a time via repeated POSTs —
    the frontend's getUserMedia loop calls this every ~1 second."""
    contents = await file.read()
    return await _process_frame_bytes(contents, "webcam:live", "webcam", lat, lng, db)
