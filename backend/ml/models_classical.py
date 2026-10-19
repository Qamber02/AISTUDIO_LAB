import numpy as np
from typing import Dict, Any, Tuple, Optional, List
from sklearn.pipeline import Pipeline
from sklearn.linear_model import LinearRegression, Ridge, Lasso, LogisticRegression, SGDRegressor, SGDClassifier
from sklearn.tree import DecisionTreeClassifier, DecisionTreeRegressor, export_text
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.neighbors import KNeighborsClassifier, KNeighborsRegressor
from sklearn.cluster import KMeans
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    r2_score, mean_squared_error, mean_absolute_error, confusion_matrix,
    silhouette_score
)


def build_classical_model(
    model_type: str,
    task_type: str,
    hyperparams: Dict[str, Any],
) -> Any:
    """Builds a Scikit-Learn estimator configured with user hyperparameters."""
    solver_mode = hyperparams.get("solver_mode", "exact")  # "exact" or "iterative"

    if model_type == "linear_regression":
        if solver_mode == "iterative":
            learning_rate = hyperparams.get("learning_rate", 0.01)
            penalty = hyperparams.get("penalty", "l2")
            alpha = hyperparams.get("alpha", 0.0001)
            return SGDRegressor(
                loss="squared_error",
                penalty=penalty if penalty != "none" else None,
                alpha=alpha,
                learning_rate="constant",
                eta0=learning_rate,
                max_iter=1,
                warm_start=True,
                random_state=42,
            )
        else:
            reg_type = hyperparams.get("reg_type", "ols")
            alpha = hyperparams.get("alpha", 1.0)
            fit_intercept = hyperparams.get("fit_intercept", True)
            if reg_type == "ridge":
                return Ridge(alpha=alpha, fit_intercept=fit_intercept, random_state=42)
            elif reg_type == "lasso":
                return Lasso(alpha=alpha, fit_intercept=fit_intercept, random_state=42)
            else:
                return LinearRegression(fit_intercept=fit_intercept)

    elif model_type == "logistic_regression":
        if solver_mode == "iterative":
            learning_rate = hyperparams.get("learning_rate", 0.01)
            penalty = hyperparams.get("penalty", "l2")
            alpha = hyperparams.get("alpha", 0.0001)
            return SGDClassifier(
                loss="log_loss",
                penalty=penalty if penalty != "none" else None,
                alpha=alpha,
                learning_rate="constant",
                eta0=learning_rate,
                max_iter=1,
                warm_start=True,
                random_state=42,
            )
        else:
            C = hyperparams.get("C", 1.0)
            penalty = hyperparams.get("penalty", "l2")
            max_iter = hyperparams.get("max_iter", 200)
            return LogisticRegression(
                C=C,
                penalty=penalty if penalty != "none" else None,
                solver="lbfgs",
                max_iter=max_iter,
                random_state=42,
            )

    elif model_type == "decision_tree":
        max_depth = hyperparams.get("max_depth", None)
        min_samples_split = hyperparams.get("min_samples_split", 2)
        if task_type == "classification":
            criterion = hyperparams.get("criterion", "gini")
            return DecisionTreeClassifier(
                criterion=criterion,
                max_depth=max_depth,
                min_samples_split=min_samples_split,
                random_state=42,
            )
        else:
            criterion = hyperparams.get("criterion", "squared_error")
            return DecisionTreeRegressor(
                criterion=criterion,
                max_depth=max_depth,
                min_samples_split=min_samples_split,
                random_state=42,
            )

    elif model_type == "random_forest":
        n_estimators = hyperparams.get("n_estimators", 50)
        max_depth = hyperparams.get("max_depth", None)
        criterion = hyperparams.get("criterion", "gini" if task_type == "classification" else "squared_error")
        if task_type == "classification":
            return RandomForestClassifier(
                n_estimators=n_estimators,
                max_depth=max_depth,
                criterion=criterion,
                warm_start=True,  # Enables tree-by-tree incremental training!
                random_state=42,
            )
        else:
            return RandomForestRegressor(
                n_estimators=n_estimators,
                max_depth=max_depth,
                criterion=criterion,
                warm_start=True,
                random_state=42,
            )

    elif model_type == "knn":
        n_neighbors = hyperparams.get("n_neighbors", 5)
        weights = hyperparams.get("weights", "uniform")
        metric = hyperparams.get("metric", "minkowski")
        if task_type == "classification":
            return KNeighborsClassifier(n_neighbors=n_neighbors, weights=weights, metric=metric)
        else:
            return KNeighborsRegressor(n_neighbors=n_neighbors, weights=weights, metric=metric)

    elif model_type == "kmeans":
        n_clusters = hyperparams.get("n_clusters", 3)
        return KMeans(n_clusters=n_clusters, random_state=42, n_init=10)

    raise ValueError(f"Unsupported model_type: {model_type}")


def build_pipeline(scaler: Any, estimator: Any) -> Pipeline:
    """Wraps the fitted/unfitted preprocessor scaler and estimator in an end-to-end Pipeline."""
    return Pipeline([
        ("scaler", scaler),
        ("estimator", estimator),
    ])


def evaluate_model(
    estimator: Any,
    X: np.ndarray,
    y: Optional[np.ndarray],
    task_type: str,
) -> Dict[str, float]:
    """Evaluates the model on dataset X, y and returns standard performance metrics."""
    metrics = {}
    if task_type == "classification":
        y_pred = estimator.predict(X)
        metrics["accuracy"] = float(round(accuracy_score(y, y_pred), 4))
        metrics["precision"] = float(round(precision_score(y, y_pred, average="weighted", zero_division=0), 4))
        metrics["recall"] = float(round(recall_score(y, y_pred, average="weighted", zero_division=0), 4))
        metrics["f1_score"] = float(round(f1_score(y, y_pred, average="weighted", zero_division=0), 4))
        # Compute zero-one loss as train/val loss surrogate
        metrics["loss"] = float(round(1.0 - metrics["accuracy"], 4))

    elif task_type == "regression":
        y_pred = estimator.predict(X)
        metrics["r2"] = float(round(r2_score(y, y_pred), 4))
        metrics["mse"] = float(round(mean_squared_error(y, y_pred), 4))
        metrics["rmse"] = float(round(np.sqrt(metrics["mse"]), 4))
        metrics["mae"] = float(round(mean_absolute_error(y, y_pred), 4))
        metrics["loss"] = metrics["mse"]

    elif task_type == "clustering":
        labels = estimator.predict(X) if hasattr(estimator, "predict") else estimator.labels_
        metrics["inertia"] = float(round(getattr(estimator, "inertia_", 0.0), 3))
        if len(np.unique(labels)) > 1 and len(X) > 10:
            try:
                metrics["silhouette"] = float(round(silhouette_score(X, labels), 4))
            except Exception:
                metrics["silhouette"] = 0.0
        else:
            metrics["silhouette"] = 0.0
        metrics["loss"] = metrics["inertia"]

    return metrics
