import sqlite3
import json
import os
from typing import List, Dict, Any, Optional

DB_DIR = os.path.join(os.path.dirname(__file__), "storage")
DB_PATH = os.path.join(DB_DIR, "ai_model_lab.db")
DATASETS_DIR = os.path.join(DB_DIR, "datasets")
MODELS_DIR = os.path.join(DB_DIR, "models")

os.makedirs(DB_DIR, exist_ok=True)
os.makedirs(DATASETS_DIR, exist_ok=True)
os.makedirs(MODELS_DIR, exist_ok=True)


def get_db_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()

    # Datasets table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS datasets (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        source_type TEXT NOT NULL,
        task_type TEXT NOT NULL,
        row_count INTEGER NOT NULL,
        feature_count INTEGER NOT NULL,
        features_json TEXT NOT NULL,
        target_name TEXT,
        generator_config_json TEXT,
        file_path TEXT NOT NULL,
        summary_stats_json TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    # Models table (up to 10 active in workspace)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS models (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        model_type TEXT NOT NULL,
        task_type TEXT NOT NULL,
        dataset_id TEXT,
        hyperparameters_json TEXT NOT NULL,
        training_params_json TEXT NOT NULL,
        status TEXT DEFAULT 'untrained',
        progress REAL DEFAULT 0.0,
        current_step INTEGER DEFAULT 0,
        total_steps INTEGER DEFAULT 0,
        metrics_json TEXT,
        artifact_path TEXT,
        weights_history_path TEXT,
        version INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (dataset_id) REFERENCES datasets(id) ON DELETE SET NULL
    )
    """)

    # Experiments & runs
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS experiments (
        id TEXT PRIMARY KEY,
        model_id TEXT NOT NULL,
        model_name TEXT NOT NULL,
        model_type TEXT NOT NULL,
        dataset_id TEXT NOT NULL,
        dataset_name TEXT NOT NULL,
        task_type TEXT NOT NULL,
        hyperparameters_json TEXT NOT NULL,
        metrics_json TEXT NOT NULL,
        duration_seconds REAL,
        total_steps INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    # Training logs table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS training_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        model_id TEXT NOT NULL,
        step INTEGER NOT NULL,
        train_loss REAL,
        val_loss REAL,
        train_metric REAL,
        val_metric REAL,
        log_message TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    conn.commit()
    conn.close()


init_db()
