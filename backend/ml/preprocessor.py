import numpy as np
import pandas as pd
from typing import Dict, Any, Tuple, Optional, List
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, MinMaxScaler, RobustScaler, LabelEncoder
from sklearn.base import BaseEstimator, TransformerMixin


class IdentityTransformer(BaseEstimator, TransformerMixin):
    """Pass-through transformer when no scaling is selected."""
    def fit(self, X, y=None):
        return self

    def transform(self, X, y=None):
        return np.asarray(X)


def get_scaler(scaler_type: str):
    if scaler_type == "standard":
        return StandardScaler()
    elif scaler_type == "minmax":
        return MinMaxScaler()
    elif scaler_type == "robust":
        return RobustScaler()
    else:
        return IdentityTransformer()


def prepare_data_splits(
    df: pd.DataFrame,
    target_col: Optional[str],
    task_type: str,
    test_size: float = 0.2,
    val_size: float = 0.15,
    scaler_type: str = "standard",
    random_state: int = 42,
) -> Dict[str, Any]:
    # Extract features and target
    if target_col and target_col in df.columns:
        feature_cols = [c for c in df.columns if c != target_col]
        X_df = df[feature_cols].copy()
        y_raw = df[target_col].copy()
    else:
        # Clustering: all numeric columns are features
        feature_cols = list(df.select_dtypes(include=[np.number]).columns)
        X_df = df[feature_cols].copy()
        y_raw = None

    # Handle non-numeric/categorical columns in features
    category_mappings: Dict[str, List[str]] = {}
    for col in X_df.columns:
        if not pd.api.types.is_numeric_dtype(X_df[col]):
            num_converted = pd.to_numeric(X_df[col], errors="coerce")
            # If at least half the non-null values are numeric, treat as numeric
            if num_converted.notna().sum() >= max(1, int(0.5 * len(X_df))):
                fill_val = num_converted.median() if num_converted.notna().any() else 0.0
                X_df[col] = num_converted.fillna(fill_val).astype(float)
            else:
                # String/categorical column: encode distinct categories to distinct float codes
                cat_series = pd.Categorical(X_df[col].astype(str))
                X_df[col] = cat_series.codes.astype(float)
                category_mappings[col] = [str(cat) for cat in cat_series.categories]
        else:
            # Handle numeric NaNs with column median
            if X_df[col].isnull().any():
                X_df[col] = X_df[col].fillna(X_df[col].median() if len(X_df[col].dropna()) > 0 else 0.0)

    # Encode target if classification
    label_encoder = None
    y_encoded = None
    target_classes = None

    if y_raw is not None:
        if task_type == "classification":
            label_encoder = LabelEncoder()
            y_encoded = label_encoder.fit_transform(y_raw.astype(str))
            target_classes = [str(c) for c in label_encoder.classes_]
        else:
            y_encoded = pd.to_numeric(y_raw, errors="coerce").fillna(0).values

    # Step 1: Split train+val vs test (Leak-Free: Test set is isolated immediately)
    if y_encoded is not None and task_type == "classification" and len(np.unique(y_encoded)) > 1:
        # Stratified split for classification
        try:
            X_train_val, X_test, y_train_val, y_test = train_test_split(
                X_df, y_encoded, test_size=test_size, random_state=random_state, stratify=y_encoded
            )
        except ValueError:
            X_train_val, X_test, y_train_val, y_test = train_test_split(
                X_df, y_encoded, test_size=test_size, random_state=random_state
            )
    elif y_encoded is not None:
        X_train_val, X_test, y_train_val, y_test = train_test_split(
            X_df, y_encoded, test_size=test_size, random_state=random_state
        )
    else:
        X_train_val, X_test = train_test_split(X_df, test_size=test_size, random_state=random_state)
        y_train_val, y_test = None, None

    # Step 2: Split train vs val
    if val_size > 0.0 and len(X_train_val) > 10:
        val_ratio = val_size / (1.0 - test_size)
        if y_train_val is not None and task_type == "classification" and len(np.unique(y_train_val)) > 1:
            try:
                X_train, X_val, y_train, y_val = train_test_split(
                    X_train_val, y_train_val, test_size=val_ratio, random_state=random_state, stratify=y_train_val
                )
            except ValueError:
                X_train, X_val, y_train, y_val = train_test_split(
                    X_train_val, y_train_val, test_size=val_ratio, random_state=random_state
                )
        elif y_train_val is not None:
            X_train, X_val, y_train, y_val = train_test_split(
                X_train_val, y_train_val, test_size=val_ratio, random_state=random_state
            )
        else:
            X_train, X_val = train_test_split(X_train_val, test_size=val_ratio, random_state=random_state)
            y_train, y_val = None, None
    else:
        X_train = X_train_val
        X_val = X_test  # Fallback
        y_train = y_train_val
        y_val = y_test

    # Step 3: Compute raw-unit ranges strictly on X_train for Studio 5 sliders
    feature_ranges = {}
    for col in feature_cols:
        series = X_train[col]
        feature_ranges[col] = {
            "min": float(series.min()),
            "max": float(series.max()),
            "mean": float(series.mean()),
            "median": float(series.median()),
            "step": float(round((series.max() - series.min()) / 100.0, 4)) if (series.max() - series.min()) > 0 else 0.01
        }

    # Step 4: Fit Scaler STRICTLY on X_train (Zero Data Leakage)
    scaler = get_scaler(scaler_type)
    X_train_scaled = scaler.fit_transform(X_train)
    X_val_scaled = scaler.transform(X_val)
    X_test_scaled = scaler.transform(X_test)

    # Extract scaler parameters for NumPy NN archive
    scaler_params = {}
    if hasattr(scaler, "mean_") and scaler.mean_ is not None:
        scaler_params["mean"] = scaler.mean_.tolist()
        scaler_params["scale"] = scaler.scale_.tolist()
    elif hasattr(scaler, "min_") and scaler.min_ is not None:
        scaler_params["min"] = scaler.min_.tolist()
        scaler_params["scale"] = scaler.scale_.tolist()

    return {
        "feature_names": feature_cols,
        "feature_ranges": feature_ranges,
        "scaler": scaler,
        "scaler_type": scaler_type,
        "scaler_params": scaler_params,
        "label_encoder": label_encoder,
        "target_classes": target_classes,
        "category_mappings": category_mappings,
        "X_train_raw": X_train.values,
        "X_val_raw": X_val.values,
        "X_test_raw": X_test.values,
        "X_train_scaled": X_train_scaled,
        "X_val_scaled": X_val_scaled,
        "X_test_scaled": X_test_scaled,
        "y_train": y_train,
        "y_val": y_val,
        "y_test": y_test,
    }
