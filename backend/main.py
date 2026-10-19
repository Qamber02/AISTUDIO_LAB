import sys
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from .db import init_db, get_db_connection
from .ml.datasets import generate_synthetic_dataset
from .routers.datasets_router import router as datasets_router
from .routers.models_router import router as models_router
from .routers.training_router import router as training_router
from .routers.visualization_router import router as visualization_router
from .routers.inference_router import router as inference_router
from .routers.experiments_router import router as experiments_router
from .routers.society_router import router as society_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Ensure database is initialized
    init_db()

    # Seed default starter datasets if empty
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) as cnt FROM datasets")
    count = cursor.fetchone()["cnt"]
    conn.close()

    if count == 0:
        print("[AI Model Lab] Seeding starter datasets...")
        try:
            generate_synthetic_dataset(
                name="Non-Linear Moons (2D)",
                preset="moons",
                task_type="classification",
                n_samples=600,
                n_features=2,
                noise=0.18,
                n_classes=2,
                random_state=42,
            )
            generate_synthetic_dataset(
                name="Noisy Linear Curve",
                preset="linear",
                task_type="regression",
                n_samples=500,
                n_features=2,
                noise=0.25,
                random_state=42,
            )
            generate_synthetic_dataset(
                name="Multiclass Gaussian Blobs",
                preset="blobs",
                task_type="classification",
                n_samples=600,
                n_features=2,
                noise=0.20,
                n_classes=3,
                random_state=42,
            )
            print("[AI Model Lab] Starter datasets seeded successfully.")
        except Exception as e:
            print(f"[AI Model Lab] Starter dataset seeding skipped: {e}")

    yield


app = FastAPI(
    title="AI Model Lab API",
    description="Python-Powered AI Creation and Simulation Platform",
    version="1.0.0",
    lifespan=lifespan,
)

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include all API routers
app.include_router(datasets_router)
app.include_router(models_router)
app.include_router(training_router)
app.include_router(visualization_router)
app.include_router(inference_router)
app.include_router(experiments_router)
app.include_router(society_router)


@app.get("/api/health")
def health_check():
    return {
        "status": "online",
        "service": "AI Model Lab Engine",
        "python_version": sys.version,
        "runtime": "CPU",
        "max_workspace_models": 10,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, reload=True)
