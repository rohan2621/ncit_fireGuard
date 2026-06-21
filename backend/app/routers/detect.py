import math
import tempfile
import os
from datetime import datetime
import cv2
import numpy as np
from fastapi import APIRouter, UploadFile, File, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Incident, RiskScore, SimulationFrame, ImpactEstimate, Report
from app.ml.detector import detect_fire
from app.services.temporal_confirmation import confirmer
from app.services.authority import find_nearest_authority
from app.services.alert import send_authority_alert
from app.services.weather import get_weather
from app.ml.risk_model import predict_risk
from app.services.simulation import run_simulation
from app.services.impact import estimate_impact, polygon_area_hectares
from app.services.report import generate_report
from app.ws_manager import manager

router = APIRouter(prefix="/detect", tags=["detect"])


async def _run_pipeline(incident: Incident, db: Session):
    """Chains risk -> simulation -> impact -> report after an incident is confirmed,
    broadcasting each stage live as it completes. Each stage is wrapped separately
    so a failure partway through doesn't silently lose earlier stages."""
    try:
        weather = get_weather(incident.lat, incident.lng)
        vegetation_density = 0.6
        score, feature_importance = predict_risk(
            weather, vegetation_density,
            hour_of_day=datetime.utcnow().hour,
            is_dry_season=True,
        )
        db.add(RiskScore(incident_id=incident.id, score=score,
                          feature_importance=feature_importance, weather_data=weather))
        db.commit()
        await manager.broadcast("risk_update", incident.id, {
            "score": score,
            "feature_importance": feature_importance,
            "weather_data": {
                **weather,
                "temperature": weather["temp"],
                "wind_direction": weather["wind_dir"],
            },
        })
        print(f"✅ Risk computed: {score}")
    except Exception as e:
        print(f"⚠️ Risk step failed: {e}")
        return

    try:
        frames = run_simulation(incident.lat, incident.lng, weather["wind_speed"], weather["wind_dir"])
        for minute_offset, polygon in frames.items():
            db.add(SimulationFrame(incident_id=incident.id, minute_offset=minute_offset,
                                    polygon_geojson=polygon))
            await manager.broadcast("simulation_frame", incident.id, {
                "minute_offset": minute_offset, "polygon_geojson": polygon,
            })
        db.commit()
        print(f"✅ Simulation: {len(frames)} frames")
    except Exception as e:
        print(f"⚠️ Simulation step failed: {e}")
        return

    try:
        latest_frame = (db.query(SimulationFrame)
                         .filter(SimulationFrame.incident_id == incident.id)
                         .order_by(SimulationFrame.minute_offset.desc()).first())
        area_hectares = polygon_area_hectares(latest_frame.polygon_geojson)
        impact = estimate_impact(area_hectares)
        db.add(ImpactEstimate(incident_id=incident.id, **impact))
        db.commit()
        await manager.broadcast("impact_update", incident.id, impact)
        print(f"✅ Impact computed: {impact}")
    except Exception as e:
        print(f"⚠️ Impact step failed: {e}")
        return

    try:
        frame_180 = (db.query(SimulationFrame)
                     .filter(SimulationFrame.incident_id == incident.id,
                             SimulationFrame.minute_offset == 180).first())
        if not frame_180:
            print("⚠️ Report step skipped — no 180-minute simulation frame found")
            return
        area_ha = impact["trees_lost"] / 400
        radius_m = math.sqrt(area_ha * 10000 / math.pi)
        content = generate_report(
            incident, score, weather,
            {"trees_lost": impact["trees_lost"], "wildlife_affected": impact["wildlife_affected"],
             "co2_tons": impact["co2_tons"], "dollar_damage": impact["dollar_damage"]},
            radius_m,
        )
        db.add(Report(incident_id=incident.id, content=content))
        db.commit()
        await manager.broadcast("report_ready", incident.id, {"content": content})
        print("✅ Report generated")
    except Exception as e:
        print(f"⚠️ Report step failed: {e}")


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

        authority, distance_km = find_nearest_authority(incident.lat, incident.lng)
        send_authority_alert(incident, authority["name"], distance_km)

        await manager.broadcast("detection_new", incident.id, {
            "lat": incident.lat, "lng": incident.lng,
            "timestamp": incident.timestamp.isoformat(),
            "confidence": incident.confidence,
            "source": incident.source,
            "location_name": f"Near {authority['name']}",
        })

        await _run_pipeline(incident, db)

        return {"status": "incident_created", "incident_id": incident.id}
    return {"status": "monitoring", "positive": result is not None}


@router.post("/upload")
async def detect_upload(file: UploadFile = File(...), lat: float = 0.0, lng: float = 0.0,
                         db: Session = Depends(get_db)):
    contents = await file.read()
    tmp_dir = tempfile.gettempdir()
    tmp_path = os.path.join(tmp_dir, file.filename)
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
                break
        frame_idx += 1
    cap.release()
    if incident_id:
        return {"status": "incident_created", "incident_id": incident_id,
                "positive_frames": positive_frames, "total_sampled": total_sampled}
    return {"status": "no_incident", "positive_frames": positive_frames, "total_sampled": total_sampled}


@router.post("/webcam")
async def detect_webcam(file: UploadFile = File(...), lat: float = 0.0, lng: float = 0.0,
                         db: Session = Depends(get_db)):
    contents = await file.read()
    return await _process_frame_bytes(contents, "webcam:live", "webcam", lat, lng, db)