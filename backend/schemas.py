from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional, Union
from datetime import datetime


# --- DATASET SCHEMAS ---
class SyntheticDatasetRequest(BaseModel):
    name: str = Field(..., example="Binary Moons")
    preset: str = Field(..., example="moons")  # moons, circles, blobs, xor, linear, polynomial, friedman, clusters
    task_type: str = Field(..., example="classification")  # classification, regression, clustering
    n_samples: int = Field(600, ge=50, le=5000)
    n_features: int = Field(2, ge=1, le=20)
    noise: float = Field(0.15, ge=0.0, le=1.0)
    n_classes: int = Field(2, ge=2, le=5)
    random_state: int = Field(42)


class DatasetResponse(BaseModel):
    id: str
    name: str
    source_type: str
    task_type: str
    row_count: int
    feature_count: int
    features: List[str]
    target_name: Optional[str] = None
    generator_config: Optional[Dict[str, Any]] = None
    summary_stats: Optional[Dict[str, Any]] = None
    created_at: Optional[str] = None


class DatasetPreviewResponse(BaseModel):
    id: str
    name: str
    features: List[str]
    target_name: Optional[str]
    total_rows: int
    rows: List[Dict[str, Any]]


# --- MODEL SCHEMAS ---
class ModelCreateRequest(BaseModel):
    name: str
    description: Optional[str] = ""
    model_type: str  # linear_regression, logistic_regression, decision_tree, random_forest, knn, kmeans, neural_network
    task_type: str   # classification, regression, clustering
    dataset_id: Optional[str] = None
    hyperparameters: Dict[str, Any] = Field(default_factory=dict)
    training_params: Dict[str, Any] = Field(default_factory=dict)


class ModelUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    dataset_id: Optional[str] = None
    hyperparameters: Optional[Dict[str, Any]] = None
    training_params: Optional[Dict[str, Any]] = None


class ModelResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = ""
    model_type: str
    task_type: str
    dataset_id: Optional[str] = None
    dataset_name: Optional[str] = None
    hyperparameters: Dict[str, Any]
    training_params: Dict[str, Any]
    status: str
    progress: float
    current_step: int
    total_steps: int
    metrics: Optional[Dict[str, Any]] = None
    version: int
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


# --- TRAINING SCHEMAS ---
class TrainingStartRequest(BaseModel):
    test_split: float = Field(0.2, ge=0.05, le=0.5)
    val_split: float = Field(0.15, ge=0.0, le=0.4)
    scaler_type: str = Field("standard")  # standard, minmax, robust, none
    batch_size: Optional[int] = Field(32, ge=4, le=512)
    learning_rate: Optional[float] = Field(0.01, ge=0.00001, le=1.0)
    epochs: Optional[int] = Field(100, ge=5, le=500)


class TrainingTickMessage(BaseModel):
    type: str = "training_tick"
    model_id: str
    step: int
    total_steps: int
    progress_pct: float
    is_iterative: bool
    metrics: Dict[str, float]
    weights_summary: Optional[Dict[str, Any]] = None
    log_message: str
    elapsed_seconds: float
    status: str


# --- INFERENCE SCHEMAS ---
class PredictRequest(BaseModel):
    features: Dict[str, float]


class PredictResponse(BaseModel):
    prediction: Union[float, int, str]
    probabilities: Optional[Dict[str, float]] = None
    latency_ms: float


class BatchEvaluateResponse(BaseModel):
    metrics: Dict[str, float]
    confusion_matrix: Optional[List[List[int]]] = None
    classes: Optional[List[Union[str, int]]] = None
    classification_report: Optional[Dict[str, Any]] = None
    predictions_preview: Optional[List[Dict[str, Any]]] = None


# --- VISUALIZATION SCHEMAS ---
class BoundarySliceRequest(BaseModel):
    feature_x: str
    feature_y: str
    resolution: int = Field(50, ge=20, le=100)
    fixed_features: Optional[Dict[str, float]] = None


class BoundarySliceResponse(BaseModel):
    feature_x: str
    feature_y: str
    x_min: float
    x_max: float
    y_min: float
    y_max: float
    x_grid: List[float]
    y_grid: List[float]
    z_mesh: List[List[Union[float, int]]]
    prob_mesh: Optional[List[List[float]]] = None
    scatter_samples: List[Dict[str, Any]]


class KNNQueryRequest(BaseModel):
    query_point: Dict[str, float]
    k: Optional[int] = None


class KNNQueryResponse(BaseModel):
    query_point: Dict[str, float]
    k: int
    neighbor_points: List[Dict[str, Any]]
    distances: List[float]
    predicted_class: Union[float, int, str]
