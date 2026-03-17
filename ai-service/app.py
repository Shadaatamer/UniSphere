from flask import Flask, request, jsonify
import pandas as pd
import joblib
import traceback
import os

app = Flask(__name__)

pipeline = joblib.load("student_risk_pipeline.pkl")

REQUIRED_FIELDS = [
    "sum_click",
    "studied_credits",
    "imd_band",
    "region",
    "code_module",
    "avg_score",
    "assessments_done",
]

NUMERIC_FIELDS = [
    "sum_click",
    "studied_credits",
    "avg_score",
    "assessments_done",
]

@app.route("/predict", methods=["POST"])
def predict():
    try:
        data = request.get_json()

        if not data:
            return jsonify({"error": "No JSON body received"}), 400

        missing = [field for field in REQUIRED_FIELDS if field not in data]
        if missing:
            return jsonify({"error": f"Missing fields: {missing}"}), 400

        df = pd.DataFrame([data])

        for col in NUMERIC_FIELDS:
            df[col] = pd.to_numeric(df[col], errors="coerce").astype(float)

        df = df[REQUIRED_FIELDS]

        risk_probability = float(pipeline.predict_proba(df)[0][1])

        if risk_probability >= 0.7:
            risk_level = "high"
        elif risk_probability >= 0.4:
            risk_level = "medium"
        else:
            risk_level = "low"

        return jsonify({
            "risk_probability": risk_probability,
            "risk_level": risk_level
        })

    except Exception as e:
        print("Prediction error:")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5001)))