import numpy as np
import json
from typing import List, Dict, Any, Tuple, Optional


def relu(z):
    return np.maximum(0, z)


def d_relu(z):
    return (z > 0).astype(float)


def sigmoid(z):
    # Clip z to avoid overflow in exp
    z_clipped = np.clip(z, -500, 500)
    return 1.0 / (1.0 + np.exp(-z_clipped))


def d_sigmoid(a):
    return a * (1.0 - a)


def tanh(z):
    return np.tanh(z)


def d_tanh(a):
    return 1.0 - (a ** 2)


def softmax(z):
    z_shifted = z - np.max(z, axis=-1, keepdims=True)
    exp_z = np.exp(z_shifted)
    return exp_z / np.sum(exp_z, axis=-1, keepdims=True)


def scale_features(
    X: Any,
    method: str = "standard",
    params: Optional[Dict[str, Any]] = None,
) -> Tuple[np.ndarray, Dict[str, Any]]:
    """Scales numeric features using standard (z-score) or min-max normalization."""
    X_arr = np.asarray(X, dtype=float)
    if params is None:
        params = {}
        if method == "standard":
            params["mean"] = np.mean(X_arr, axis=0).tolist()
            std = np.std(X_arr, axis=0)
            params["scale"] = np.where(std == 0, 1.0, std).tolist()
        elif method == "minmax":
            params["min"] = np.min(X_arr, axis=0).tolist()
            rng = np.max(X_arr, axis=0) - np.min(X_arr, axis=0)
            params["scale"] = np.where(rng == 0, 1.0, rng).tolist()

    if "mean" in params and "scale" in params:
        mean = np.array(params["mean"])
        scale = np.array(params["scale"])
        scaled = (X_arr - mean) / np.where(scale == 0, 1.0, scale)
    elif "min" in params and "scale" in params:
        min_val = np.array(params["min"])
        scale = np.array(params["scale"])
        scaled = (X_arr - min_val) / np.where(scale == 0, 1.0, scale)
    else:
        scaled = X_arr
    return scaled, params


class InspectableNeuralNetwork:
    """
    Transparent NumPy Multi-Layer Perceptron designed specifically for
    interactive visualization, layer-by-layer weight extraction, and forward-pass pulses.
    """

    def __init__(
        self,
        layer_sizes: Optional[List[int]] = None,
        input_dim: Optional[int] = None,
        hidden_dims: Optional[List[int]] = None,
        output_dim: Optional[int] = None,
        activation: Optional[str] = None,
        hidden_activation: str = "relu",
        task_type: str = "classification",
        learning_rate: float = 0.01,
        optimizer: str = "adam",
        weight_decay: float = 1e-4,
        seed: Optional[int] = None,
        random_state: int = 42,
    ):
        if layer_sizes is None:
            if input_dim is not None and output_dim is not None:
                layer_sizes = [input_dim] + (hidden_dims or []) + [output_dim]
            else:
                layer_sizes = [2, 4, 1]

        self.layer_sizes = layer_sizes
        if activation is not None:
            hidden_activation = activation
        self.hidden_activation_name = hidden_activation.lower()
        self.task_type = task_type
        self.learning_rate = learning_rate
        self.optimizer_type = optimizer.lower()
        self.weight_decay = weight_decay
        self.random_state = seed if seed is not None else random_state

        np.random.seed(self.random_state)

        # Set activation functions
        if self.hidden_activation_name == "sigmoid":
            self.act_fn = sigmoid
            self.d_act_fn = d_sigmoid
        elif self.hidden_activation_name == "tanh":
            self.act_fn = tanh
            self.d_act_fn = d_tanh
        else:
            self.act_fn = relu
            self.d_act_fn = d_relu

        # Initialize Weights & Biases (He or Xavier initialization)
        self.weights: List[np.ndarray] = []
        self.biases: List[np.ndarray] = []

        for i in range(len(layer_sizes) - 1):
            n_in = layer_sizes[i]
            n_out = layer_sizes[i + 1]
            scale = np.sqrt(2.0 / n_in) if self.hidden_activation_name == "relu" else np.sqrt(1.0 / n_in)
            W = np.random.randn(n_in, n_out) * scale
            b = np.zeros((1, n_out))
            self.weights.append(W)
            self.biases.append(b)

        # Adam optimizer state
        self.m_w = [np.zeros_like(W) for W in self.weights]
        self.v_w = [np.zeros_like(W) for W in self.weights]
        self.m_b = [np.zeros_like(b) for b in self.biases]
        self.v_b = [np.zeros_like(b) for b in self.biases]
        self.t = 0

        # Scaler parameters for physical raw-unit inference
        self.scaler_params: Dict[str, Any] = {}
        self.feature_names: List[str] = []
        self.class_labels: List[str] = []

    def scale_features(self, X: Any) -> np.ndarray:
        """Scales raw physical features using stored scaler parameters if present."""
        if not self.scaler_params:
            return np.asarray(X, dtype=float)
        scaled, _ = scale_features(X, params=self.scaler_params)
        return scaled

    def forward(self, X: np.ndarray) -> Tuple[List[np.ndarray], List[np.ndarray]]:
        """Computes forward pass through all layers, retaining intermediate activations."""
        X_arr = np.asarray(X, dtype=float)
        if X_arr.ndim == 1:
            X_arr = X_arr.reshape(1, -1)
        activations = [X_arr]
        pre_activations = []

        for i in range(len(self.weights)):
            W = self.weights[i]
            b = self.biases[i]
            z = np.dot(activations[-1], W) + b
            pre_activations.append(z)

            # Last layer activation
            if i == len(self.weights) - 1:
                if self.task_type == "classification":
                    if self.layer_sizes[-1] == 1:
                        a = sigmoid(z)
                    else:
                        a = softmax(z)
                else:
                    a = z  # Linear for regression
            else:
                a = self.act_fn(z)

            activations.append(a)

        return activations, pre_activations

    def train_epoch(self, X: np.ndarray, y: np.ndarray, batch_size: int = 32) -> float:
        """Trains one full epoch on mini-batches and returns mean loss."""
        X = np.asarray(X, dtype=float)
        y = np.asarray(y)
        n_samples = len(X)
        indices = np.random.permutation(n_samples)
        epoch_losses = []

        # Prepare one-hot targets if multiclass
        if self.task_type == "classification" and self.layer_sizes[-1] > 1:
            y_one_hot = np.zeros((n_samples, self.layer_sizes[-1]))
            for idx, label in enumerate(y):
                y_one_hot[idx, int(label)] = 1.0
            y_target = y_one_hot
        else:
            y_target = y.reshape(-1, 1)

        for start_idx in range(0, n_samples, batch_size):
            batch_idx = indices[start_idx : start_idx + batch_size]
            X_batch = X[batch_idx]
            y_batch = y_target[batch_idx]
            m = len(X_batch)

            # Forward pass
            activations, pre_activations = self.forward(X_batch)
            y_pred = activations[-1]

            # Compute loss
            if self.task_type == "classification":
                eps = 1e-12
                y_pred_clipped = np.clip(y_pred, eps, 1.0 - eps)
                if self.layer_sizes[-1] == 1:
                    batch_loss = -np.mean(y_batch * np.log(y_pred_clipped) + (1.0 - y_batch) * np.log(1.0 - y_pred_clipped))
                else:
                    batch_loss = -np.mean(np.sum(y_batch * np.log(y_pred_clipped), axis=-1))
                delta = (y_pred - y_batch) / m
            else:
                batch_loss = np.mean((y_pred - y_batch) ** 2)
                delta = 2.0 * (y_pred - y_batch) / m

            epoch_losses.append(batch_loss)

            # Backward pass
            self.t += 1
            beta1, beta2, eps_adam = 0.9, 0.999, 1e-8

            for i in reversed(range(len(self.weights))):
                a_prev = activations[i]
                dW = np.dot(a_prev.T, delta) + self.weight_decay * self.weights[i]
                db = np.sum(delta, axis=0, keepdims=True)

                if i > 0:
                    # Propagate delta to previous layer
                    z_prev = pre_activations[i - 1]
                    if self.hidden_activation_name == "relu":
                        d_act = d_relu(z_prev)
                    elif self.hidden_activation_name == "sigmoid":
                        d_act = d_sigmoid(activations[i])
                    elif self.hidden_activation_name == "tanh":
                        d_act = d_tanh(activations[i])
                    else:
                        d_act = np.ones_like(z_prev)
                    delta = np.dot(delta, self.weights[i].T) * d_act

                # Optimizer update
                if self.optimizer_type == "adam":
                    self.m_w[i] = beta1 * self.m_w[i] + (1 - beta1) * dW
                    self.v_w[i] = beta2 * self.v_w[i] + (1 - beta2) * (dW ** 2)
                    m_w_corr = self.m_w[i] / (1 - beta1 ** self.t)
                    v_w_corr = self.v_w[i] / (1 - beta2 ** self.t)
                    self.weights[i] -= self.learning_rate * m_w_corr / (np.sqrt(v_w_corr) + eps_adam)

                    self.m_b[i] = beta1 * self.m_b[i] + (1 - beta1) * db
                    self.v_b[i] = beta2 * self.v_b[i] + (1 - beta2) * (db ** 2)
                    m_b_corr = self.m_b[i] / (1 - beta1 ** self.t)
                    v_b_corr = self.v_b[i] / (1 - beta2 ** self.t)
                    self.biases[i] -= self.learning_rate * m_b_corr / (np.sqrt(v_b_corr) + eps_adam)
                else:
                    self.weights[i] -= self.learning_rate * dW
                    self.biases[i] -= self.learning_rate * db

        return float(np.mean(epoch_losses))

    def predict(self, X: Any) -> np.ndarray:
        X_arr = np.asarray(X, dtype=float)
        if X_arr.ndim == 1:
            X_arr = X_arr.reshape(1, -1)
        activations, _ = self.forward(X_arr)
        output = activations[-1]
        if self.task_type == "classification":
            if self.layer_sizes[-1] == 1:
                return (output >= 0.5).astype(int).ravel()
            else:
                return np.argmax(output, axis=-1)
        else:
            return output.ravel()

    def predict_proba(self, X: Any) -> np.ndarray:
        X_arr = np.asarray(X, dtype=float)
        if X_arr.ndim == 1:
            X_arr = X_arr.reshape(1, -1)
        activations, _ = self.forward(X_arr)
        output = activations[-1]
        if self.task_type == "classification":
            if self.layer_sizes[-1] == 1:
                p1 = output.ravel()
                return np.column_stack([1.0 - p1, p1])
            return output
        return output

    def get_weights_summary(self) -> Dict[str, Any]:
        """Provides lightweight weight matrices and bias arrays for live telemetry & Canvas visualizer."""
        layers = []
        for idx, size in enumerate(self.layer_sizes):
            name = "Input" if idx == 0 else ("Output" if idx == len(self.layer_sizes) - 1 else f"Hidden {idx}")
            biases = self.biases[idx - 1].flatten().round(3).tolist() if idx > 0 else [0.0] * size
            layers.append({
                "layer_index": idx,
                "name": name,
                "size": size,
                "biases": biases,
            })

        weight_matrices = []
        for W in self.weights:
            weight_matrices.append(W.round(3).tolist())

        return {
            "layers": layers,
            "weight_matrices": weight_matrices,
        }

    def inspect_sample_forward_pass(self, single_x: np.ndarray) -> Dict[str, Any]:
        """Computes neuron activations for a single input query, returning normalized pulses."""
        activations, _ = self.forward(single_x.reshape(1, -1))
        layer_activations = []
        for idx, act in enumerate(activations):
            layer_activations.append(act.flatten().round(4).tolist())
        return {"layer_activations": layer_activations}

    def save_to_npz(self, filepath: str):
        arrays_to_save = {}
        for idx, W in enumerate(self.weights):
            arrays_to_save[f"W_{idx}"] = W
        for idx, b in enumerate(self.biases):
            arrays_to_save[f"b_{idx}"] = b
        metadata = {
            "layer_sizes": self.layer_sizes,
            "hidden_activation": self.hidden_activation_name,
            "task_type": self.task_type,
            "scaler_params": self.scaler_params,
            "feature_names": self.feature_names,
            "class_labels": self.class_labels,
        }
        np.savez_compressed(filepath, metadata=json.dumps(metadata), **arrays_to_save)

    @classmethod
    def load_from_npz(cls, filepath: str) -> "InspectableNeuralNetwork":
        data = np.load(filepath, allow_pickle=True)
        metadata = json.loads(str(data["metadata"]))
        nn = cls(
            layer_sizes=metadata["layer_sizes"],
            hidden_activation=metadata["hidden_activation"],
            task_type=metadata["task_type"],
        )
        nn.weights = [data[f"W_{i}"] for i in range(len(metadata["layer_sizes"]) - 1)]
        nn.biases = [data[f"b_{i}"] for i in range(len(metadata["layer_sizes"]) - 1)]
        nn.scaler_params = metadata.get("scaler_params", {})
        nn.feature_names = metadata.get("feature_names", [])
        nn.class_labels = metadata.get("class_labels", [])
        return nn
