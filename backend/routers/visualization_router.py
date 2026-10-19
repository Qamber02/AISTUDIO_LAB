import os
import json
import joblib
import pandas as pd
import numpy as np
from fastapi import APIRouter, HTTPException

from ..db import get_db_connection, MODELS_DIR
from ..schemas import BoundarySliceRequest, BoundarySliceResponse, KNNQueryRequest, KNNQueryResponse
from ..ml.models_neural import InspectableNeuralNetwork
from ..ml.visualization_engine import (
    generate_boundary_slice,
    extract_decision_tree_hierarchy,
    extract_feature_importances,
)

router = APIRouter(prefix="/api/visualization", tags=["visualization"])


def load_model_and_dataset(model_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT m.*, d.file_path as dataset_path, d.target_name, d.features_json
        FROM models m
        LEFT JOIN datasets d ON m.dataset_id = d.id
        WHERE m.id = ?
    """, (model_id,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        raise HTTPException(status_code=404, detail="Model not found")

    model_type = row["model_type"]
    task_type = row["task_type"]
    feature_names = json.loads(row["features_json"] or "[]")
    target_name = row["target_name"]

    df = None
    if row["dataset_path"] and os.path.exists(row["dataset_path"]):
        df = pd.read_csv(row["dataset_path"])

    # Load model artifact
    model_obj = None
    npz_path = os.path.join(MODELS_DIR, f"{model_id}.npz")
    joblib_path = os.path.join(MODELS_DIR, f"{model_id}.joblib")

    if os.path.exists(npz_path):
        model_obj = InspectableNeuralNetwork.load_from_npz(npz_path)
    elif os.path.exists(joblib_path):
        model_obj = joblib.load(joblib_path)

    return model_obj, row, df, feature_names, target_name


@router.post("/{model_id}/boundary", response_model=BoundarySliceResponse)
def get_boundary_slice(model_id: str, req: BoundarySliceRequest):
    model_obj, row, df, feature_names, target_name = load_model_and_dataset(model_id)
    if not model_obj:
        raise HTTPException(status_code=400, detail="Model has not been trained yet.")

    # Calculate feature ranges from dataset
    feature_ranges = {}
    if df is not None:
        for f in feature_names:
            if f in df.columns:
                series = pd.to_numeric(df[f], errors="coerce").dropna()
                feature_ranges[f] = {
                    "min": float(series.min()),
                    "max": float(series.max()),
                    "mean": float(series.mean()),
                }

    try:
        slice_result = generate_boundary_slice(
            estimator_or_pipeline=model_obj,
            feature_names=feature_names,
            feature_ranges=feature_ranges,
            feature_x=req.feature_x,
            feature_y=req.feature_y,
            resolution=req.resolution,
            fixed_features=req.fixed_features,
            task_type=row["task_type"],
            scatter_df=df,
            target_col=target_name,
        )
        return slice_result
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to generate decision boundary: {str(e)}")


@router.post("/{model_id}/knn-query", response_model=KNNQueryResponse)
def query_knn_neighbors(model_id: str, req: KNNQueryRequest):
    model_obj, row, df, feature_names, target_name = load_model_and_dataset(model_id)
    if not model_obj or row["model_type"] != "knn":
        raise HTTPException(status_code=400, detail="Model must be a trained KNN model.")

    estimator = model_obj.named_steps.get("estimator") if hasattr(model_obj, "named_steps") else model_obj
    scaler = model_obj.named_steps.get("scaler") if hasattr(model_obj, "named_steps") else None

    # Construct query vector in raw units
    query_vec = np.array([[req.query_point.get(f, 0.0) for f in feature_names]])
    query_scaled = scaler.transform(query_vec) if scaler else query_vec

    k = req.k or getattr(estimator, "n_neighbors", 5)
    distances, indices = estimator.kneighbors(query_scaled, n_neighbors=k)

    pred = model_obj.predict(query_vec)[0]

    neighbor_points = []
    if df is not None:
        for idx in indices[0]:
            if idx < len(df):
                pt = df.iloc[idx].to_dict()
                neighbor_points.append(pt)

    return {
        "query_point": req.query_point,
        "k": k,
        "neighbor_points": neighbor_points,
        "distances": distances[0].round(4).tolist(),
        "predicted_class": int(pred) if row["task_type"] == "classification" else float(round(pred, 4)),
    }


@router.get("/{model_id}/tree")
def get_tree_hierarchy(model_id: str):
    model_obj, row, df, feature_names, target_name = load_model_and_dataset(model_id)
    if not model_obj or row["model_type"] not in ["decision_tree", "random_forest"]:
        raise HTTPException(status_code=400, detail="Model must be a Decision Tree or Random Forest.")

    class_names = getattr(model_obj, "target_classes_", None)
    hierarchy = extract_decision_tree_hierarchy(model_obj, feature_names, class_names)
    return {"hierarchy": hierarchy}


@router.get("/{model_id}/feature-importances")
def get_importances(model_id: str):
    model_obj, row, df, feature_names, target_name = load_model_and_dataset(model_id)
    if not model_obj:
        raise HTTPException(status_code=400, detail="Model not trained.")

    importances = extract_feature_importances(model_obj, feature_names)
    return {"importances": importances}


@router.get("/{model_id}/neural-weights")
def get_neural_weights(model_id: str):
    model_obj, row, df, feature_names, target_name = load_model_and_dataset(model_id)
    if not model_obj or not isinstance(model_obj, InspectableNeuralNetwork):
        raise HTTPException(status_code=400, detail="Model must be a trained Neural Network.")

    summary = model_obj.get_weights_summary()
    return summary
