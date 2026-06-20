from fastapi import FastAPI, WebSocket, WebSocketDisconnect

from app.database import Base, engine
from app import models
from app.ws_manager import manager
from app.routers import detect, risk, simulate, impact, report, satellite, stream
Base.metadata.create_all(bind=engine)

app = FastAPI(title="FireGuard Nexus")

app.include_router(detect.router)
app.include_router(risk.router)
app.include_router(simulate.router)
app.include_router(impact.router)
app.include_router(report.router)
app.include_router(satellite.router)
app.include_router(stream.router)

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
    return {"status": "ok"}
