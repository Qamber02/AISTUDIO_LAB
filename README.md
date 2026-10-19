# AI Model Lab (AI Studio Lab)

A machine-learning creation, visualization, and simulation platform powered by Python (FastAPI, Scikit-learn, NumPy) and React (TypeScript, Vite).

AI Model Lab bridges the gap between white-box educational tools and practical machine learning platforms. It allows users to generate synthetic datasets, configure and train machine learning algorithms with live telemetry, visualize internal weights and decision boundaries, benchmark up to ten models side-by-side, and run an autonomous simulation where machine learning models act as citizens in a self-governing cyber-society.

---

## Key Capabilities

### 1. Dataset Studio
- Synthetic dataset generation: Two Moons, Concentric Circles, Multi-Class Gaussian Blobs, XOR Nonlinear, Continuous Linear, Polynomial Curves, Friedman Benchmark, and Cluster Blobs.
- Real CSV file upload with automated column inference, missing value detection, and feature type categorization.
- Real-time statistical summary (mean, standard deviation, quartiles, class distributions).
- Scatter plot visualizer with color-coded classes and continuous regression previews.

### 2. Model Creation Studio
Supports 7 beginner-friendly and intermediate machine learning algorithms:
- Linear Regression (Ordinary Least Squares and iterative SGD Regressor)
- Logistic Regression (Softmax and Binary cross-entropy with iterative SGD)
- Decision Tree Classifier and Regressor (Gini impurity, Entropy, configurable max depth and split criteria)
- Random Forest Classifier and Regressor (Iterative ensemble tree growth via warm_start)
- K-Nearest Neighbors (KNN with Euclidean, Manhattan, and Minkowski distance metrics)
- K-Means Clustering (Iterative centroid convergence and inertia tracking)
- Neural Network / Multi-Layer Perceptron (Custom inspectable NumPy MLP engine with per-epoch forward/backward pass, ReLU/Sigmoid/Tanh activations, and Adam/SGD optimizers)

### 3. Real-Time Training Lab
- Live training telemetry streamed over WebSockets (`/api/training/{model_id}/ws`).
- Interactive Pause, Resume, and Early Stop controls.
- Synchronized loss curves, validation loss, training accuracy, and validation accuracy.
- Epoch-by-epoch learning rate adjustments and convergence detection.

### 4. Interactive Visualizer Studio
- Neural Network Architecture Visualizer: Dynamic SVG node-link diagram rendering layer neurons, color-coded synaptic connection weights, forward signal pulses, and bias shifts.
- 2D Decision Boundary Hyperplane Slicer: Dynamic meshgrid contour plots projecting decision surfaces on any two selected features with slice sliders for remaining dimensions.
- Decision Tree Graph: Hierarchical tree view showing split thresholds, node purity, sample counts, and leaf predictions.
- KNN Dynamic Neighbor Links: Live query visualizer highlighting k-nearest neighbors and distance vectors.

### 5. Model Playground
- Interactive inference using sliders configured in raw physical units (e.g., Celsius, square feet, kilometers) rather than normalized scaling artifacts.
- Prediction confidence distributions and probabilities.
- Tabular Confusion Matrix with Precision, Recall, and F1-Score breakdown for classification.
- Standalone Python code exporter generating self-contained scripts to replicate the pipeline locally.

### 6. Experiments Studio
- Side-by-side benchmarking of up to 10 models simultaneously.
- Comparative radar charts and bar charts evaluating Accuracy, Loss, R2 Score, Mean Squared Error, and Training Duration.
- Automated ranking and performance leaderboards.

### 7. Autonomous AI Society Studio
Transforms trained machine learning models into 10 autonomous citizen agents in a self-governing simulation:
- 10 Distinct Archetypes: Each citizen embodies a unique model algorithm (e.g., Aria the Deep Seeker as Neural Network, Kaelen the Arbiter as Decision Tree, Thorne the Vanguard as Linear SGD, Sylvia the Consensual as Random Forest).
- Fictional Armaments: Catalog of sci-fi weapons (Singularity Gravity Orb, Plasma Void Blade, Quantum Resonance Staff, Chrono Aegis Shield, Cipher Longbow, Nanite Hive Scepter) with Attack, Defense, and passive traits.
- 30-Second Action Pacing: Each agent observes a mandatory 30-second cooldown between major actions (trading, dueling, crafting, harvesting, contemplating), ensuring a calm and observable simulation rhythm.
- Democratic Council Chamber: Citizens introduce civic bills and vote sequentially across a 30-second window. Each bot casts its AYE or NAY vote with an explainable rationale based on its underlying algorithm and ideology.
- Community Treasury & Laws: Enacts community edicts (Peace Treaty, Universal Energy Dividend, Arms Regulation) with real economic and combat fines.
- Online Reinforcement Learning: Citizen policy weights adapt organically via policy gradient updates after every trade, combat, and legislative outcome.
- God Mode Command Deck: Direct interventions to inject crystals, trigger cataclysms (Solar Flare Storm, Financial Crash, Void Titan Incursion), call emergency general elections, and bestow legendary armaments.

---

## Technology Stack

- Backend: Python 3.10+ / Python 3.15, FastAPI, Uvicorn, Scikit-learn, NumPy, SQLite, WebSockets.
- Frontend: React 18, TypeScript, Vite, Vanilla CSS Design System, HTML5 2D Canvas, Lucide Icons.

---

## Architecture Overview

```
AI MODEL LAB
├── backend/
│   ├── main.py                     # FastAPI application entrypoint and middleware
│   ├── db.py                       # SQLite persistence layer
│   ├── ml/
│   │   ├── datasets.py             # Synthetic generator and CSV parser
│   │   ├── preprocessor.py         # Leak-free splitting and raw-unit scaling
│   │   ├── models_classical.py     # Scikit-learn wrappers (warm_start and SGD)
│   │   ├── models_neural.py        # Inspectable NumPy MLP engine
│   │   └── visualization_engine.py # Decision boundaries and hyperplane slicer
│   ├── routers/
│   │   ├── datasets_router.py      # Dataset CRUD and preview endpoints
│   │   ├── models_router.py        # Model configuration and storage
│   │   ├── training_router.py      # WebSocket training loop and telemetry
│   │   ├── visualization_router.py # Weight matrices and decision boundaries
│   │   ├── inference_router.py     # Playground prediction and code export
│   │   ├── experiments_router.py   # Model comparison and benchmarking
│   │   └── society_router.py       # AI Society REST and WebSocket endpoints
│   └── society/
│       ├── weapons.py              # Fictional weapon catalog and stats
│       ├── governance.py           # Council sessions, voting, and election engine
│       ├── agents.py               # 10 Citizen agents and online RL policy
│       └── engine.py               # Spatial grid and autonomous simulation loop
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx                 # Main application layout and routing
│   │   ├── api.ts                  # REST client and WebSocket managers
│   │   ├── types.ts                # TypeScript domain models and interfaces
│   │   ├── index.css               # Dark theme design system and glassmorphism
│   │   └── components/
│   │       ├── HeaderNav.tsx       # Brand header and 5-step progression bar
│   │       ├── TabNavigation.tsx   # 9 Studio workspace tabs
│   │       ├── OverviewStudio.tsx  # Dashboard and 1-click templates
│   │       ├── DatasetStudio.tsx   # Dataset generator and statistics
│   │       ├── ModelStudio.tsx     # Algorithm configuration and hyperparameters
│   │       ├── TrainingLab.tsx     # Live epoch telemetry and charts
│   │       ├── VisualizerStudio.tsx# Neural weights, trees, and boundaries
│   │       ├── ModelPlayground.tsx # Raw-unit sliders and confusion matrix
│   │       ├── ExperimentsStudio.tsx# Leaderboards and benchmark comparisons
│   │       ├── SocietyStudio.tsx   # 2D terrarium map, Council, and God Mode
│   │       └── SettingsStudio.tsx  # Workspace maintenance and reset
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── test_pipeline.py                # 13-stage automated regression test suite
├── .gitignore                      # Git exclusion rules
└── README.md                       # Project documentation
```

---

## Installation and Setup

### Prerequisites
- Python 3.10 or higher
- Node.js 18 or higher with npm

### 1. Backend Setup

From the repository root:

```bash
# Install backend dependencies
pip install fastapi uvicorn scikit-learn numpy pydantic websockets

# Start the FastAPI backend server
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

The backend API will be available at `http://127.0.0.1:8000`.
Interactive OpenAPI documentation is available at `http://127.0.0.1:8000/docs`.

### 2. Frontend Setup

In a separate terminal, navigate to the `frontend` directory:

```bash
cd frontend

# Install frontend dependencies
npm install

# Start Vite development server
npm run dev
```

The frontend application will be accessible at `http://127.0.0.1:5173`.

---

## Running Verification Tests

To run the automated 13-stage verification pipeline:

```bash
python test_pipeline.py
```

This validates dataset generation, classical model training, iterative neural network training, WebSocket telemetry streaming, hyperplane visualization slicing, raw-unit inference, and multi-model benchmarking.

---

## API Summary

- `GET /api/datasets` - List available datasets
- `POST /api/datasets/synthetic` - Generate synthetic dataset
- `POST /api/datasets/upload` - Upload CSV dataset
- `GET /api/models` - List configured models
- `POST /api/models` - Create and configure a model
- `POST /api/training/{model_id}/start` - Begin model training
- `WS /api/training/{model_id}/ws` - Stream live epoch metrics
- `GET /api/visualization/{model_id}/neural-architecture` - Extract layer weights and biases
- `POST /api/visualization/{model_id}/decision-boundary-2d` - 2D hyperplane decision contour
- `POST /api/inference/{model_id}/predict` - Raw-unit feature prediction
- `GET /api/inference/{model_id}/export-code` - Export reproducible standalone Python script
- `GET /api/society/state` - Fetch current state of AI society
- `POST /api/society/toggle-play` - Pause or resume simulation
- `POST /api/society/speed` - Set simulation speed (1x, 2x, 5x)
- `POST /api/society/god-action` - Execute divine interventions
- `WS /api/society/ws` - Real-time AI society simulation stream

---

## License

This project is licensed under the MIT License.
