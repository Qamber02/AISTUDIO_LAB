import os
import time
import json
import threading
import asyncio
import joblib
import numpy as np
import pandas as pd
from typing import Dict, Any, Optional, List
from fastapi import WebSocket

from ..db import MODELS_DIR, get_db_connection
from .datasets import DATASETS_DIR
from .preprocessor import prepare_data_splits
from .models_classical import build_classical_model, build_pipeline, evaluate_model
from .models_neural import InspectableNeuralNetwork


class TrainingSession:
    def __init__(self, model_id: str):
        self.model_id = model_id
        self.pause_event = threading.Event()
        self.pause_event.set()  # Initially unpaused
        self.stop_event = threading.Event()
        self.status = "training"
        self.latest_tick: Optional[Dict[str, Any]] = None
        self.start_time = time.time()
        self.last_broadcast_time = 0.0

    def pause(self):
        self.pause_event.clear()
        self.status = "paused"

    def resume(self):
        self.pause_event.set()
        self.status = "training"

    def stop(self):
        self.stop_event.set()
        self.pause_event.set()  # Unblock if paused
        self.status = "stopped"


class TrainingManager:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(TrainingManager, cls).__new__(cls)
            cls._instance.sessions: Dict[str, TrainingSession] = {}
            cls._instance.subscribers: Dict[str, List[WebSocket]] = {}
            cls._instance.lock = threading.Lock()
            cls._instance.loop: Optional[asyncio.AbstractEventLoop] = None
        return cls._instance

    def register_websocket(self, model_id: str, ws: WebSocket):
        with self.lock:
            if model_id not in self.subscribers:
                self.subscribers[model_id] = []
            self.subscribers[model_id].append(ws)
            try:
                self.loop = asyncio.get_running_loop()
            except RuntimeError:
                pass

    def unregister_websocket(self, model_id: str, ws: WebSocket):
        with self.lock:
            if model_id in self.subscribers and ws in self.subscribers[model_id]:
                self.subscribers[model_id].remove(ws)

    def broadcast_tick(self, model_id: str, tick: Dict[str, Any]):
        """Dispatches telemetry frames to active WebSocket clients."""
        with self.lock:
            clients = list(self.subscribers.get(model_id, []))
            loop = self.loop

        if not clients:
            return

        message_str = json.dumps(tick)

        async def send_all():
            dead_clients = []
            for ws in clients:
                try:
                    await ws.send_text(message_str)
                except Exception:
                    dead_clients.append(ws)
            if dead_clients:
                with self.lock:
                    for d in dead_clients:
                        if model_id in self.subscribers and d in self.subscribers[model_id]:
                            self.subscribers[model_id].remove(d)

        if loop and loop.is_running():
            try:
                asyncio.run_coroutine_threadsafe(send_all(), loop)
            except Exception:
                pass
        else:
            try:
                cur_loop = asyncio.get_running_loop()
                cur_loop.create_task(send_all())
            except RuntimeError:
                pass

    def start_training(
        self,
        model_id: str,
        test_split: float = 0.2,
        val_split: float = 0.15,
        scaler_type: str = "standard",
        epochs: int = 100,
        batch_size: int = 32,
        learning_rate: float = 0.01,
    ):
        with self.lock:
            if model_id in self.sessions and self.sessions[model_id].status == "training":
                return False, "Model is already training."

            session = TrainingSession(model_id)
            self.sessions[model_id] = session

        # Launch training in background worker thread to ensure FastAPI event loop is never blocked
        worker_thread = threading.Thread(
            target=self._run_training_worker,
            args=(session, test_split, val_split, scaler_type, epochs, batch_size, learning_rate),
            daemon=True,
        )
        worker_thread.start()
        return True, "Training started successfully."

    def pause_training(self, model_id: str) -> bool:
        session = self.sessions.get(model_id)
        if session and session.status == "training":
            session.pause()
            self._update_db_status(model_id, "paused")
            return True
        return False

    def resume_training(self, model_id: str) -> bool:
        session = self.sessions.get(model_id)
        if session and session.status == "paused":
            session.resume()
            self._update_db_status(model_id, "training")
            return True
        return False

    def stop_training(self, model_id: str) -> bool:
        session = self.sessions.get(model_id)
        if session:
            session.stop()
            self._update_db_status(model_id, "stopped")
            return True
        return False

    def _update_db_status(self, model_id: str, status: str, metrics: Optional[Dict[str, Any]] = None):
        conn = get_db_connection()
        cursor = conn.cursor()
        if metrics is not None:
            cursor.execute(
                "UPDATE models SET status = ?, metrics_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                (status, json.dumps(metrics), model_id)
            )
        else:
            cursor.execute(
                "UPDATE models SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                (status, model_id)
            )
        conn.commit()
        conn.close()

    def _run_training_worker(
        self,
        session: TrainingSession,
        test_split: float,
        val_split: float,
        scaler_type: str,
        epochs: int,
        batch_size: int,
        learning_rate: float,
    ):
        model_id = session.model_id
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM models WHERE id = ?", (model_id,))
        model_row = cursor.fetchone()

        if not model_row or not model_row["dataset_id"]:
            self._update_db_status(model_id, "failed")
            conn.close()
            return

        cursor.execute("SELECT * FROM datasets WHERE id = ?", (model_row["dataset_id"],))
        dataset_row = cursor.fetchone()
        conn.close()

        if not dataset_row or not os.path.exists(dataset_row["file_path"]):
            self._update_db_status(model_id, "failed")
            return

        # Load dataset
        df = pd.read_csv(dataset_row["file_path"])
        task_type = model_row["task_type"]
        model_type = model_row["model_type"]
        target_name = dataset_row["target_name"]
        hyperparams = json.loads(model_row["hyperparameters_json"] or "{}")

        # Prepare leak-free splits
        split_data = prepare_data_splits(
            df=df,
            target_col=target_name,
            task_type=task_type,
            test_size=test_split,
            val_size=val_split,
            scaler_type=scaler_type,
            random_state=42,
        )

        X_train_raw = split_data["X_train_raw"]
        X_val_raw = split_data["X_val_raw"]
        X_test_raw = split_data["X_test_raw"]
        X_train_scaled = split_data["X_train_scaled"]
        X_val_scaled = split_data["X_val_scaled"]
        X_test_scaled = split_data["X_test_scaled"]
        y_train = split_data["y_train"]
        y_val = split_data["y_val"]
        y_test = split_data["y_test"]
        scaler = split_data["scaler"]
        feature_names = split_data["feature_names"]
        target_classes = split_data["target_classes"]

        self._update_db_status(model_id, "training")

        try:
            if model_type == "neural_network":
                self._train_neural_network(
                    session=session,
                    model_id=model_id,
                    task_type=task_type,
                    hyperparams=hyperparams,
                    X_train_scaled=X_train_scaled,
                    X_val_scaled=X_val_scaled,
                    X_test_scaled=X_test_scaled,
                    y_train=y_train,
                    y_val=y_val,
                    y_test=y_test,
                    split_data=split_data,
                    epochs=epochs,
                    batch_size=batch_size,
                    learning_rate=learning_rate,
                )
            else:
                self._train_classical_model(
                    session=session,
                    model_id=model_id,
                    model_type=model_type,
                    task_type=task_type,
                    hyperparams=hyperparams,
                    scaler=scaler,
                    X_train_raw=X_train_raw,
                    X_val_raw=X_val_raw,
                    X_test_raw=X_test_raw,
                    y_train=y_train,
                    y_val=y_val,
                    y_test=y_test,
                    split_data=split_data,
                    epochs=epochs,
                )
        except Exception as e:
            import traceback
            traceback.print_exc()
            self._update_db_status(model_id, "failed")
            self.broadcast_tick(model_id, {
                "type": "training_tick",
                "model_id": model_id,
                "status": "failed",
                "log_message": f"Training error: {str(e)}",
                "step": 0,
                "total_steps": epochs,
                "progress_pct": 0,
                "is_iterative": False,
                "metrics": {},
                "elapsed_seconds": time.time() - session.start_time,
            })

    def _train_neural_network(
        self, session, model_id, task_type, hyperparams,
        X_train_scaled, X_val_scaled, X_test_scaled, y_train, y_val, y_test,
        split_data, epochs, batch_size, learning_rate
    ):
        n_features = X_train_scaled.shape[1]
        raw_hidden = hyperparams.get("hidden_layers", [12, 6])
        if isinstance(raw_hidden, str):
            hidden_layers = [int(x.strip()) for x in raw_hidden.split(",") if x.strip()]
        else:
            hidden_layers = list(raw_hidden)

        # Enforce UI safety guardrails (max 4 layers, max 24 neurons/layer)
        hidden_layers = [min(24, max(2, n)) for n in hidden_layers[:4]]
        if not hidden_layers:
            hidden_layers = [12]

        if task_type == "classification":
            n_classes = len(np.unique(y_train))
            output_size = 1 if n_classes == 2 else n_classes
        else:
            output_size = 1

        layer_sizes = [n_features] + hidden_layers + [output_size]
        activation = hyperparams.get("activation", "relu")
        optimizer = hyperparams.get("optimizer", "adam")
        lr = float(hyperparams.get("learning_rate", learning_rate))

        nn = InspectableNeuralNetwork(
            layer_sizes=layer_sizes,
            hidden_activation=activation,
            task_type=task_type,
            learning_rate=lr,
            optimizer=optimizer,
            random_state=42,
        )
        nn.scaler_params = split_data["scaler_params"]
        nn.feature_names = split_data["feature_names"]
        nn.class_labels = split_data.get("target_classes") or []

        # Training Loop with Pause/Stop and WebSocket backpressure throttling (cap to 25 FPS)
        min_broadcast_interval = 0.04  # 40ms = 25 FPS
        all_weights_history = []

        for epoch in range(1, epochs + 1):
            if session.stop_event.is_set():
                session.status = "stopped"
                self._update_db_status(model_id, "stopped")
                return

            # Handle Pause
            session.pause_event.wait()

            train_loss = nn.train_epoch(X_train_scaled, y_train, batch_size=batch_size)

            # Evaluate val metrics
            val_preds = nn.predict(X_val_scaled)
            if task_type == "classification":
                val_acc = float(np.mean(val_preds == y_val))
                val_probs = nn.predict_proba(X_val_scaled)
                eps = 1e-12
                val_probs_clipped = np.clip(val_probs, eps, 1.0 - eps)
                if output_size == 1:
                    p1 = val_probs_clipped[:, 1] if val_probs_clipped.ndim > 1 else val_probs_clipped.ravel()
                    val_loss = float(-np.mean(y_val * np.log(p1) + (1.0 - y_val) * np.log(1.0 - p1)))
                else:
                    y_val_one_hot = np.zeros((len(y_val), output_size))
                    for idx, label in enumerate(y_val):
                        y_val_one_hot[idx, int(label)] = 1.0
                    val_loss = float(-np.mean(np.sum(y_val_one_hot * np.log(val_probs_clipped), axis=-1)))
                metrics = {
                    "train_loss": round(train_loss, 4),
                    "val_loss": round(val_loss, 4),
                    "train_metric": round(float(np.mean(nn.predict(X_train_scaled) == y_train)), 4),
                    "val_metric": round(val_acc, 4),
                }
            else:
                val_loss = float(np.mean((val_preds - y_val) ** 2))
                train_preds = nn.predict(X_train_scaled)
                train_r2 = float(1.0 - (np.sum((y_train - train_preds)**2) / (np.sum((y_train - np.mean(y_train))**2) + 1e-8)))
                val_r2 = float(1.0 - (np.sum((y_val - val_preds)**2) / (np.sum((y_val - np.mean(y_val))**2) + 1e-8)))
                metrics = {
                    "train_loss": round(train_loss, 4),
                    "val_loss": round(val_loss, 4),
                    "train_metric": round(train_r2, 4),
                    "val_metric": round(val_r2, 4),
                }

            weights_summary = nn.get_weights_summary()
            if epoch % max(1, epochs // 50) == 0 or epoch == epochs:
                all_weights_history.append({"epoch": epoch, "summary": weights_summary})

            # Telemetry throttling: emit if interval exceeded or final epoch
            now = time.time()
            if (now - session.last_broadcast_time >= min_broadcast_interval) or epoch == epochs:
                session.last_broadcast_time = now
                tick = {
                    "type": "training_tick",
                    "model_id": model_id,
                    "step": epoch,
                    "total_steps": epochs,
                    "progress_pct": round((epoch / epochs) * 100.0, 1),
                    "is_iterative": True,
                    "metrics": metrics,
                    "weights_summary": weights_summary,
                    "log_message": f"Epoch {epoch}/{epochs} | Loss: {metrics['train_loss']} | Val: {metrics['val_metric']}",
                    "elapsed_seconds": round(now - session.start_time, 2),
                    "status": "training" if epoch < epochs else "trained",
                }
                session.latest_tick = tick
                self.broadcast_tick(model_id, tick)

            # Breathe for 2ms so the GIL can yield to other tasks
            time.sleep(0.002)

        # Save model artifacts
        artifact_path = os.path.join(MODELS_DIR, f"{model_id}.npz")
        nn.save_to_npz(artifact_path)

        # Final evaluation on test set
        test_preds = nn.predict(X_test_scaled)
        if task_type == "classification":
            final_acc = float(round(np.mean(test_preds == y_test), 4))
            final_metrics = {"accuracy": final_acc, "loss": round(1.0 - final_acc, 4)}
        else:
            test_mse = float(round(np.mean((test_preds - y_test) ** 2), 4))
            final_metrics = {"mse": test_mse, "loss": test_mse}

        session.status = "trained"
        self._record_completed_training(model_id, artifact_path, final_metrics, epochs, session.start_time)

    def _train_classical_model(
        self, session, model_id, model_type, task_type, hyperparams,
        scaler, X_train_raw, X_val_raw, X_test_raw, y_train, y_val, y_test,
        split_data, epochs
    ):
        solver_mode = hyperparams.get("solver_mode", "exact")
        is_iterative = (solver_mode == "iterative" and model_type in ["linear_regression", "logistic_regression"]) or (model_type == "random_forest")

        estimator = build_classical_model(model_type, task_type, hyperparams)
        pipeline = build_pipeline(scaler, estimator)

        if is_iterative and model_type == "random_forest":
            # Iterative tree-by-tree training for Random Forest
            n_estimators = hyperparams.get("n_estimators", 40)
            pipeline.named_steps["scaler"].fit(X_train_raw)
            X_train_s = pipeline.named_steps["scaler"].transform(X_train_raw)
            X_val_s = pipeline.named_steps["scaler"].transform(X_val_raw)

            for tree_idx in range(1, n_estimators + 1):
                if session.stop_event.is_set():
                    session.status = "stopped"
                    self._update_db_status(model_id, "stopped")
                    return
                session.pause_event.wait()

                estimator.n_estimators = tree_idx
                estimator.fit(X_train_s, y_train)

                val_metrics = evaluate_model(estimator, X_val_s, y_val, task_type)
                train_metrics = evaluate_model(estimator, X_train_s, y_train, task_type)

                primary_key = "accuracy" if task_type == "classification" else "r2"
                metrics = {
                    "train_loss": train_metrics.get("loss", 0.0),
                    "val_loss": val_metrics.get("loss", 0.0),
                    "train_metric": train_metrics.get(primary_key, 0.0),
                    "val_metric": val_metrics.get(primary_key, 0.0),
                }

                tick = {
                    "type": "training_tick",
                    "model_id": model_id,
                    "step": tree_idx,
                    "total_steps": n_estimators,
                    "progress_pct": round((tree_idx / n_estimators) * 100.0, 1),
                    "is_iterative": True,
                    "metrics": metrics,
                    "log_message": f"Tree {tree_idx}/{n_estimators} | Val {primary_key.capitalize()}: {metrics['val_metric']}",
                    "elapsed_seconds": round(time.time() - session.start_time, 2),
                    "status": "training" if tree_idx < n_estimators else "trained",
                }
                session.latest_tick = tick
                self.broadcast_tick(model_id, tick)
                time.sleep(0.03)

        elif is_iterative and model_type in ["linear_regression", "logistic_regression"]:
            # Iterative SGD training
            pipeline.named_steps["scaler"].fit(X_train_raw)
            X_train_s = pipeline.named_steps["scaler"].transform(X_train_raw)
            X_val_s = pipeline.named_steps["scaler"].transform(X_val_raw)
            all_classes = np.unique(y_train) if task_type == "classification" else None

            for ep in range(1, epochs + 1):
                if session.stop_event.is_set():
                    session.status = "stopped"
                    self._update_db_status(model_id, "stopped")
                    return
                session.pause_event.wait()

                if task_type == "classification":
                    estimator.partial_fit(X_train_s, y_train, classes=all_classes)
                else:
                    estimator.partial_fit(X_train_s, y_train)

                val_metrics = evaluate_model(estimator, X_val_s, y_val, task_type)
                train_metrics = evaluate_model(estimator, X_train_s, y_train, task_type)

                primary_key = "accuracy" if task_type == "classification" else "r2"
                metrics = {
                    "train_loss": train_metrics.get("loss", 0.0),
                    "val_loss": val_metrics.get("loss", 0.0),
                    "train_metric": train_metrics.get(primary_key, 0.0),
                    "val_metric": val_metrics.get(primary_key, 0.0),
                }

                if ep % max(1, epochs // 30) == 0 or ep == epochs:
                    tick = {
                        "type": "training_tick",
                        "model_id": model_id,
                        "step": ep,
                        "total_steps": epochs,
                        "progress_pct": round((ep / epochs) * 100.0, 1),
                        "is_iterative": True,
                        "metrics": metrics,
                        "log_message": f"Epoch {ep}/{epochs} | Val {primary_key.capitalize()}: {metrics['val_metric']}",
                        "elapsed_seconds": round(time.time() - session.start_time, 2),
                        "status": "training" if ep < epochs else "trained",
                    }
                    session.latest_tick = tick
                    self.broadcast_tick(model_id, tick)
                time.sleep(0.005)

        else:
            # Instant / Closed-form model (OLS, Decision Tree, KNN, K-Means)
            t0 = time.time()
            if task_type == "clustering":
                pipeline.fit(X_train_raw)
            else:
                pipeline.fit(X_train_raw, y_train)
            fit_duration = time.time() - t0

            val_metrics = evaluate_model(pipeline, X_val_raw, y_val, task_type)
            train_metrics = evaluate_model(pipeline, X_train_raw, y_train, task_type)

            primary_key = "accuracy" if task_type == "classification" else ("inertia" if task_type == "clustering" else "r2")
            metrics = {
                "train_loss": train_metrics.get("loss", 0.0),
                "val_loss": val_metrics.get("loss", 0.0),
                "train_metric": train_metrics.get(primary_key, 0.0),
                "val_metric": val_metrics.get(primary_key, 0.0),
                "fit_duration_ms": round(fit_duration * 1000.0, 2),
            }

            tick = {
                "type": "training_tick",
                "model_id": model_id,
                "step": 1,
                "total_steps": 1,
                "progress_pct": 100.0,
                "is_iterative": False,
                "metrics": metrics,
                "log_message": f"Closed-form fit complete in {round(fit_duration * 1000.0, 1)}ms | Val {primary_key.capitalize()}: {metrics['val_metric']}",
                "elapsed_seconds": round(fit_duration, 3),
                "status": "trained",
            }
            session.latest_tick = tick
            self.broadcast_tick(model_id, tick)

        # Save pipeline artifact
        artifact_path = os.path.join(MODELS_DIR, f"{model_id}.joblib")
        # Attach feature metadata for raw inference
        pipeline.feature_names_ = split_data["feature_names"]
        pipeline.feature_ranges_ = split_data["feature_ranges"]
        pipeline.target_classes_ = split_data.get("target_classes")
        joblib.dump(pipeline, artifact_path)

        final_test_metrics = evaluate_model(pipeline, X_test_raw, y_test, task_type)
        session.status = "trained"
        self._record_completed_training(model_id, artifact_path, final_test_metrics, 1 if not is_iterative else epochs, session.start_time)

    def _record_completed_training(self, model_id, artifact_path, final_metrics, steps, start_time):
        duration = round(time.time() - start_time, 2)
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE models
            SET status = 'trained', progress = 100.0, current_step = ?, total_steps = ?,
                metrics_json = ?, artifact_path = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        """, (steps, steps, json.dumps(final_metrics), artifact_path, model_id))

        # Also insert experiment run
        cursor.execute("SELECT * FROM models WHERE id = ?", (model_id,))
        m = cursor.fetchone()
        if m:
            cursor.execute("SELECT name FROM datasets WHERE id = ?", (m["dataset_id"],))
            d_name = (cursor.fetchone() or {"name": "Dataset"})["name"]
            import uuid
            exp_id = f"exp_{uuid.uuid4().hex[:8]}"
            cursor.execute("""
                INSERT INTO experiments (
                    id, model_id, model_name, model_type, dataset_id, dataset_name,
                    task_type, hyperparameters_json, metrics_json, duration_seconds, total_steps
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                exp_id, model_id, m["name"], m["model_type"], m["dataset_id"], d_name,
                m["task_type"], m["hyperparameters_json"], json.dumps(final_metrics), duration, steps
            ))

        conn.commit()
        conn.close()
