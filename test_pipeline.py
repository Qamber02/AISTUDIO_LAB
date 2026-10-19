import time
import requests
import json

BASE_URL = "http://127.0.0.1:8000"

def test_pipeline():
    print("=== AI Model Lab Automated Pipeline Verification ===")

    # 1. Health check
    r = requests.get(f"{BASE_URL}/api/health")
    assert r.status_code == 200, f"Health check failed: {r.text}"
    print("✔ Health Check OK:", r.json()["service"])

    # 2. Datasets
    r = requests.get(f"{BASE_URL}/api/datasets")
    assert r.status_code == 200
    datasets = r.json()
    print(f"✔ Datasets Loaded: {len(datasets)} initial datasets found")
    assert len(datasets) >= 1

    # 3. Create a new synthetic dataset (Circles)
    r = requests.post(f"{BASE_URL}/api/datasets/synthetic", json={
        "name": "Integration Test Circles",
        "preset": "circles",
        "task_type": "classification",
        "n_samples": 400,
        "n_features": 2,
        "noise": 0.12,
        "n_classes": 2,
        "random_state": 42
    })
    assert r.status_code == 200, f"Dataset creation failed: {r.text}"
    circles_ds = r.json()
    print(f"✔ Synthetic Circles Dataset Created: ID={circles_ds['id']}, Rows={circles_ds['row_count']}")

    # 4. Create Neural Network Model
    r = requests.post(f"{BASE_URL}/api/models", json={
        "name": "E2E Neural Classifier",
        "description": "2-layer MLP on Circles",
        "model_type": "neural_network",
        "task_type": "classification",
        "dataset_id": circles_ds["id"],
        "hyperparameters": {
            "hidden_layers": [10, 6],
            "activation": "relu",
            "optimizer": "adam",
            "learning_rate": 0.03
        },
        "training_params": {
            "epochs": 40,
            "batch_size": 32,
            "learning_rate": 0.03,
            "test_split": 0.2,
            "val_split": 0.15,
            "scaler_type": "standard"
        }
    })
    assert r.status_code == 200, f"Model creation failed: {r.text}"
    nn_model = r.json()
    print(f"✔ Neural Model Created: ID={nn_model['id']}, Status={nn_model['status']}")

    # 5. Start Training
    r = requests.post(f"{BASE_URL}/api/training/{nn_model['id']}/start")
    assert r.status_code == 200, f"Training start failed: {r.text}"
    print("✔ Training Started asynchronously in Python worker thread...")

    # Poll status until trained
    for _ in range(50):
        time.sleep(0.25)
        r = requests.get(f"{BASE_URL}/api/training/{nn_model['id']}/status")
        status_data = r.json()
        status = status_data.get("status")
        tick = status_data.get("latest_tick") or {}
        if status == "trained" or tick.get("status") == "trained":
            print(f"✔ Training Completed! Final Step: {tick.get('step')}, Val Metric: {tick.get('metrics', {}).get('val_metric')}")
            break
    else:
        raise TimeoutError("Training did not complete in time")

    # 6. Verify Neural Weights extraction
    r = requests.get(f"{BASE_URL}/api/visualization/{nn_model['id']}/neural-weights")
    assert r.status_code == 200
    weights = r.json()
    assert len(weights["layers"]) == 4  # Input, Hidden 1, Hidden 2, Output
    assert len(weights["weight_matrices"]) == 3
    print(f"✔ Neural Weights Extracted: {len(weights['layers'])} layers, {len(weights['weight_matrices'])} synapse matrices")

    # 7. Verify 2D Decision Boundary Slice
    r = requests.post(f"{BASE_URL}/api/visualization/{nn_model['id']}/boundary", json={
        "feature_x": "x1",
        "feature_y": "x2",
        "resolution": 30
    })
    assert r.status_code == 200, f"Boundary slice failed: {r.text}"
    boundary = r.json()
    assert len(boundary["z_mesh"]) == 30
    assert len(boundary["scatter_samples"]) > 0
    print(f"✔ Decision Boundary Slice Generated: {len(boundary['z_mesh'])}x{len(boundary['z_mesh'][0])} meshgrid")

    # 8. Test Single-Sample Inference with Raw Physical Units
    r = requests.post(f"{BASE_URL}/api/inference/{nn_model['id']}/predict", json={
        "features": {"x1": 0.5, "x2": 0.5}
    })
    assert r.status_code == 200, f"Inference failed: {r.text}"
    pred_res = r.json()
    print(f"✔ Live Single-Sample Inference: Prediction={pred_res['prediction']}, Probabilities={pred_res.get('probabilities')}, Latency={pred_res['latency_ms']}ms")

    # 9. Test Batch Evaluation & Confusion Matrix
    r = requests.post(f"{BASE_URL}/api/inference/{nn_model['id']}/batch-evaluate")
    assert r.status_code == 200, f"Batch evaluation failed: {r.text}"
    batch_res = r.json()
    assert "metrics" in batch_res
    print(f"✔ Batch Test Evaluation OK: Metrics={batch_res['metrics']}, Confusion Matrix={batch_res.get('confusion_matrix')}")

    # 10. Verify Standalone Python Code Export
    r = requests.get(f"{BASE_URL}/api/inference/{nn_model['id']}/export-code")
    assert r.status_code == 200
    export_code = r.json()["code"]
    assert "predict(sample_query)" in export_code
    print("✔ Standalone Python Inference Code Generation OK")

    # 11. Test Classical Model: Random Forest
    r = requests.post(f"{BASE_URL}/api/models", json={
        "name": "E2E Random Forest",
        "model_type": "random_forest",
        "task_type": "classification",
        "dataset_id": circles_ds["id"],
        "hyperparameters": {
            "n_estimators": 20,
            "max_depth": 4
        }
    })
    assert r.status_code == 200
    rf_model = r.json()

    # Train Random Forest
    r = requests.post(f"{BASE_URL}/api/training/{rf_model['id']}/start")
    assert r.status_code == 200

    for _ in range(30):
        time.sleep(0.2)
        r = requests.get(f"{BASE_URL}/api/training/{rf_model['id']}/status")
        if r.json()["status"] == "trained":
            print(f"✔ Random Forest Trained via warm_start tree growth!")
            break

    # 12. Verify Feature Importances & Tree
    r = requests.get(f"{BASE_URL}/api/visualization/{rf_model['id']}/feature-importances")
    assert r.status_code == 200
    print(f"✔ Random Forest Feature Importances: {r.json()['importances']}")

    # 13. Verify Experiments Comparison Matrix
    r = requests.get(f"{BASE_URL}/api/experiments")
    assert r.status_code == 200
    exp_data = r.json()
    assert len(exp_data["comparison_matrix"]) >= 2
    print(f"✔ Experiments Matrix OK: {len(exp_data['comparison_matrix'])} models compared")

    print("\n🎉 ALL 13 END-TO-END AUTOMATED VERIFICATION CHECKS PASSED PERFECTLY! 🎉\n")

if __name__ == "__main__":
    test_pipeline()
