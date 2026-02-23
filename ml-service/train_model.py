import os
import json
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score

# ─────────────────────────────────────────────────────────────────────────────
# SentinelGov ML Model Trainer
# ─────────────────────────────────────────────────────────────────────────────
# This script generates synthetic telemetry data representing various flood scenarios
# and trains a Random Forest Regressor to predict flood risk severity ([0-100]).
# It saves the trained model to a .joblib file for the FastAPI service to serve.

def generate_synthetic_data(num_samples=10000):
    print(f"Generating {num_samples} synthetic telemetry records...")
    
    # 1. Nominal data (low rainfall, good drainage)
    nom_len = int(num_samples * 0.4)
    nom_rain = np.random.uniform(0, 30, nom_len)
    nom_drain = np.random.uniform(0.7, 1.0, nom_len)
    nom_pop = np.random.uniform(0.1, 0.4, nom_len)
    nom_soc = np.random.uniform(0.0, 0.2, nom_len)
    
    # 2. Heavy rain, high drainage (moderate risk)
    mod_len = int(num_samples * 0.3)
    mod_rain = np.random.uniform(30, 80, mod_len)
    mod_drain = np.random.uniform(0.5, 0.9, mod_len)
    mod_pop = np.random.uniform(0.2, 0.6, mod_len)
    mod_soc = np.random.uniform(0.1, 0.5, mod_len)
    
    # 3. Crisis scenarios (huge rainfall, failing drainage)
    crit_len = num_samples - nom_len - mod_len
    crit_rain = np.random.uniform(80, 150, crit_len)
    crit_drain = np.random.uniform(0.0, 0.4, crit_len)
    crit_pop = np.random.uniform(0.5, 0.9, crit_len)
    crit_soc = np.random.uniform(0.6, 1.0, crit_len)
    
    # Combine everything
    rainfall = np.concatenate([nom_rain, mod_rain, crit_rain])
    drainage = np.concatenate([nom_drain, mod_drain, crit_drain])
    population = np.concatenate([nom_pop, mod_pop, crit_pop])
    social = np.concatenate([nom_soc, mod_soc, crit_soc])

    # True Risk calculation (non-linear equation to mimic ground-truth complexity)
    rain_norm = np.clip(rainfall / 150.0, 0, 1.0)
    drain_fail = 1.0 - drainage
    
    # The more rain, the exponentially worse drainage failure is
    combined_geo_impact = (rain_norm ** 1.3) * 0.5 + (drain_fail ** 1.2) * 0.25 + (rain_norm * drain_fail) * 0.1
    social_impact = social * 0.15
    pop_impact = population * 0.10
    
    base_risk = combined_geo_impact + social_impact + pop_impact
    true_risk = np.clip(base_risk * 100, 0, 100)
    
    # Add gaussian noise representing real-world sensor inaccuracies
    noise = np.random.normal(0, 3.5, num_samples)
    final_risk = np.clip(true_risk + noise, 0, 100)
    
    df = pd.DataFrame({
        'rainfall': rainfall,
        'drainageCapacity': drainage,
        'populationDensity': population,
        'socialSpike': social,
        'targetRisk': final_risk
    })
    
    # Shuffle dataset
    df = df.sample(frac=1, random_state=42).reset_index(drop=True)
    return df

def train_and_export():
    df = generate_synthetic_data(15000)
    
    X = df[['rainfall', 'drainageCapacity', 'populationDensity', 'socialSpike']]
    y = df['targetRisk']
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    print("Training Random Forest Regressor (n_estimators=100, max_depth=12)...")
    model = RandomForestRegressor(n_estimators=100, max_depth=12, random_state=42, n_jobs=-1)
    model.fit(X_train, y_train)
    
    # Evaluate
    y_pred = model.predict(X_test)
    mae = mean_absolute_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)
    
    print("\n✅ Training Complete!")
    print(f"Model Mean Absolute Error (MAE): {mae:.2f}")
    print(f"Model R² Score: {r2:.4f}")
    
    # View feature importances
    importances = model.feature_importances_
    print("\nFeature Importances:")
    features = X.columns
    for f, imp in zip(features, importances):
        print(f"  - {f}: {imp*100:.1f}%")

    # Export
    os.makedirs('models', exist_ok=True)
    joblib_path = 'models/flood_rf_model.joblib'
    joblib.dump(model, joblib_path)
    
    print(f"\n💾 Model weights exported to: {joblib_path}")
    print("The SentinelGov FastAPI Server will automatically load this at runtime.")

if __name__ == "__main__":
    train_and_export()
