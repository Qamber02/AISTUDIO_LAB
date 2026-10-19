import type {
  Dataset,
  Model,
  TrainingTick,
  BoundarySliceData,
  TreeNode,
  KNNQueryData,
  Experiment,
  ComparisonModel,
  Citizen,
  SocietyState,
} from './types';

const API_BASE = 'http://127.0.0.1:8000';
const WS_BASE = 'ws://127.0.0.1:8000';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorMsg = `HTTP Error ${res.status}`;
    try {
      const errJson = await res.json();
      errorMsg = errJson.detail || errJson.message || errorMsg;
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }
  return res.json();
}

export const api = {
  // Health
  async getHealth() {
    const res = await fetch(`${API_BASE}/api/health`);
    return handleResponse<{ status: string; service: string; python_version: string; runtime: string }>(res);
  },

  // Datasets
  async getDatasets(): Promise<Dataset[]> {
    const res = await fetch(`${API_BASE}/api/datasets`);
    return handleResponse<Dataset[]>(res);
  },

  async createSyntheticDataset(params: {
    name: string;
    preset: string;
    task_type: string;
    n_samples: number;
    n_features: number;
    noise: number;
    n_classes: number;
    random_state?: number;
  }): Promise<Dataset> {
    const res = await fetch(`${API_BASE}/api/datasets/synthetic`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return handleResponse<Dataset>(res);
  },

  async uploadCsvDataset(file: File, name?: string, targetCol?: string): Promise<Dataset> {
    const formData = new FormData();
    formData.append('file', file);
    if (name) formData.append('name', name);
    if (targetCol) formData.append('target_col', targetCol);

    const res = await fetch(`${API_BASE}/api/datasets/upload`, {
      method: 'POST',
      body: formData,
    });
    return handleResponse<Dataset>(res);
  },

  async getDataset(id: string): Promise<Dataset> {
    const res = await fetch(`${API_BASE}/api/datasets/${id}`);
    return handleResponse<Dataset>(res);
  },

  async getDatasetPreview(id: string, limit = 50): Promise<{ id: string; name: string; features: string[]; target_name: string; total_rows: number; rows: any[] }> {
    const res = await fetch(`${API_BASE}/api/datasets/${id}/preview?limit=${limit}`);
    return handleResponse(res);
  },

  async deleteDataset(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/api/datasets/${id}`, { method: 'DELETE' });
    await handleResponse(res);
  },

  // Models
  async getModels(): Promise<Model[]> {
    const res = await fetch(`${API_BASE}/api/models`);
    return handleResponse<Model[]>(res);
  },

  async createModel(params: {
    name: string;
    description?: string;
    model_type: string;
    task_type: string;
    dataset_id?: string;
    hyperparameters: Record<string, any>;
    training_params?: Record<string, any>;
  }): Promise<Model> {
    const res = await fetch(`${API_BASE}/api/models`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return handleResponse<Model>(res);
  },

  async getModel(id: string): Promise<Model> {
    const res = await fetch(`${API_BASE}/api/models/${id}`);
    return handleResponse<Model>(res);
  },

  async updateModel(id: string, params: Partial<Model>): Promise<Model> {
    const res = await fetch(`${API_BASE}/api/models/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return handleResponse<Model>(res);
  },

  async cloneModel(id: string): Promise<Model> {
    const res = await fetch(`${API_BASE}/api/models/${id}/clone`, { method: 'POST' });
    return handleResponse<Model>(res);
  },

  async deleteModel(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/api/models/${id}`, { method: 'DELETE' });
    await handleResponse(res);
  },

  // Training
  async startTraining(modelId: string, params?: {
    test_split?: number;
    val_split?: number;
    scaler_type?: string;
    epochs?: number;
    batch_size?: number;
    learning_rate?: number;
  }) {
    const res = await fetch(`${API_BASE}/api/training/${modelId}/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params || {}),
    });
    return handleResponse(res);
  },

  async pauseTraining(modelId: string) {
    const res = await fetch(`${API_BASE}/api/training/${modelId}/pause`, { method: 'POST' });
    return handleResponse(res);
  },

  async resumeTraining(modelId: string) {
    const res = await fetch(`${API_BASE}/api/training/${modelId}/resume`, { method: 'POST' });
    return handleResponse(res);
  },

  async stopTraining(modelId: string) {
    const res = await fetch(`${API_BASE}/api/training/${modelId}/stop`, { method: 'POST' });
    return handleResponse(res);
  },

  async getTrainingStatus(modelId: string) {
    const res = await fetch(`${API_BASE}/api/training/${modelId}/status`);
    return handleResponse<{ status: string; latest_tick: TrainingTick | null }>(res);
  },

  connectTrainingWebSocket(
    modelId: string,
    onTick: (tick: TrainingTick) => void,
    onOpen?: () => void,
    onClose?: () => void
  ): WebSocket {
    const ws = new WebSocket(`${WS_BASE}/api/training/ws/${modelId}`);
    ws.onopen = () => onOpen?.();
    ws.onmessage = (event) => {
      try {
        const tick = JSON.parse(event.data);
        onTick(tick);
      } catch (e) {
        console.error('Failed to parse WS tick', e);
      }
    };
    ws.onclose = () => onClose?.();
    return ws;
  },

  // Visualizations
  async getBoundarySlice(modelId: string, params: {
    feature_x: string;
    feature_y: string;
    resolution?: number;
    fixed_features?: Record<string, number>;
  }): Promise<BoundarySliceData> {
    const res = await fetch(`${API_BASE}/api/visualization/${modelId}/boundary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return handleResponse<BoundarySliceData>(res);
  },

  async queryKNN(modelId: string, queryPoint: Record<string, number>, k?: number): Promise<KNNQueryData> {
    const res = await fetch(`${API_BASE}/api/visualization/${modelId}/knn-query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query_point: queryPoint, k }),
    });
    return handleResponse<KNNQueryData>(res);
  },

  async getTreeHierarchy(modelId: string): Promise<{ hierarchy: TreeNode }> {
    const res = await fetch(`${API_BASE}/api/visualization/${modelId}/tree`);
    return handleResponse<{ hierarchy: TreeNode }>(res);
  },

  async getFeatureImportances(modelId: string): Promise<{ importances: Array<{ feature: string; importance: number }> }> {
    const res = await fetch(`${API_BASE}/api/visualization/${modelId}/feature-importances`);
    return handleResponse(res);
  },

  async getNeuralWeights(modelId: string): Promise<{
    layers: Array<{ layer_index: number; name: string; size: number; biases: number[] }>;
    weight_matrices: number[][][];
  }> {
    const res = await fetch(`${API_BASE}/api/visualization/${modelId}/neural-weights`);
    return handleResponse(res);
  },

  // Inference & Export
  async predictSingle(modelId: string, features: Record<string, number>): Promise<{
    prediction: string | number;
    probabilities?: Record<string, number>;
    latency_ms: number;
  }> {
    const res = await fetch(`${API_BASE}/api/inference/${modelId}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ features }),
    });
    return handleResponse(res);
  },

  async batchEvaluate(modelId: string): Promise<{
    metrics: Record<string, number>;
    confusion_matrix?: number[][];
    classes?: string[];
    classification_report?: any;
    predictions_preview?: any[];
  }> {
    const res = await fetch(`${API_BASE}/api/inference/${modelId}/batch-evaluate`, { method: 'POST' });
    return handleResponse(res);
  },

  async getExportCode(modelId: string): Promise<{ code: string; filename: string }> {
    const res = await fetch(`${API_BASE}/api/inference/${modelId}/export-code`);
    return handleResponse(res);
  },

  getDownloadArtifactUrl(modelId: string): string {
    return `${API_BASE}/api/inference/${modelId}/download`;
  },

  // Experiments
  async getExperiments(): Promise<{ experiments: Experiment[]; comparison_matrix: ComparisonModel[] }> {
    const res = await fetch(`${API_BASE}/api/experiments`);
    return handleResponse(res);
  },

  async deleteExperiment(expId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/api/experiments/${expId}`, { method: 'DELETE' });
    await handleResponse(res);
  },

  // AI Society Simulator
  async getSocietyState(): Promise<SocietyState> {
    const res = await fetch(`${API_BASE}/api/society/state`);
    return handleResponse<SocietyState>(res);
  },

  async stepSociety(): Promise<SocietyState> {
    const res = await fetch(`${API_BASE}/api/society/step`, { method: 'POST' });
    return handleResponse<SocietyState>(res);
  },

  async toggleSocietyPlay(): Promise<{ is_running: boolean }> {
    const res = await fetch(`${API_BASE}/api/society/toggle-play`, { method: 'POST' });
    return handleResponse(res);
  },

  async setSocietySpeed(speed: number): Promise<{ speed: number }> {
    const res = await fetch(`${API_BASE}/api/society/speed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ speed }),
    });
    return handleResponse(res);
  },

  async applyGodAction(actionType: string, payload: Record<string, any> = {}): Promise<{ status: string; message: string; state: SocietyState }> {
    const res = await fetch(`${API_BASE}/api/society/god-action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action_type: actionType, payload }),
    });
    return handleResponse(res);
  },

  async sendSocietyChatMessage(message: string): Promise<{ status: string; new_messages: any[]; state: SocietyState }> {
    const res = await fetch(`${API_BASE}/api/society/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });
    return handleResponse(res);
  },

  connectSocietyWebSocket(
    onState: (state: SocietyState) => void,
    onOpen?: () => void,
    onClose?: () => void
  ): WebSocket {
    const ws = new WebSocket(`${WS_BASE}/api/society/ws`);
    ws.onopen = () => onOpen?.();
    ws.onmessage = (event) => {
      try {
        const state = JSON.parse(event.data);
        onState(state);
      } catch (e) {
        console.error('Failed to parse Society WS message', e);
      }
    };
    ws.onclose = () => onClose?.();
    return ws;
  },
};
