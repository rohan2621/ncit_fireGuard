import math
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Incident, RiskScore, ImpactEstimate, SimulationFrame, Report
from app.services.report import generate_report
from app.ws_manager import manager

router = APIRouter(prefix="/report", tags=["report"])


@router.post("/{incident_id}")
async def make_report(incident_id: str, db: Session = Depends(get_db)):
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(404, "Incident not found")

    risk = (db.query(RiskScore).filter(RiskScore.incident_id == incident_id)
            .order_by(RiskScore.created_at.desc()).first())
    impact = (db.query(ImpactEstimate).filter(ImpactEstimate.incident_id == incident_id)
              .order_by(ImpactEstimate.created_at.desc()).first())
    frame_180 = (db.query(SimulationFrame)
                 .filter(SimulationFrame.incident_id == incident_id, SimulationFrame.minute_offset == 180)
                 .first())

    if not (risk and impact and frame_180):
        raise HTTPException(400, "Run /risk, /simulate, /impact first")

    area_ha = impact.trees_lost / 400
    radius_m = math.sqrt(area_ha * 10000 / math.pi)

    content = generate_report(
        incident, risk.score, risk.weather_data,
        {"trees_lost": impact.trees_lost, "wildlife_affected": impact.wildlife_affected,
         "co2_tons": impact.co2_tons, "dollar_damage": impact.dollar_damage},
        radius_m,
    )

    record = Report(incident_id=incident.id, content=content)
    db.add(record)
    db.commit()

    await manager.broadcast("report_ready", incident.id, {"content": content})
    return {"content": content}