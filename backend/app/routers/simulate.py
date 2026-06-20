from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Incident, RiskScore, SimulationFrame
from app.services.simulation import run_simulation
from app.ws_manager import manager

router = APIRouter(prefix="/simulate", tags=["simulate"])


@router.post("/{incident_id}")
async def simulate_spread(incident_id: str, db: Session = Depends(get_db)):
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(404, "Incident not found")

    latest_risk = (db.query(RiskScore)
                   .filter(RiskScore.incident_id == incident_id)
                   .order_by(RiskScore.created_at.desc()).first())
    weather = latest_risk.weather_data if latest_risk else {"wind_speed": 15, "wind_dir": 200}

    frames = run_simulation(incident.lat, incident.lng, weather["wind_speed"], weather["wind_dir"])

    for minute_offset, polygon in frames.items():
        frame = SimulationFrame(incident_id=incident.id, minute_offset=minute_offset,
                                 polygon_geojson=polygon)
        db.add(frame)
        await manager.broadcast("simulation_frame", incident.id, {
            "minute_offset": minute_offset, "polygon_geojson": polygon,
        })
    db.commit()

    return {"frames": frames}
