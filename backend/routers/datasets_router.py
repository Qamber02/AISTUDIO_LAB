import os
import json
import pandas as pd
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from typing import List, Optional

from ..db import get_db_connection, DATASETS_DIR
from ..schemas import SyntheticDatasetRequest, DatasetResponse, DatasetPreviewResponse
from ..ml.datasets import generate_synthetic_dataset, parse_and_save_csv

router = APIRouter(prefix="/api/datasets", tags=["datasets"])


@router.post("/synthetic", response_model=DatasetResponse)
def create_synthetic(req: SyntheticDatasetRequest):
    dataset_id, ds_dict = generate_synthetic_dataset(
        name=req.name,
        preset=req.preset,
        task_type=req.task_type,
        n_samples=req.n_samples,
        n_features=req.n_features,
        noise=req.noise,
        n_classes=req.n_classes,
        random_state=req.random_state,
    )
    return ds_dict


@router.post("/upload", response_model=DatasetResponse)
async def upload_csv(
    file: UploadFile = File(...),
    name: Optional[str] = Form(None),
    target_col: Optional[str] = Form(None),
):
    dataset_name = name or (file.filename.replace(".csv", "") if file.filename else "Uploaded Dataset")
    content = await file.read()
    try:
        dataset_id, ds_dict = parse_and_save_csv(name=dataset_name, file_content_bytes=content, target_col=target_col)
        return ds_dict
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse CSV file: {str(e)}")


@router.get("", response_model=List[DatasetResponse])
def list_datasets():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM datasets ORDER BY created_at DESC")
    rows = cursor.fetchall()
    conn.close()

    result = []
    for r in rows:
        result.append({
            "id": r["id"],
            "name": r["name"],
            "source_type": r["source_type"],
            "task_type": r["task_type"],
            "row_count": r["row_count"],
            "feature_count": r["feature_count"],
            "features": json.loads(r["features_json"] or "[]"),
            "target_name": r["target_name"],
            "generator_config": json.loads(r["generator_config_json"] or "{}"),
            "summary_stats": json.loads(r["summary_stats_json"] or "{}"),
            "created_at": r["created_at"],
        })
    return result


@router.get("/{dataset_id}", response_model=DatasetResponse)
def get_dataset(dataset_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM datasets WHERE id = ?", (dataset_id,))
    r = cursor.fetchone()
    conn.close()

    if not r:
        raise HTTPException(status_code=404, detail="Dataset not found")

    return {
        "id": r["id"],
        "name": r["name"],
        "source_type": r["source_type"],
        "task_type": r["task_type"],
        "row_count": r["row_count"],
        "feature_count": r["feature_count"],
        "features": json.loads(r["features_json"] or "[]"),
        "target_name": r["target_name"],
        "generator_config": json.loads(r["generator_config_json"] or "{}"),
        "summary_stats": json.loads(r["summary_stats_json"] or "{}"),
        "created_at": r["created_at"],
    }


@router.get("/{dataset_id}/preview", response_model=DatasetPreviewResponse)
def preview_dataset(dataset_id: str, limit: int = 50):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM datasets WHERE id = ?", (dataset_id,))
    r = cursor.fetchone()
    conn.close()

    if not r or not os.path.exists(r["file_path"]):
        raise HTTPException(status_code=404, detail="Dataset file not found")

    df = pd.read_csv(r["file_path"])
    preview_df = df.head(limit).fillna("None")

    return {
        "id": r["id"],
        "name": r["name"],
        "features": json.loads(r["features_json"] or "[]"),
        "target_name": r["target_name"],
        "total_rows": len(df),
        "rows": preview_df.to_dict(orient="records"),
    }


@router.delete("/{dataset_id}")
def delete_dataset(dataset_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT file_path FROM datasets WHERE id = ?", (dataset_id,))
    r = cursor.fetchone()
    if r and os.path.exists(r["file_path"]):
        try:
            os.remove(r["file_path"])
        except Exception:
            pass

    cursor.execute("DELETE FROM datasets WHERE id = ?", (dataset_id,))
    conn.commit()
    conn.close()
    return {"status": "success", "message": "Dataset deleted successfully"}
