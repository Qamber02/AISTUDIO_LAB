import json
import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, Optional

from ..society.engine import SocietySimulationEngine

router = APIRouter(prefix="/api/society", tags=["society"])
engine = SocietySimulationEngine()


class GodActionRequest(BaseModel):
    action_type: str  # inject_crystals, trigger_crisis, grant_weapon, force_election, sponsor_law
    payload: Dict[str, Any] = {}


class SpeedRequest(BaseModel):
    speed: int  # 1, 2, 5


@router.get("/state")
def get_society_state():
    return engine.get_full_state()


@router.post("/step")
def step_simulation():
    with engine.lock:
        engine.step_simulation()
    return engine.get_full_state()


@router.post("/toggle-play")
def toggle_play():
    engine.is_running = not engine.is_running
    return {"is_running": engine.is_running}


@router.post("/speed")
def set_speed(req: SpeedRequest):
    if req.speed in [1, 2, 5]:
        engine.speed = req.speed
    return {"speed": engine.speed}


@router.post("/god-action")
def apply_god_action(req: GodActionRequest):
    message = engine.god_action(req.action_type, req.payload)
    return {"status": "success", "message": message, "state": engine.get_full_state()}


@router.websocket("/ws")
async def society_websocket(websocket: WebSocket):
    await websocket.accept()
    engine.loop = asyncio.get_running_loop()
    engine.register_websocket(websocket)

    # Send initial state immediately
    await websocket.send_text(json.dumps(engine.get_full_state()))

    try:
        while True:
            data = await websocket.receive_text()
            # Handle incoming WebSocket client commands (pause, play, speed)
            try:
                msg = json.loads(data)
                cmd = msg.get("command")
                if cmd == "toggle-play":
                    engine.is_running = not engine.is_running
                elif cmd == "step":
                    with engine.lock:
                        engine.step_simulation()
                elif cmd == "speed":
                    engine.speed = int(msg.get("speed", 1))
            except Exception:
                pass
    except WebSocketDisconnect:
        engine.unregister_websocket(websocket)
    except Exception:
        engine.unregister_websocket(websocket)
