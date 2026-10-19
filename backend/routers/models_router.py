import os
import uuid
import json
from fastapi import APIRouter, HTTPException
from typing import List, Optional

from ..db import get_db_connection, MODELS_DIR
from ..schemas import ModelCreateRequest, ModelUpdateRequest, ModelResponse

router = APIRouter(prefix="/api/models", tags=["models"])

MAX_WORKSPACE_MODELS = 10


@router.post("", response_model=ModelResponse)
def create_model(req: ModelCreateRequest):
    conn = get_db_connection()
    cursor = conn.cursor()

    # Enforce workspace limit of 10 models
    cursor.execute("SELECT COUNT(*) as cnt FROM models")
    count = cursor.fetchone()["cnt"]
    if count >= MAX_WORKSPACE_MODELS:
        conn.close()
        raise HTTPException(
            status_code=400,
            detail=f"Workspace limit reached ({MAX_WORKSPACE_MODELS} models max). Please delete or archive an existing model first."
        )

    # Check dataset if provided
    dataset_name = None
    if req.dataset_id:
        cursor.execute("SELECT name FROM datasets WHERE id = ?", (req.dataset_id,))
        ds_row = cursor.fetchone()
        if ds_row:
            dataset_name = ds_row["name"]

    model_id = f"model_{uuid.uuid4().hex[:8]}"

    # Default training params if not provided
    training_params = req.training_params or {
        "epochs": 100,
        "batch_size": 32,
        "learning_rate": 0.01,
        "test_split": 0.2,
        "val_split": 0.15,
        "scaler_type": "standard",
    }

    cursor.execute("""
        INSERT INTO models (
            id, name, description, model_type, task_type, dataset_id,
            hyperparameters_json, training_params_json, status, progress, current_step, total_steps,
            metrics_json, version
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'untrained', 0.0, 0, 0, ?, 1)
    """, (
        model_id,
        req.name,
        req.description or "",
        req.model_type,
        req.task_type,
        req.dataset_id,
        json.dumps(req.hyperparameters),
        json.dumps(training_params),
        json.dumps({}),
    ))
    conn.commit()
    conn.close()

    return {
        "id": model_id,
        "name": req.name,
        "description": req.description or "",
        "model_type": req.model_type,
        "task_type": req.task_type,
        "dataset_id": req.dataset_id,
        "dataset_name": dataset_name,
        "hyperparameters": req.hyperparameters,
        "training_params": training_params,
        "status": "untrained",
        "progress": 0.0,
        "current_step": 0,
        "total_steps": 0,
        "metrics": {},
        "version": 1,
    }


@router.get("", response_model=List[ModelResponse])
def list_models():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT m.*, d.name as dataset_name
        FROM models m
        LEFT JOIN datasets d ON m.dataset_id = d.id
        ORDER BY m.updated_at DESC
    """)
    rows = cursor.fetchall()
    conn.close()

    result = []
    for r in rows:
        result.append({
            "id": r["id"],
            "name": r["name"],
            "description": r["description"] or "",
            "model_type": r["model_type"],
            "task_type": r["task_type"],
            "dataset_id": r["dataset_id"],
            "dataset_name": r["dataset_name"],
            "hyperparameters": json.loads(r["hyperparameters_json"] or "{}"),
            "training_params": json.loads(r["training_params_json"] or "{}"),
            "status": r["status"],
            "progress": r["progress"],
            "current_step": r["current_step"],
            "total_steps": r["total_steps"],
            "metrics": json.loads(r["metrics_json"] or "{}"),
            "version": r["version"],
            "created_at": r["created_at"],
            "updated_at": r["updated_at"],
        })
    return result


@router.get("/{model_id}", response_model=ModelResponse)
def get_model(model_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT m.*, d.name as dataset_name
        FROM models m
        LEFT JOIN datasets d ON m.dataset_id = d.id
        WHERE m.id = ?
    """, (model_id,))
    r = cursor.fetchone()
    conn.close()

    if not r:
        raise HTTPException(status_code=404, detail="Model not found")

    return {
        "id": r["id"],
        "name": r["name"],
        "description": r["description"] or "",
        "model_type": r["model_type"],
        "task_type": r["task_type"],
        "dataset_id": r["dataset_id"],
        "dataset_name": r["dataset_name"],
        "hyperparameters": json.loads(r["hyperparameters_json"] or "{}"),
        "training_params": json.loads(r["training_params_json"] or "{}"),
        "status": r["status"],
        "progress": r["progress"],
        "current_step": r["current_step"],
        "total_steps": r["total_steps"],
        "metrics": json.loads(r["metrics_json"] or "{}"),
        "version": r["version"],
        "created_at": r["created_at"],
        "updated_at": r["updated_at"],
    }


@router.put("/{model_id}", response_model=ModelResponse)
def update_model(model_id: str, req: ModelUpdateRequest):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM models WHERE id = ?", (model_id,))
    r = cursor.fetchone()
    if not r:
        conn.close()
        raise HTTPException(status_code=404, detail="Model not found")

    new_name = req.name if req.name is not None else r["name"]
    new_desc = req.description if req.description is not None else r["description"]
    new_ds_id = req.dataset_id if req.dataset_id is not None else r["dataset_id"]
    new_hyper = json.dumps(req.hyperparameters) if req.hyperparameters is not None else r["hyperparameters_json"]
    new_tp = json.dumps(req.training_params) if req.training_params is not None else r["training_params_json"]

    cursor.execute("""
        UPDATE models
        SET name = ?, description = ?, dataset_id = ?, hyperparameters_json = ?,
            training_params_json = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    """, (new_name, new_desc, new_ds_id, new_hyper, new_tp, model_id))
    conn.commit()
    conn.close()
    return get_model(model_id)


@router.post("/{model_id}/clone", response_model=ModelResponse)
def clone_model(model_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) as cnt FROM models")
    if cursor.fetchone()["cnt"] >= MAX_WORKSPACE_MODELS:
        conn.close()
        raise HTTPException(
            status_code=400,
            detail=f"Workspace limit reached ({MAX_WORKSPACE_MODELS} models max)."
        )

    cursor.execute("SELECT * FROM models WHERE id = ?", (model_id,))
    orig = cursor.fetchone()
    if not orig:
        conn.close()
        raise HTTPException(status_code=404, detail="Model not found")

    new_id = f"model_{uuid.uuid4().hex[:8]}"
    new_name = f"{orig['name']} (Copy)"

    cursor.execute("""
        INSERT INTO models (
            id, name, description, model_type, task_type, dataset_id,
            hyperparameters_json, training_params_json, status, progress, current_step, total_steps,
            metrics_json, version
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'untrained', 0.0, 0, 0, '{}', 1)
    """, (
        new_id,
        new_name,
        orig["description"],
        orig["model_type"],
        orig["task_type"],
        orig["dataset_id"],
        orig["hyperparameters_json"],
        orig["training_params_json"],
    ))
    conn.commit()
    conn.close()
    return get_model(new_id)


@router.delete("/{model_id}")
def delete_model(model_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT artifact_path, weights_history_path FROM models WHERE id = ?", (model_id,))
    r = cursor.fetchone()
    if r:
        for path in [r["artifact_path"], r["weights_history_path"]]:
            if path and os.path.exists(path):
                try:
                    os.remove(path)
                except Exception:
                    pass

    # Also remove any file matching model_id in models dir
    for ext in [".joblib", ".npz"]:
        p = os.path.join(MODELS_DIR, f"{model_id}{ext}")
        if os.path.exists(p):
            try:
                os.remove(p)
            except Exception:
                pass

    cursor.execute("DELETE FROM models WHERE id = ?", (model_id,))
    cursor.execute("DELETE FROM experiments WHERE model_id = ?", (model_id,))
    conn.commit()
    conn.close()
    return {"status": "success", "message": "Model deleted successfully"}
