import os
import time
import json
import joblib
import pandas as pd
import numpy as np
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from typing import Dict, Any, List
from sklearn.metrics import classification_report, confusion_matrix, r2_score, mean_squared_error, mean_absolute_error

from ..db import get_db_connection, MODELS_DIR
from ..schemas import PredictRequest, PredictResponse, BatchEvaluateResponse
from ..ml.models_neural import InspectableNeuralNetwork

router = APIRouter(prefix="/api/inference", tags=["inference"])


def load_model_and_metadata(model_id: str):
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

    feature_names = json.loads(row["features_json"] or "[]")
    target_name = row["target_name"]

    model_obj = None
    npz_path = os.path.join(MODELS_DIR, f"{model_id}.npz")
    joblib_path = os.path.join(MODELS_DIR, f"{model_id}.joblib")

    if os.path.exists(npz_path):
        model_obj = InspectableNeuralNetwork.load_from_npz(npz_path)
    elif os.path.exists(joblib_path):
        model_obj = joblib.load(joblib_path)

    return model_obj, row, feature_names, target_name


@router.post("/{model_id}/predict", response_model=PredictResponse)
def predict_single(model_id: str, req: PredictRequest):
    model_obj, row, feature_names, target_name = load_model_and_metadata(model_id)
    if not model_obj:
        raise HTTPException(status_code=400, detail="Model is not trained yet.")

    t0 = time.time()

    # Build input vector in raw physical units
    input_vector = np.array([[req.features.get(f, 0.0) for f in feature_names]])

    probabilities = None
    prediction = None

    if isinstance(model_obj, InspectableNeuralNetwork):
        # Scale using stored scaler_params
        scaler_p = model_obj.scaler_params
        if "mean" in scaler_p and "scale" in scaler_p:
            mean = np.array(scaler_p["mean"])
            scale = np.array(scaler_p["scale"])
            input_scaled = (input_vector - mean) / (scale + 1e-12)
        elif "min" in scaler_p and "scale" in scaler_p:
            min_val = np.array(scaler_p["min"])
            scale = np.array(scaler_p["scale"])
            input_scaled = (input_vector - min_val) / (scale + 1e-12)
        else:
            input_scaled = input_vector

        pred_raw = model_obj.predict(input_scaled)[0]
        if row["task_type"] == "classification":
            probs = model_obj.predict_proba(input_scaled)[0]
            labels = model_obj.class_labels or [f"Class {i}" for i in range(len(probs))]
            probabilities = {labels[i]: float(round(probs[i], 4)) for i in range(len(probs))}
            prediction = labels[int(pred_raw)] if int(pred_raw) < len(labels) else int(pred_raw)
        else:
            prediction = float(round(pred_raw, 4))
    else:
        # Classical model pipeline handles scaling automatically on raw data!
        pred_raw = model_obj.predict(input_vector)[0]
        if hasattr(model_obj, "predict_proba") and row["task_type"] == "classification":
            try:
                probs = model_obj.predict_proba(input_vector)[0]
                target_classes = getattr(model_obj, "target_classes_", None) or [str(c) for c in range(len(probs))]
                probabilities = {target_classes[i]: float(round(probs[i], 4)) for i in range(len(probs))}
            except Exception:
                pass

        if row["task_type"] == "classification":
            target_classes = getattr(model_obj, "target_classes_", None)
            if target_classes and int(pred_raw) < len(target_classes):
                prediction = target_classes[int(pred_raw)]
            else:
                prediction = int(pred_raw)
        else:
            prediction = float(round(pred_raw, 4))

    latency_ms = round((time.time() - t0) * 1000.0, 2)

    return {
        "prediction": prediction,
        "probabilities": probabilities,
        "latency_ms": latency_ms,
    }


@router.post("/{model_id}/batch-evaluate", response_model=BatchEvaluateResponse)
def batch_evaluate(model_id: str):
    model_obj, row, feature_names, target_name = load_model_and_metadata(model_id)
    if not model_obj:
        raise HTTPException(status_code=400, detail="Model is not trained.")

    dataset_path = row["dataset_path"]
    if not dataset_path or not os.path.exists(dataset_path):
        raise HTTPException(status_code=404, detail="Dataset file not found.")

    df = pd.read_csv(dataset_path)
    X_df = df[feature_names]
    y_true = df[target_name].values if target_name and target_name in df.columns else None

    if y_true is None:
        raise HTTPException(status_code=400, detail="Target variable not present for evaluation.")

    # Evaluate predictions
    if isinstance(model_obj, InspectableNeuralNetwork):
        scaler_p = model_obj.scaler_params
        if "mean" in scaler_p and "scale" in scaler_p:
            mean = np.array(scaler_p["mean"])
            scale = np.array(scaler_p["scale"])
            X_s = (X_df.values - mean) / (scale + 1e-12)
        else:
            X_s = X_df.values
        y_pred = model_obj.predict(X_s)
    else:
        y_pred = model_obj.predict(X_df.values)

    metrics = {}
    conf_matrix = None
    classes_list = None
    clf_report = None

    if row["task_type"] == "classification":
        target_classes = getattr(model_obj, "class_labels", None) or getattr(model_obj, "target_classes_", None)
        # If predictions are integer indices and target_classes exist, map to class labels if y_true is string
        if target_classes and len(y_pred) > 0 and isinstance(y_pred[0], (int, np.integer, np.int64, np.int32)):
            if len(y_true) > 0 and isinstance(y_true[0], str):
                y_pred = np.array([target_classes[int(p)] if int(p) < len(target_classes) else str(p) for p in y_pred])

        y_true_str = np.array([str(x) for x in y_true])
        y_pred_str = np.array([str(x) for x in y_pred])

        classes = sorted(list(set(y_true_str).union(set(y_pred_str))))
        classes_list = [str(c) for c in classes]
        cm = confusion_matrix(y_true_str, y_pred_str, labels=classes)
        conf_matrix = cm.tolist()
        try:
            clf_report = classification_report(y_true_str, y_pred_str, output_dict=True, zero_division=0)
        except Exception:
            clf_report = {}

        acc = float(round(np.mean(y_true_str == y_pred_str), 4))
        metrics = {"accuracy": acc, "loss": round(1.0 - acc, 4)}

        # Samples preview (limit 20)
        preview = []
        for idx in range(min(20, len(df))):
            preview.append({
                "features": {f: float(round(X_df.iloc[idx][f], 2)) for f in feature_names[:4]},
                "actual": str(y_true_str[idx]),
                "predicted": str(y_pred_str[idx]),
                "match": bool(y_true_str[idx] == y_pred_str[idx]),
            })
    else:
        r2 = float(round(r2_score(y_true, y_pred), 4))
        mse = float(round(mean_squared_error(y_true, y_pred), 4))
        mae = float(round(mean_absolute_error(y_true, y_pred), 4))
        metrics = {"r2": r2, "mse": mse, "rmse": float(round(np.sqrt(mse), 4)), "mae": mae}

        # Samples preview (limit 20)
        preview = []
        for idx in range(min(20, len(df))):
            preview.append({
                "features": {f: float(round(X_df.iloc[idx][f], 2)) for f in feature_names[:4]},
                "actual": str(round(float(y_true[idx]), 3)),
                "predicted": str(round(float(y_pred[idx]), 3)),
                "match": bool(abs(float(y_true[idx]) - float(y_pred[idx])) < 0.1),
            })

    return {
        "metrics": metrics,
        "confusion_matrix": conf_matrix,
        "classes": classes_list,
        "classification_report": clf_report,
        "predictions_preview": preview,
    }


@router.get("/{model_id}/export-code")
def export_python_code(model_id: str):
    model_obj, row, feature_names, target_name = load_model_and_metadata(model_id)
    if not model_obj:
        raise HTTPException(status_code=400, detail="Model not trained.")

    model_type = row["model_type"]
    sample_inputs = {f: 0.0 for f in feature_names}

    if isinstance(model_obj, InspectableNeuralNetwork):
        act_name = getattr(model_obj, "hidden_activation_name", "relu")
        if act_name == "tanh":
            act_expr = "np.tanh(z)"
        elif act_name == "sigmoid":
            act_expr = "1.0 / (1.0 + np.exp(-np.clip(z, -500, 500)))"
        else:
            act_expr = "np.maximum(0, z)"

        code = f'''"""
AI Model Lab — Standalone Python Inference Code
Model ID: {model_id}
Model Type: Neural Network (MLP)
"""
import json
import numpy as np

# Load trained weights archive
data = np.load("{model_id}.npz", allow_pickle=True)
metadata = json.loads(str(data["metadata"]))

feature_names = {feature_names}
scaler_p = metadata.get("scaler_params", {{}})

def predict(input_dict):
    raw_vector = np.array([[input_dict.get(f, 0.0) for f in feature_names]], dtype=float)
    if "mean" in scaler_p and "scale" in scaler_p:
        mean = np.array(scaler_p["mean"])
        scale = np.array(scaler_p["scale"])
        scaled_vector = (raw_vector - mean) / (scale + 1e-12)
    elif "min" in scaler_p and "scale" in scaler_p:
        min_val = np.array(scaler_p["min"])
        scale = np.array(scaler_p["scale"])
        scaled_vector = (raw_vector - min_val) / (scale + 1e-12)
    else:
        scaled_vector = raw_vector

    # Forward pass
    a = scaled_vector
    num_layers = len(metadata["layer_sizes"]) - 1
    for i in range(num_layers):
        W = data[f"W_{{i}}"]
        b = data[f"b_{{i}}"]
        z = np.dot(a, W) + b
        if i == num_layers - 1:
            # Output activation
            if metadata["task_type"] == "classification":
                if W.shape[1] == 1:
                    a = 1.0 / (1.0 + np.exp(-np.clip(z, -500, 500)))
                else:
                    z_shifted = z - np.max(z, axis=-1, keepdims=True)
                    exp_z = np.exp(z_shifted)
                    a = exp_z / np.sum(exp_z, axis=-1, keepdims=True)
            else:
                a = z
        else:
            a = {act_expr}
    return a

# Test sample query
sample_query = {sample_inputs}
prediction = predict(sample_query)
print("Prediction:", prediction)
'''
    else:
        code = f'''"""
AI Model Lab — Standalone Python Inference Code
Model ID: {model_id}
Model Type: {model_type}
"""
import joblib
import numpy as np
import pandas as pd

# Load full pipeline (fitted scaler + estimator)
pipeline = joblib.load("{model_id}.joblib")
feature_names = {feature_names}

def predict(input_dict):
    query_vals = np.array([[input_dict.get(f, 0.0) for f in feature_names]], dtype=float)
    prediction = pipeline.predict(query_vals)
    proba = None
    if hasattr(pipeline, "predict_proba"):
        try:
            proba = pipeline.predict_proba(query_vals)[0]
        except Exception:
            pass
    return prediction[0], proba

# Test sample query
sample_query = {sample_inputs}
pred, probs = predict(sample_query)
print("Predicted class/target:", pred)
if probs is not None:
    print("Class probabilities:", probs)
'''

    return {"code": code, "filename": f"infer_{model_id}.py"}


@router.get("/{model_id}/download")
def download_artifact(model_id: str):
    npz_path = os.path.join(MODELS_DIR, f"{model_id}.npz")
    joblib_path = os.path.join(MODELS_DIR, f"{model_id}.joblib")

    if os.path.exists(npz_path):
        return FileResponse(npz_path, filename=f"{model_id}.npz", media_type="application/octet-stream")
    elif os.path.exists(joblib_path):
        return FileResponse(joblib_path, filename=f"{model_id}.joblib", media_type="application/octet-stream")
    else:
        raise HTTPException(status_code=404, detail="Model artifact file not found.")
