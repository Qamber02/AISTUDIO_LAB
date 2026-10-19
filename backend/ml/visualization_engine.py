import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional, Tuple, Union


def generate_boundary_slice(
    estimator_or_pipeline: Any,
    feature_names: List[str],
    feature_ranges: Dict[str, Dict[str, float]],
    feature_x: str,
    feature_y: str,
    resolution: int = 50,
    fixed_features: Optional[Dict[str, float]] = None,
    task_type: str = "classification",
    scatter_df: Optional[pd.DataFrame] = None,
    target_col: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Generates a 2D hyperplane slice through high-dimensional feature space (D >= 2).
    Features not selected for X and Y are fixed at their mean/median or user-specified slice values.
    """
    if feature_x not in feature_names or feature_y not in feature_names:
        raise ValueError(f"Selected axes {feature_x}, {feature_y} must be in dataset features")

    # Get bounds for X and Y with 5% padding
    x_stats = feature_ranges.get(feature_x, {"min": -3.0, "max": 3.0, "mean": 0.0})
    y_stats = feature_ranges.get(feature_y, {"min": -3.0, "max": 3.0, "mean": 0.0})

    x_span = max(0.1, x_stats["max"] - x_stats["min"])
    y_span = max(0.1, y_stats["max"] - y_stats["min"])

    x_min = float(x_stats["min"] - 0.05 * x_span)
    x_max = float(x_stats["max"] + 0.05 * x_span)
    y_min = float(y_stats["min"] - 0.05 * y_span)
    y_max = float(y_stats["max"] + 0.05 * y_span)

    x_lin = np.linspace(x_min, x_max, resolution)
    y_lin = np.linspace(y_min, y_max, resolution)
    xx, yy = np.meshgrid(x_lin, y_lin)
    grid_points_2d = np.c_[xx.ravel(), yy.ravel()]

    # Construct full D-dimensional query matrix in raw physical units
    num_points = len(grid_points_2d)
    full_X = np.zeros((num_points, len(feature_names)))

    for idx, feat in enumerate(feature_names):
        if feat == feature_x:
            full_X[:, idx] = grid_points_2d[:, 0]
        elif feat == feature_y:
            full_X[:, idx] = grid_points_2d[:, 1]
        else:
            # Hold background feature fixed
            val = fixed_features.get(feat, feature_ranges.get(feat, {}).get("mean", 0.0)) if fixed_features else feature_ranges.get(feat, {}).get("mean", 0.0)
            full_X[:, idx] = val

    # Run predictions through pipeline or inspectable model
    prob_mesh = None
    if hasattr(estimator_or_pipeline, "predict_proba"):
        try:
            probs = estimator_or_pipeline.predict_proba(full_X)
            if probs.shape[1] == 2:
                prob_mesh = probs[:, 1].reshape(resolution, resolution).round(3).tolist()
            else:
                prob_mesh = np.max(probs, axis=-1).reshape(resolution, resolution).round(3).tolist()
        except Exception:
            prob_mesh = None

    preds = estimator_or_pipeline.predict(full_X)
    z_mesh = preds.reshape(resolution, resolution).tolist()

    # Sample points for scatter overlay (limit to at most 150 points for fast rendering)
    scatter_samples = []
    if scatter_df is not None:
        sampled_df = scatter_df.sample(min(150, len(scatter_df)), random_state=42)
        for _, row in sampled_df.iterrows():
            sample_dict = {
                "x": float(row[feature_x]),
                "y": float(row[feature_y]),
                "label": int(row[target_col]) if target_col and target_col in row and task_type == "classification" else (float(row[target_col]) if target_col and target_col in row else 0),
            }
            scatter_samples.append(sample_dict)

    return {
        "feature_x": feature_x,
        "feature_y": feature_y,
        "x_min": x_min,
        "x_max": x_max,
        "y_min": y_min,
        "y_max": y_max,
        "x_grid": x_lin.round(3).tolist(),
        "y_grid": y_lin.round(3).tolist(),
        "z_mesh": z_mesh,
        "prob_mesh": prob_mesh,
        "scatter_samples": scatter_samples,
    }


def extract_decision_tree_hierarchy(tree_model: Any, feature_names: List[str], class_names: Optional[List[str]] = None) -> Dict[str, Any]:
    """Recursively parses a Scikit-Learn DecisionTreeClassifier/Regressor into an SVG-renderable node tree."""
    tree_ = getattr(tree_model, "tree_", None)
    if tree_ is None and hasattr(tree_model, "named_steps"):
        # Extracted from pipeline
        tree_ = getattr(tree_model.named_steps.get("estimator"), "tree_", None)

    if tree_ is None:
        return {}

    def recurse(node_id: int, depth: int) -> Dict[str, Any]:
        is_leaf = tree_.children_left[node_id] == tree_.children_right[node_id]
        samples = int(tree_.n_node_samples[node_id])
        impurity = float(round(tree_.impurity[node_id], 4))
        value = tree_.value[node_id].tolist()

        if is_leaf:
            # Determine winning class or regression mean
            val_flat = tree_.value[node_id].flatten()
            pred_class = int(np.argmax(val_flat)) if class_names else float(round(val_flat[0], 3))
            return {
                "id": node_id,
                "is_leaf": True,
                "depth": depth,
                "samples": samples,
                "impurity": impurity,
                "value": value,
                "prediction": class_names[pred_class] if class_names and pred_class < len(class_names) else pred_class,
            }

        feat_idx = int(tree_.feature[node_id])
        feat_name = feature_names[feat_idx] if feat_idx < len(feature_names) else f"feature_{feat_idx}"
        threshold = float(round(tree_.threshold[node_id], 4))

        left_child = recurse(int(tree_.children_left[node_id]), depth + 1)
        right_child = recurse(int(tree_.children_right[node_id]), depth + 1)

        return {
            "id": node_id,
            "is_leaf": False,
            "depth": depth,
            "feature": feat_name,
            "threshold": threshold,
            "samples": samples,
            "impurity": impurity,
            "value": value,
            "left": left_child,
            "right": right_child,
        }

    return recurse(0, 0)


def extract_feature_importances(model_or_pipeline: Any, feature_names: List[str]) -> List[Dict[str, Any]]:
    """Extracts ranked feature importances from Random Forest or Decision Tree."""
    estimator = model_or_pipeline
    if hasattr(model_or_pipeline, "named_steps"):
        estimator = model_or_pipeline.named_steps.get("estimator", model_or_pipeline)

    importances = getattr(estimator, "feature_importances_", None)
    if importances is None:
        # Check linear model coefficients
        coef = getattr(estimator, "coef_", None)
        if coef is not None:
            importances = np.mean(np.abs(coef), axis=0) if coef.ndim > 1 else np.abs(coef)

    if importances is None:
        return []

    # Normalize to 0-1
    total = np.sum(importances)
    norm_importances = importances / total if total > 0 else importances

    ranked = []
    for idx, score in enumerate(norm_importances):
        feat = feature_names[idx] if idx < len(feature_names) else f"feat_{idx}"
        ranked.append({"feature": feat, "importance": float(round(score, 4))})

    ranked.sort(key=lambda x: x["importance"], reverse=True)
    return ranked
