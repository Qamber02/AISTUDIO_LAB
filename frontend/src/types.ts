export type TaskType = 'classification' | 'regression' | 'clustering';

export type ModelType = 
  | 'linear_regression'
  | 'logistic_regression'
  | 'decision_tree'
  | 'random_forest'
  | 'knn'
  | 'kmeans'
  | 'neural_network';

export interface Dataset {
  id: string;
  name: string;
  source_type: 'synthetic' | 'csv';
  task_type: TaskType;
  row_count: number;
  feature_count: number;
  features: string[];
  target_name?: string;
  generator_config?: {
    preset?: string;
    n_samples?: number;
    n_features?: number;
    noise?: number;
    n_classes?: number;
    random_state?: number;
  };
  summary_stats?: {
    columns: string[];
    row_count: number;
    column_count: number;
    features: string[];
    target?: string;
    feature_stats: Record<string, { min: number; max: number; mean: number; std: number; median: number }>;
    missing_values: Record<string, number>;
    class_distribution?: Record<string, number>;
    correlations?: {
      columns: string[];
      matrix: number[][];
    };
  };
  created_at?: string;
}

export interface Model {
  id: string;
  name: string;
  description: string;
  model_type: ModelType;
  task_type: TaskType;
  dataset_id?: string;
  dataset_name?: string;
  hyperparameters: Record<string, any>;
  training_params: {
    epochs?: number;
    batch_size?: number;
    learning_rate?: number;
    test_split?: number;
    val_split?: number;
    scaler_type?: string;
  };
  status: 'untrained' | 'training' | 'paused' | 'trained' | 'stopped' | 'failed';
  progress: number;
  current_step: number;
  total_steps: number;
  metrics?: Record<string, number>;
  version: number;
  created_at?: string;
  updated_at?: string;
}

export interface TrainingTick {
  type: string;
  model_id: string;
  step: number;
  total_steps: number;
  progress_pct: number;
  is_iterative: boolean;
  metrics: {
    train_loss?: number;
    val_loss?: number;
    train_metric?: number;
    val_metric?: number;
    fit_duration_ms?: number;
    [key: string]: any;
  };
  weights_summary?: {
    layers: Array<{
      layer_index: number;
      name: string;
      size: number;
      biases: number[];
    }>;
    weight_matrices: number[][][];
  };
  log_message: string;
  elapsed_seconds: number;
  status: string;
}

export interface BoundarySliceData {
  feature_x: string;
  feature_y: string;
  x_min: number;
  x_max: number;
  y_min: number;
  y_max: number;
  x_grid: number[];
  y_grid: number[];
  z_mesh: number[][];
  prob_mesh?: number[][];
  scatter_samples: Array<{
    x: number;
    y: number;
    label: number;
  }>;
}

export interface TreeNode {
  id: number;
  is_leaf: boolean;
  depth: number;
  samples: number;
  impurity: number;
  value: number[];
  feature?: string;
  threshold?: number;
  prediction?: string | number;
  left?: TreeNode;
  right?: TreeNode;
}

export interface KNNQueryData {
  query_point: Record<string, number>;
  k: number;
  neighbor_points: Array<Record<string, any>>;
  distances: number[];
  predicted_class: string | number;
}

export interface Experiment {
  id: string;
  model_id: string;
  model_name: string;
  model_type: ModelType;
  dataset_id: string;
  dataset_name: string;
  task_type: TaskType;
  hyperparameters: Record<string, any>;
  metrics: Record<string, number>;
  duration_seconds: number;
  total_steps: number;
  created_at: string;
}

export interface ComparisonModel {
  model_id: string;
  name: string;
  model_type: ModelType;
  task_type: TaskType;
  dataset_name: string;
  row_count: number;
  feature_count: number;
  accuracy?: number;
  r2?: number;
  loss?: number;
  mse?: number;
  duration: number;
  hyperparameters: Record<string, any>;
  updated_at: string;
}

export interface Citizen {
  id: string;
  name: string;
  algorithm: string;
  archetype: string;
  faction: string;
  color: string;
  avatar: string;
  x: number;
  y: number;
  health: number;
  energy: number;
  crystals: number;
  quantum_cores: number;
  influence: number;
  level: number;
  experience?: number;
  next_level_exp?: number;
  equipped_weapon: {
    id: string;
    name: string;
    tier: string;
    type: string;
    attack: number;
    defense: number;
    special: string;
    color: string;
    icon: string;
  };
  speech_bubble?: string | null;
  trust_matrix: Record<string, number>;
  policy_bias?: number[];
  action_cooldown?: number;
  cooldown_max?: number;
  last_action_name?: string;
  is_ready?: boolean;
}

export interface SocietyState {
  type: string;
  tick: number;
  is_running: boolean;
  speed: number;
  chancellor: {
    id: string;
    name: string;
    term_remaining: number;
  };
  treasury_crystals: number;
  active_laws: Array<{
    id: string;
    title: string;
    description: string;
    effect: string;
    penalty?: number;
    tax_rate?: number;
    influence_req?: number;
    boost?: number;
    seizure?: number;
  }>;
  council: {
    in_session: boolean;
    bill?: any;
    ballots: Record<string, string>;
    timer: number;
  };
  map_nodes: Array<{
    id: string;
    name: string;
    type: string;
    x: number;
    y: number;
    color: string;
  }>;
  agents: Citizen[];
  event_logs: Array<{
    id: string;
    tick: number;
    time: string;
    text: string;
    category: string;
  }>;
}

export const VERSION = '1.0.0';

