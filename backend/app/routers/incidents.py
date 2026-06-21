from datetime import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import inspect as sa_inspect

from app.database import get_db
from app.models import Incident, RiskScore, ImpactEstimate, SimulationFrame, Report

router = APIRouter(prefix="/incidents", tags=["incidents"])


def _row_to_dict(row) -> dict:
    """Generic SQLAlchemy row -> dict, converting datetimes to ISO strings.
    Avoids hardcoding column names so it stays correct even if the model
    gains/loses fields later."""
    if row is None:
        return None
    out = {}
    for col in sa_inspect(row).mapper.column_attrs:
        value = getattr(row, col.key)
        if isinstance(value, datetime):
            value = value.isoformat()
        out[col.key] = value
    return out


@router.get("")
async def list_incidents(limit: int = 50, db: Session = Depends(get_db)):
    """Returns current incidents with their latest risk/impact/simulation/report
    data attached, so the frontend can sync state on page load or WS reconnect
    instead of relying solely on live-pushed WebSocket messages."""
    incidents = (
        db.query(Incident)
        .order_by(Incident.timestamp.desc())
        .limit(limit)
        .all()
    )

    results = []
    for incident in incidents:
        risk = (
            db.query(RiskScore)
            .filter(RiskScore.incident_id == incident.id)
            .order_by(RiskScore.created_at.desc())
            .first()
        )
        impact = (
            db.query(ImpactEstimate)
            .filter(ImpactEstimate.incident_id == incident.id)
            .order_by(ImpactEstimate.created_at.desc())
            .first()
        )
        simulation_frames = (
            db.query(SimulationFrame)
            .filter(SimulationFrame.incident_id == incident.id)
            .order_by(SimulationFrame.minute_offset.asc())
            .all()
        )
        report = (
            db.query(Report)
            .filter(Report.incident_id == incident.id)
            .order_by(Report.generated_at.desc())
            .first()
        )

        results.append({
            "incident": _row_to_dict(incident),
            "risk": _row_to_dict(risk),
            "impact": _row_to_dict(impact),
            "simulation": [_row_to_dict(f) for f in simulation_frames],
            "report": _row_to_dict(report),
        })

    return {"incidents": results}
