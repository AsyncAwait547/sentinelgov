import os
import json
import logging
import joblib
from typing import Dict, Any
from fastapi import FastAPI, BackgroundTasks, HTTPException
from pydantic import BaseModel
import numpy as np

app = FastAPI(title="SentinelGov Risk Inference Engine")
logging.basicConfig(level=logging.INFO)

class TelemetryPacket(BaseModel):
    rainfall: float
    drainageCapacity: float
    populationDensity: float
    socialSpike: float

class InferenceResult(BaseModel):
    predictedRisk: float
    confidenceHigh: float
    confidenceLow: float
    modelUsed: str

# Try to load the trained Random Forest model. If not found, use a fallback heuristic.
MODEL_PATH = "models/flood_rf_model.joblib"
try:
    if os.path.exists(MODEL_PATH):
        ml_model = joblib.load(MODEL_PATH)
        logging.info("✅ Loaded trained Random Forest model successfully.")
    else:
        ml_model = None
        logging.warning("⚠️ No trained model found at models/flood_rf_model.joblib. Using heuristic fallback.")
except Exception as e:
    ml_model = None
    logging.error(f"Failed to load model: {e}")

@app.post("/predict-risk", response_model=InferenceResult)
async def predict_risk(data: TelemetryPacket):
    """
    Real AI Model Integration: Inference endpoint running the trained Scikit-Learn Random Forest.
    If the model isn't built yet, it seamlessly falls back to the deterministic math formula.
    """
    # Create input feature array [rainfall, drainageCapacity, populationDensity, socialSpike]
    X_infer = np.array([[data.rainfall, data.drainageCapacity, data.populationDensity, data.socialSpike]])

    if ml_model is not None:
        # ─── REAL INFERENCE (Scikit-Learn Random Forest) ───
        # We can extract the predictions from ALL trees in the forest to calculate a mean and standard deviation!
        # This provides a REAL mathematical confidence interval.
        preds = []
        for estimator in ml_model.estimators_:
            preds.append(estimator.predict(X_infer)[0])
        
        predicted_risk = np.mean(preds)
        std_dev = np.std(preds)
        
        # 95% Confidence Interval (1.96 * std_dev)
        margin_of_error = max(1.96 * std_dev, 2.0) # minimum 2% margin to represent base uncertainty
        
        return InferenceResult(
            predictedRisk=round(predicted_risk, 1),
            confidenceHigh=round(min(predicted_risk + margin_of_error, 100), 1),
            confidenceLow=round(max(predicted_risk - margin_of_error, 0), 1),
            modelUsed="RandomForest_v1.0"
        )
    else:
        # ─── HEURISTIC FALLBACK (If .joblib lacks training) ───
        rain_norm = min(data.rainfall / 150.0, 1.0)
        drainage_fail = 1.0 - data.drainageCapacity
        
        non_linear_rain_impact = rain_norm ** 1.3
        combined_geo = (non_linear_rain_impact * 0.5) + (drainage_fail * 0.25)
        
        base_risk = combined_geo + (data.socialSpike * 0.15) + (data.populationDensity * 0.1)
        predicted_risk = min(max(base_risk * 100, 0), 100)
    
        variance = max(3.0, predicted_risk * 0.08)
        
        return InferenceResult(
            predictedRisk=round(predicted_risk, 1),
            confidenceHigh=round(min(predicted_risk + variance, 100), 1),
            confidenceLow=round(max(predicted_risk - variance, 0), 1),
            modelUsed="HeuristicFallback_v0.1"
        )

@app.get("/health")
def read_root():
    return {"status": "ok", "service": "ML Inference", "model_loaded": ml_model is not None}
