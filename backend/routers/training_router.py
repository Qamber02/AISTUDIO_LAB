import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException
from typing import Optional

from ..schemas import TrainingStartRequest
from ..ml.training_manager import TrainingManager

router = APIRouter(prefix="/api/training", tags=["training"])
manager = TrainingManager()


@router.post("/{model_id}/start")
def start_training(model_id: str, req: Optional[TrainingStartRequest] = None):
    test_split = req.test_split if req else 0.2
    val_split = req.val_split if req else 0.15
    scaler_type = req.scaler_type if req else "standard"
    epochs = req.epochs if req and req.epochs else 100
    batch_size = req.batch_size if req and req.batch_size else 32
    learning_rate = req.learning_rate if req and req.learning_rate else 0.01

    success, message = manager.start_training(
        model_id=model_id,
        test_split=test_split,
        val_split=val_split,
        scaler_type=scaler_type,
        epochs=epochs,
        batch_size=batch_size,
        learning_rate=learning_rate,
    )
    if not success:
        raise HTTPException(status_code=400, detail=message)
    return {"status": "success", "message": message}


@router.post("/{model_id}/pause")
def pause_training(model_id: str):
    success = manager.pause_training(model_id)
    if not success:
        raise HTTPException(status_code=400, detail="Cannot pause: model is not currently training.")
    return {"status": "success", "message": "Training paused"}


@router.post("/{model_id}/resume")
def resume_training(model_id: str):
    success = manager.resume_training(model_id)
    if not success:
        raise HTTPException(status_code=400, detail="Cannot resume: model is not paused.")
    return {"status": "success", "message": "Training resumed"}


@router.post("/{model_id}/stop")
def stop_training(model_id: str):
    success = manager.stop_training(model_id)
    if not success:
        raise HTTPException(status_code=400, detail="Cannot stop: no active session.")
    return {"status": "success", "message": "Training stopped"}


@router.get("/{model_id}/status")
def get_training_status(model_id: str):
    session = manager.sessions.get(model_id)
    if not session:
        return {"status": "idle", "latest_tick": None}
    return {
        "status": session.status,
        "latest_tick": session.latest_tick,
    }


# WebSocket endpoint for bi-directional live telemetry & control
@router.websocket("/ws/{model_id}")
async def training_websocket(websocket: WebSocket, model_id: str):
    await websocket.accept()
    manager.register_websocket(model_id, websocket)

    # Send current state immediately on connect
    session = manager.sessions.get(model_id)
    if session and session.latest_tick:
        await websocket.send_text(json.dumps(session.latest_tick))

    try:
        while True:
            data_text = await websocket.receive_text()
            try:
                msg = json.loads(data_text)
                action = msg.get("action")
                if action == "pause":
                    manager.pause_training(model_id)
                elif action == "resume":
                    manager.resume_training(model_id)
                elif action == "stop":
                    manager.stop_training(model_id)
            except Exception:
                pass
    except WebSocketDisconnect:
        manager.unregister_websocket(model_id, websocket)
    except Exception:
        manager.unregister_websocket(model_id, websocket)
