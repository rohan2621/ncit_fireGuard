from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Incident, SimulationFrame, ImpactEstimate
from app.services.impact import estimate_impact, polygon_area_hectares
from app.ws_manager import manager

router = APIRouter(prefix="/impact", tags=["impact"])


@router.post("/{incident_id}")
async def compute_impact(incident_id: str, db: Session = Depends(get_db)):
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(404, "Incident not found")

    latest_frame = (db.query(SimulationFrame)
                     .filter(SimulationFrame.incident_id == incident_id)
                     .order_by(SimulationFrame.minute_offset.desc()).first())
    if not latest_frame:
        raise HTTPException(400, "Run /simulate first")

    area_hectares = polygon_area_hectares(latest_frame.polygon_geojson)
    impact = estimate_impact(area_hectares)

    record = ImpactEstimate(incident_id=incident.id, **impact)
    db.add(record)
    db.commit()

    await manager.broadcast("impact_update", incident.id, impact)
    return impact
