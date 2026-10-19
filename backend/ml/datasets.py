import os
import uuid
import json
import numpy as np
import pandas as pd
from typing import Dict, Any, Tuple, Optional
from sklearn.datasets import (
    make_moons,
    make_circles,
    make_blobs,
    make_classification,
    make_regression,
    make_friedman1,
)

from ..db import DATASETS_DIR, get_db_connection


def compute_dataset_summary(df: pd.DataFrame, target_col: Optional[str] = None) -> Dict[str, Any]:
    summary = {
        "columns": list(df.columns),
        "row_count": len(df),
        "column_count": len(df.columns),
        "features": [c for c in df.columns if c != target_col],
        "target": target_col,
        "feature_stats": {},
        "missing_values": df.isnull().sum().to_dict(),
        "correlations": {},
    }

    # Numeric summary
    numeric_df = df.select_dtypes(include=[np.number])
    for col in numeric_df.columns:
        vals = numeric_df[col].dropna()
        min_v = float(vals.min()) if len(vals) > 0 else 0.0
        max_v = float(vals.max()) if len(vals) > 0 else 0.0
        mean_v = float(vals.mean()) if len(vals) > 0 else 0.0
        std_v = float(vals.std()) if len(vals) > 1 else 0.0
        med_v = float(vals.median()) if len(vals) > 0 else 0.0
        summary["feature_stats"][col] = {
            "min": 0.0 if np.isnan(min_v) or np.isinf(min_v) else min_v,
            "max": 0.0 if np.isnan(max_v) or np.isinf(max_v) else max_v,
            "mean": 0.0 if np.isnan(mean_v) or np.isinf(mean_v) else mean_v,
            "std": 0.0 if np.isnan(std_v) or np.isinf(std_v) else std_v,
            "median": 0.0 if np.isnan(med_v) or np.isinf(med_v) else med_v,
        }

    # Class distribution if target exists
    if target_col and target_col in df.columns:
        class_counts = df[target_col].value_counts().to_dict()
        summary["class_distribution"] = {str(k): int(v) for k, v in class_counts.items()}

    # Correlation matrix for numeric features (limit to at most 10 for speed and display)
    cols_for_corr = list(numeric_df.columns[:10])
    if len(cols_for_corr) > 1:
        corr_matrix = numeric_df[cols_for_corr].corr().fillna(0).round(3)
        summary["correlations"] = {
            "columns": cols_for_corr,
            "matrix": corr_matrix.values.tolist(),
        }

    return summary


def generate_synthetic_dataset(
    name: Optional[str] = None,
    preset: str = "circles",
    task_type: Optional[str] = None,
    n_samples: int = 600,
    n_features: int = 2,
    noise: float = 0.15,
    n_classes: int = 2,
    random_state: int = 42,
) -> Any:
    np.random.seed(random_state)
    dataset_id = f"ds_{uuid.uuid4().hex[:8]}"
    file_path = os.path.join(DATASETS_DIR, f"{dataset_id}.csv")

    if task_type is None:
        if preset in ["linear", "polynomial", "friedman"]:
            task_type = "regression"
        elif preset == "clustering":
            task_type = "clustering"
        else:
            task_type = "classification"

    X = None
    y = None
    target_name = "target"
    feature_names = [f"feature_{i+1}" for i in range(n_features)]

    if task_type == "classification":
        if preset == "moons":
            feature_names = ["x1", "x2"]
            X, y = make_moons(n_samples=n_samples, noise=noise, random_state=random_state)
            if n_features > 2:
                # Add extra nuisance features with Gaussian noise
                extra_X = np.random.normal(0, 1, size=(n_samples, n_features - 2))
                X = np.hstack([X, extra_X])
                feature_names += [f"noise_feat_{i+1}" for i in range(n_features - 2)]

        elif preset == "circles":
            feature_names = ["x1", "x2"]
            X, y = make_circles(n_samples=n_samples, noise=noise, factor=0.5, random_state=random_state)
            if n_features > 2:
                extra_X = np.random.normal(0, 1, size=(n_samples, n_features - 2))
                X = np.hstack([X, extra_X])
                feature_names += [f"noise_feat_{i+1}" for i in range(n_features - 2)]

        elif preset == "blobs":
            feature_names = [f"x{i+1}" for i in range(n_features)]
            X, y = make_blobs(
                n_samples=n_samples,
                n_features=n_features,
                centers=n_classes,
                cluster_std=noise * 3.0 + 0.5,
                random_state=random_state,
            )

        elif preset == "xor":
            feature_names = ["x1", "x2"]
            X_raw = np.random.uniform(-2, 2, size=(n_samples, 2))
            # XOR: class 1 if (x1 > 0 and x2 > 0) or (x1 < 0 and x2 < 0)
            y = ((X_raw[:, 0] > 0) == (X_raw[:, 1] > 0)).astype(int)
            # Add noise by flipping labels
            flip_mask = np.random.rand(n_samples) < (noise * 0.3)
            y[flip_mask] = 1 - y[flip_mask]
            X = X_raw
            if n_features > 2:
                extra_X = np.random.normal(0, 1, size=(n_samples, n_features - 2))
                X = np.hstack([X, extra_X])
                feature_names += [f"noise_feat_{i+1}" for i in range(n_features - 2)]

        else:  # Generic classification
            feature_names = [f"x{i+1}" for i in range(n_features)]
            n_informative = min(n_features, max(2, n_features - 1))
            X, y = make_classification(
                n_samples=n_samples,
                n_features=n_features,
                n_informative=n_informative,
                n_redundant=0,
                n_classes=n_classes,
                flip_y=noise * 0.1,
                random_state=random_state,
            )

    elif task_type == "regression":
        if preset == "linear":
            feature_names = [f"x{i+1}" for i in range(n_features)]
            X, y = make_regression(
                n_samples=n_samples,
                n_features=n_features,
                noise=noise * 15.0,
                random_state=random_state,
            )
            y = np.round(y, 3)

        elif preset == "polynomial":
            feature_names = ["x1"]
            x1 = np.linspace(-3, 3, n_samples)
            # cubic polynomial + sinusoidal wave
            y = 0.5 * (x1 ** 3) - 2 * (x1 ** 2) + np.sin(x1 * 3) * 3 + np.random.normal(0, noise * 4.0, n_samples)
            X = x1.reshape(-1, 1)
            if n_features > 1:
                extra_X = np.random.normal(0, 1, size=(n_samples, n_features - 1))
                X = np.hstack([X, extra_X])
                feature_names += [f"x{i+2}" for i in range(n_features - 1)]

        elif preset == "friedman":
            feature_names = [f"x{i+1}" for i in range(max(5, n_features))]
            X, y = make_friedman1(n_samples=n_samples, n_features=len(feature_names), noise=noise * 2.0, random_state=random_state)
            if n_features < len(feature_names):
                X = X[:, :n_features]
                feature_names = feature_names[:n_features]

        else:
            feature_names = [f"x{i+1}" for i in range(n_features)]
            X, y = make_regression(
                n_samples=n_samples,
                n_features=n_features,
                noise=noise * 10.0,
                random_state=random_state,
            )

    elif task_type == "clustering":
        target_name = "cluster_label"
        feature_names = [f"x{i+1}" for i in range(n_features)]
        X, y = make_blobs(
            n_samples=n_samples,
            n_features=n_features,
            centers=n_classes,
            cluster_std=noise * 2.5 + 0.6,
            random_state=random_state,
        )

    # Build DataFrame
    df = pd.DataFrame(X, columns=feature_names)
    df[target_name] = y
    df = df.round(4)

    summary_stats = compute_dataset_summary(df, target_col=target_name)

    if name is None:
        return df, summary_stats

    df.to_csv(file_path, index=False)

    # Save to SQLite
    generator_config = {
        "preset": preset,
        "n_samples": n_samples,
        "n_features": len(feature_names),
        "noise": noise,
        "n_classes": n_classes,
        "random_state": random_state,
    }

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO datasets (
            id, name, source_type, task_type, row_count, feature_count,
            features_json, target_name, generator_config_json, file_path, summary_stats_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        dataset_id,
        name,
        "synthetic",
        task_type,
        len(df),
        len(feature_names),
        json.dumps(feature_names),
        target_name,
        json.dumps(generator_config),
        file_path,
        json.dumps(summary_stats),
    ))
    conn.commit()
    conn.close()

    dataset_dict = {
        "id": dataset_id,
        "name": name,
        "source_type": "synthetic",
        "task_type": task_type,
        "row_count": len(df),
        "feature_count": len(feature_names),
        "features": feature_names,
        "target_name": target_name,
        "generator_config": generator_config,
        "summary_stats": summary_stats,
    }

    return dataset_id, dataset_dict


def parse_and_save_csv(
    file_or_name: str,
    file_content_bytes: Optional[bytes] = None,
    target_col: Optional[str] = None,
    name: Optional[str] = None,
) -> Any:
    import io
    is_standalone_file_call = False
    if file_content_bytes is None:
        if isinstance(file_or_name, str) and os.path.exists(file_or_name):
            with open(file_or_name, "rb") as f:
                file_content_bytes = f.read()
            is_standalone_file_call = True
        else:
            file_content_bytes = b""

    dataset_name = name or file_or_name
    dataset_id = f"ds_{uuid.uuid4().hex[:8]}"
    file_path = os.path.join(DATASETS_DIR, f"{dataset_id}.csv")

    df = None
    last_err = None
    for enc in ["utf-8-sig", "utf-8", "latin-1"]:
        for sep in [",", ";", "\t"]:
            try:
                candidate = pd.read_csv(io.BytesIO(file_content_bytes), encoding=enc, sep=sep)
                if len(candidate.columns) >= 2 and len(candidate) > 0:
                    df = candidate
                    break
            except Exception as e:
                last_err = e
        if df is not None:
            break

    if df is None:
        try:
            df = pd.read_csv(io.BytesIO(file_content_bytes))
        except Exception:
            raise ValueError(f"Could not parse file as CSV tabular data: {last_err}")

    if len(df) < 1:
        raise ValueError(f"Dataset must have at least 1 row (found {len(df)})")
    if len(df.columns) < 2:
        raise ValueError(f"Dataset must have at least 2 columns (found {len(df.columns)})")

    # Clean and deduplicate column names
    clean_cols = []
    seen = {}
    for c in df.columns:
        clean = str(c).strip() or "feature"
        if clean in seen:
            seen[clean] += 1
            clean = f"{clean}_{seen[clean]}"
        else:
            seen[clean] = 0
        clean_cols.append(clean)
    df.columns = clean_cols

    # Handle missing values: fill numeric with median, object with mode/Unknown
    for col in df.columns:
        if pd.api.types.is_numeric_dtype(df[col]):
            df[col] = df[col].fillna(df[col].median() if len(df[col].dropna()) > 0 else 0)
        else:
            df[col] = df[col].fillna("Unknown")

    if is_standalone_file_call:
        return df

    # If target_col not specified, default to the last column
    if not target_col or target_col not in df.columns:
        target_col = df.columns[-1]

    # Determine task_type
    target_series = df[target_col]
    unique_count = target_series.nunique()
    if pd.api.types.is_numeric_dtype(target_series) and unique_count > 10:
        task_type = "regression"
    else:
        task_type = "classification"

    feature_names = [c for c in df.columns if c != target_col]

    df.to_csv(file_path, index=False)
    summary_stats = compute_dataset_summary(df, target_col=target_col)

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO datasets (
            id, name, source_type, task_type, row_count, feature_count,
            features_json, target_name, generator_config_json, file_path, summary_stats_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        dataset_id,
        dataset_name,
        "csv",
        task_type,
        len(df),
        len(feature_names),
        json.dumps(feature_names),
        target_col,
        json.dumps({}),
        file_path,
        json.dumps(summary_stats),
    ))
    conn.commit()
    conn.close()

    dataset_dict = {
        "id": dataset_id,
        "name": dataset_name,
        "source_type": "csv",
        "task_type": task_type,
        "row_count": len(df),
        "feature_count": len(feature_names),
        "features": feature_names,
        "target_name": target_col,
        "generator_config": {},
        "summary_stats": summary_stats,
    }

    return dataset_id, dataset_dict
