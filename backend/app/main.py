from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from app.database import Base, engine
from app import models
from app.ws_manager import manager
import asyncio
import asyncio
from app.services.satellite_scheduler import run_continuous_satellite_monitoring

from app.routers.satellite import get_firms_hotspots
from app.routers import (
    detect,
    risk,
    simulate,
    impact,
    report,
    satellite,
    stream,
    incidents,
)

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="FireGuard Nexus")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(detect.router)
app.include_router(risk.router)
app.include_router(simulate.router)
app.include_router(impact.router)
app.include_router(report.router)
app.include_router(satellite.router)
app.include_router(stream.router)
app.include_router(incidents.router)

# Nepal bounding box
NEPAL_BBOX = {
    "min_lng": 79.5,
    "min_lat": 26.0,
    "max_lng": 88.5,
    "max_lat": 30.5,
}


async def poll_satellite_hotspots():
    """
    Background loop that checks NASA FIRMS for hotspots
    over Nepal every 15 minutes.
    """
    while True:
        try:
            await get_firms_hotspots(**NEPAL_BBOX)
            print("🛰️ Satellite poll complete")
        except Exception as e:
            print(f"⚠️ Satellite poll failed: {e}")

        # 15 minutes
        await asyncio.sleep(900)


@app.on_event("startup")
async def start_satellite_monitoring():
    asyncio.create_task(run_continuous_satellite_monitoring())

@app.websocket("/ws/live")
async def ws_live(websocket: WebSocket):
    await manager.connect(websocket)

    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)


@app.get("/")
def health():
    return {
        "status": "ok",
        "service": "FireGuard Nexus",
    }