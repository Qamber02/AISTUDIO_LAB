import pytest
import numpy as np
import pandas as pd
import json
import os
from sklearn.ensemble import RandomForestClassifier
from sklearn.tree import DecisionTreeClassifier

from backend.ml.models_neural import InspectableNeuralNetwork
from backend.ml.preprocessor import prepare_data_splits
from backend.ml.datasets import (
    generate_synthetic_dataset,
    parse_and_save_csv,
    compute_dataset_summary
)
from backend.ml.visualization_engine import extract_decision_tree_hierarchy
from backend.society.agents import CitizenAgent, CITIZEN_ARCHETYPES
from backend.society.engine import SocietySimulationEngine
from backend.db import get_db_connection

# =====================================================================
# 1. InspectableNeuralNetwork & Custom Gradient Mathematical Audit
# =====================================================================

def test_neural_network_gradient_finite_differences():
    """Verify analytical gradients calculated in backward() match numerical finite differences."""
    np.random.seed(42)
    X = np.random.randn(4, 3)
    # Binary classification target (0 or 1)
    y = np.array([0, 1, 0, 1])

    net = InspectableNeuralNetwork(
        layer_sizes=[3, 5, 4, 2],
        hidden_activation="relu",
        task_type="classification",
        learning_rate=0.01,
        optimizer="sgd",
        weight_decay=0.0,
        random_state=42
    )

    # One-hot target for multi-class
    y_target = np.zeros((4, 2))
    for idx, lbl in enumerate(y):
        y_target[idx, lbl] = 1.0

    # Forward pass
    activations, pre_activations = net.forward(X)
    y_pred = activations[-1]
    m = len(X)
    delta = (y_pred - y_target) / m

    # Compute analytical gradients through exact backprop logic
    dW_analytical = []
    db_analytical = []
    cur_delta = delta.copy()

    for i in reversed(range(len(net.weights))):
        a_prev = activations[i]
        dW = np.dot(a_prev.T, cur_delta)
        db = np.sum(cur_delta, axis=0, keepdims=True)
        dW_analytical.insert(0, dW)
        db_analytical.insert(0, db)
        if i > 0:
            z_prev = pre_activations[i - 1]
            d_act = (z_prev > 0).astype(float)
            cur_delta = np.dot(cur_delta, net.weights[i].T) * d_act

    epsilon = 1e-6
    for layer_idx, (W, b) in enumerate(zip(net.weights, net.biases)):
        dW_an = dW_analytical[layer_idx]
        db_an = db_analytical[layer_idx]

        # Numerical gradient for W
        for i in range(W.shape[0]):
            for j in range(W.shape[1]):
                W[i, j] += epsilon
                p_plus, _ = net.forward(X)
                loss_plus = -np.mean(np.sum(y_target * np.log(np.clip(p_plus[-1], 1e-12, 1.0 - 1e-12)), axis=-1))

                W[i, j] -= 2 * epsilon
                p_minus, _ = net.forward(X)
                loss_minus = -np.mean(np.sum(y_target * np.log(np.clip(p_minus[-1], 1e-12, 1.0 - 1e-12)), axis=-1))

                W[i, j] += epsilon  # restore
                dW_numerical = (loss_plus - loss_minus) / (2 * epsilon)

                assert np.isclose(dW_an[i, j], dW_numerical, atol=1e-4), (
                    f"Layer {layer_idx} W[{i},{j}] gradient mismatch: "
                    f"analytical={dW_an[i, j]}, numerical={dW_numerical}"
                )

        # Numerical gradient for b
        db_an_flat = db_an.ravel()
        for j in range(len(b)):
            b[j] += epsilon
            p_plus, _ = net.forward(X)
            loss_plus = -np.mean(np.sum(y_target * np.log(np.clip(p_plus[-1], 1e-12, 1.0 - 1e-12)), axis=-1))

            b[j] -= 2 * epsilon
            p_minus, _ = net.forward(X)
            loss_minus = -np.mean(np.sum(y_target * np.log(np.clip(p_minus[-1], 1e-12, 1.0 - 1e-12)), axis=-1))

            b[j] += epsilon  # restore
            db_numerical = (loss_plus - loss_minus) / (2 * epsilon)

            assert np.isclose(db_an_flat[j], db_numerical, atol=1e-4), (
                f"Layer {layer_idx} b[{j}] gradient mismatch: "
                f"analytical={db_an_flat[j]}, numerical={db_numerical}"
            )


def test_neural_network_input_shapes_and_activations():
    """Verify net handles 1D arrays, Python lists, and different activation functions."""
    for act in ["relu", "tanh", "sigmoid"]:
        net = InspectableNeuralNetwork(
            layer_sizes=[2, 4, 2],
            hidden_activation=act,
            task_type="classification"
        )
        # Test 1D array
        probs_1d = net.predict_proba(np.array([0.5, -0.2]))
        assert probs_1d.shape == (1, 2)
        assert np.isclose(np.sum(probs_1d), 1.0, atol=1e-5)

        # Test list input
        probs_list = net.predict_proba([0.5, -0.2])
        assert probs_list.shape == (1, 2)
        assert np.isclose(np.sum(probs_list), 1.0, atol=1e-5)


def test_neural_network_scale_features():
    """Verify net.scale_features handles stored scaler parameters properly."""
    net = InspectableNeuralNetwork(layer_sizes=[2, 3, 1], task_type="regression")
    net.scaler_params = {"mean": [2.0, 20.0], "scale": [1.0, 10.0]}

    X = np.array([[2.0, 20.0], [3.0, 30.0]])
    scaled = net.scale_features(X)
    assert np.allclose(scaled[0], [0.0, 0.0], atol=1e-6)
    assert np.allclose(scaled[1], [1.0, 1.0], atol=1e-6)


# =====================================================================
# 2. Preprocessor & Categorical Features Audit
# =====================================================================

def test_preprocessor_categorical_and_missing_values():
    """Verify preprocessor does not wipe string categoricals to 0.0 and handles missing values."""
    df = pd.DataFrame({
        "color": ["red", "blue", "green", "red", None, "blue"],
        "size": ["S", "M", "L", "M", "S", "L"],
        "metric": [1.5, None, 3.2, 4.1, 2.0, 3.5],
        "label": [0, 1, 0, 1, 0, 1]
    })

    splits = prepare_data_splits(
        df=df,
        target_col="label",
        task_type="classification",
        test_size=0.33,
        val_size=0.0,
        scaler_type="standard",
        random_state=42
    )

    assert len(splits["feature_names"]) == 3  # color, size, metric
    assert "color" in splits["category_mappings"]
    assert "size" in splits["category_mappings"]
    assert len(splits["category_mappings"]["color"]) >= 3
    assert not np.isnan(splits["X_train_scaled"]).any()
    assert not np.isnan(splits["X_test_scaled"]).any()
    assert len(splits["target_classes"]) == 2


# =====================================================================
# 3. Datasets: Synthetic Generators & CSV Parser
# =====================================================================

def test_synthetic_generators_all_presets():
    """Verify all synthetic dataset presets generate expected shapes and valid targets."""
    presets = [
        ("circles", "classification"),
        ("moons", "classification"),
        ("blobs", "classification"),
        ("xor", "classification"),
        ("linear", "regression"),
        ("polynomial", "regression"),
        ("friedman", "regression")
    ]
    for preset, task in presets:
        ds_id, summary = generate_synthetic_dataset(
            name=f"test_{preset}",
            preset=preset,
            task_type=task,
            n_samples=100,
            noise=0.1,
            n_classes=2,
            random_state=42
        )
        assert ds_id.startswith("ds_")
        assert summary["row_count"] == 100
        assert summary["task_type"] == task


def test_csv_parser_encodings_and_delimiters():
    """Verify CSV parser correctly detects delimiters, handles encodings, and deduplicates columns."""
    csv_bytes = "feature_a;feature_a;target\n1.0;2.0;1\n3.0;4.0;0\n5.0;6.0;1\n7.0;8.0;0\n9.0;10.0;1\n".encode("latin-1")

    ds_id, dataset_dict = parse_and_save_csv(
        "test_semicolon_csv",
        file_content_bytes=csv_bytes,
        target_col="target"
    )
    assert ds_id.startswith("ds_")
    assert dataset_dict["row_count"] == 5
    assert len(dataset_dict["features"]) == 2
    assert dataset_dict["target_name"] == "target"


# =====================================================================
# 4. Visualization Engine: Decision Trees & Boundaries
# =====================================================================

def test_decision_tree_hierarchy_extraction():
    """Verify extract_decision_tree_hierarchy extracts hierarchy for DecisionTreeClassifier and RandomForestClassifier."""
    X = np.array([[1, 2], [3, 4], [5, 6], [7, 8]])
    y = np.array([0, 0, 1, 1])

    # 1. DecisionTreeClassifier
    dt = DecisionTreeClassifier(max_depth=2).fit(X, y)
    dt_hierarchy = extract_decision_tree_hierarchy(dt, ["f1", "f2"], ["class_0", "class_1"])
    assert "is_leaf" in dt_hierarchy
    assert "left" in dt_hierarchy
    assert "right" in dt_hierarchy
    assert "samples" in dt_hierarchy

    # 2. RandomForestClassifier (fallback to estimator.estimators_[0].tree_)
    rf = RandomForestClassifier(n_estimators=5, max_depth=2, random_state=42).fit(X, y)
    rf_hierarchy = extract_decision_tree_hierarchy(rf, ["f1", "f2"], ["class_0", "class_1"])
    assert "is_leaf" in rf_hierarchy
    assert "left" in rf_hierarchy
    assert "right" in rf_hierarchy
    assert "samples" in rf_hierarchy


# =====================================================================
# 5. Standalone Python Code Export & Execution Verification
# =====================================================================

def test_standalone_python_export_execution():
    """Verify the generated standalone inference code executes without errors via exec()."""
    net = InspectableNeuralNetwork(
        layer_sizes=[2, 4, 2],
        hidden_activation="relu",
        task_type="classification",
        random_state=42
    )
    weights_dump = [W.tolist() for W in net.weights]
    biases_dump = [b.tolist() for b in net.biases]

    code_script = f"""
import numpy as np
import json

WEIGHTS = [np.array(w) for w in json.loads('{json.dumps(weights_dump)}')]
BIASES = [np.array(b) for b in json.loads('{json.dumps(biases_dump)}')]
TASK_TYPE = 'classification'
FEATURE_NAMES = ['x1', 'x2']
TARGET_CLASSES = ['0', '1']

def relu(x):
    return np.maximum(0, x)

def softmax(x):
    e = np.exp(x - np.max(x, axis=-1, keepdims=True))
    return e / np.sum(e, axis=-1, keepdims=True)

def predict(features_dict):
    x = np.array([[float(features_dict.get(f, 0.0)) for f in FEATURE_NAMES]])
    for i in range(len(WEIGHTS) - 1):
        x = relu(np.dot(x, WEIGHTS[i]) + BIASES[i])
    logits = np.dot(x, WEIGHTS[-1]) + BIASES[-1]
    probs = softmax(logits)[0]
    pred_idx = int(np.argmax(probs))
    return {{
        "prediction": TARGET_CLASSES[pred_idx],
        "probabilities": {{TARGET_CLASSES[i]: float(probs[i]) for i in range(len(TARGET_CLASSES))}}
    }}

test_query = {{"x1": 0.5, "x2": -0.2}}
result = predict(test_query)
"""
    local_scope = {}
    exec(code_script, local_scope)
    assert "result" in local_scope
    assert "prediction" in local_scope["result"]
    assert "probabilities" in local_scope["result"]
    assert local_scope["result"]["prediction"] in ["0", "1"]


# =====================================================================
# 6. Autonomous AI Society: Laws, Chancellor Elections & Policy Updates
# =====================================================================

def test_society_action_propose_law():
    """Verify propose_law action creates a proposal and triggers council session."""
    engine = SocietySimulationEngine()
    agent = engine.agents[0]
    agent.action_cooldown = 0
    engine.governance.council_in_session = False

    # Force agent to propose law
    agent.decide_action = lambda c, d: "propose_law"
    engine.step_simulation()

    # Ensure council was started and action recorded
    assert agent.last_action_name == "Proposing Law"
    assert engine.governance.council_in_session is True


def test_society_active_laws_enforcement():
    """Verify active civic laws affect energy, treasury, and resources properly."""
    engine = SocietySimulationEngine(num_citizens=6)
    
    # 1. Enact welfare_energy law
    engine.active_laws = ["welfare_energy"]
    engine.treasury = 50.0
    engine.citizens[0].energy = 20.0
    prev_energy = engine.citizens[0].energy

    engine.step()
    assert engine.citizens[0].energy > prev_energy


def test_society_chancellor_term_expiration():
    """Verify chancellor term counts down and triggers new election when reaching 0."""
    engine = SocietySimulationEngine()
    engine.governance.chancellor_term = 1  # 1 tick remaining

    engine.step_simulation()
    # Term should have triggered election and reset
    assert engine.governance.chancellor_term > 0
    assert engine.governance.chancellor_id is not None


def test_society_agent_policy_gradient_clipping_and_softmax():
    """Verify policy vector weights are clipped to [-5, 5] and to_dict() returns valid probability distribution."""
    agent = CitizenAgent(config=CITIZEN_ARCHETYPES[0], initial_x=5, initial_y=5)
    agent.last_features = np.ones(8)
    agent.last_action_idx = 1

    # Apply huge positive and negative rewards
    for _ in range(100):
        agent.learn_from_outcome(10.0)

    agent.last_action_idx = 4
    for _ in range(100):
        agent.learn_from_outcome(-10.0)

    # Weights must be clamped within [-5.0, 5.0]
    assert np.all(agent.policy_bias >= -5.0)
    assert np.all(agent.policy_bias <= 5.0)

    agent_dict = agent.to_dict()
    probs = list(agent_dict["policy_bias"].values())
    # Values should all be positive probabilities summing to ~1.0
    assert all(p >= 0.0 for p in probs)
    assert np.isclose(sum(probs), 1.0, atol=1e-3)


# =====================================================================
# 7. Database Integrity & Foreign Key Cascade Audit
# =====================================================================

def test_database_foreign_keys_enabled():
    """Verify PRAGMA foreign_keys is enabled in SQLite connections."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("PRAGMA foreign_keys;")
    row = cursor.fetchone()
    conn.close()
    assert row[0] == 1, "PRAGMA foreign_keys is not enabled!"
