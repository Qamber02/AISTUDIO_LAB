import json
from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any

from ..db import get_db_connection

router = APIRouter(prefix="/api/experiments", tags=["experiments"])


@router.get("")
def list_experiments():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT e.*, m.status as current_model_status
        FROM experiments e
        LEFT JOIN models m ON e.model_id = m.id
        ORDER BY e.created_at DESC
    """)
    rows = cursor.fetchall()

    # Also fetch currently trained models for side-by-side comparison matrix
    cursor.execute("""
        SELECT m.*, d.name as dataset_name, d.row_count, d.feature_count
        FROM models m
        LEFT JOIN datasets d ON m.dataset_id = d.id
        WHERE m.status = 'trained'
        ORDER BY m.updated_at DESC
        LIMIT 10
    """)
    trained_models = cursor.fetchall()
    conn.close()

    experiments_list = []
    for r in rows:
        experiments_list.append({
            "id": r["id"],
            "model_id": r["model_id"],
            "model_name": r["model_name"],
            "model_type": r["model_type"],
            "dataset_id": r["dataset_id"],
            "dataset_name": r["dataset_name"],
            "task_type": r["task_type"],
            "hyperparameters": json.loads(r["hyperparameters_json"] or "{}"),
            "metrics": json.loads(r["metrics_json"] or "{}"),
            "duration_seconds": r["duration_seconds"],
            "total_steps": r["total_steps"],
            "created_at": r["created_at"],
        })

    comparison_matrix = []
    for m in trained_models:
        metrics = json.loads(m["metrics_json"] or "{}")
        hyperparams = json.loads(m["hyperparameters_json"] or "{}")
        comparison_matrix.append({
            "model_id": m["id"],
            "name": m["name"],
            "model_type": m["model_type"],
            "task_type": m["task_type"],
            "dataset_name": m["dataset_name"],
            "row_count": m["row_count"],
            "feature_count": m["feature_count"],
            "accuracy": metrics.get("accuracy"),
            "r2": metrics.get("r2"),
            "loss": metrics.get("loss"),
            "mse": metrics.get("mse"),
            "duration": m["total_steps"],
            "hyperparameters": hyperparams,
            "updated_at": m["updated_at"],
        })

    return {
        "experiments": experiments_list,
        "comparison_matrix": comparison_matrix,
    }


@router.delete("/{exp_id}")
def delete_experiment(exp_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM experiments WHERE id = ?", (exp_id,))
    conn.commit()
    conn.close()
    return {"status": "success", "message": "Experiment deleted"}
