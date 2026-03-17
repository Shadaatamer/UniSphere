import pandas as pd
import joblib
from sklearn.model_selection import train_test_split
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import OneHotEncoder
from sklearn.metrics import accuracy_score, roc_auc_score
from xgboost import XGBClassifier

# Load datasets
student_info = pd.read_csv("studentInfo.csv")
student_vle = pd.read_csv("studentVle.csv")
student_assessment = pd.read_csv("studentAssessment.csv")

# Create total clicks per student
clicks = student_vle.groupby("id_student", as_index=False)["sum_click"].sum()

# Create assessment features
assessment_stats = student_assessment.groupby("id_student", as_index=False).agg(
    avg_score=("score", "mean"),
    assessments_done=("id_assessment", "count")
)

# Merge all data
data = student_info.merge(clicks, on="id_student", how="left")
data = data.merge(assessment_stats, on="id_student", how="left")

# Fill missing values
data["sum_click"] = data["sum_click"].fillna(0)
data["avg_score"] = data["avg_score"].fillna(0)
data["assessments_done"] = data["assessments_done"].fillna(0)

# Target column
data["at_risk"] = data["final_result"].apply(
    lambda x: 1 if x in ["Fail", "Withdrawn"] else 0
)

# Features
feature_cols = [
    "sum_click",
    "studied_credits",
    "imd_band",
    "region",
    "code_module",
    "avg_score",
    "assessments_done",
]

X = data[feature_cols]
y = data["at_risk"]

categorical_features = ["imd_band", "region", "code_module"]
numeric_features = ["sum_click", "studied_credits", "avg_score", "assessments_done"]

preprocessor = ColumnTransformer(
    transformers=[
        ("num", SimpleImputer(strategy="constant", fill_value=0), numeric_features),
        ("cat", Pipeline([
            ("imputer", SimpleImputer(strategy="most_frequent")),
            ("onehot", OneHotEncoder(handle_unknown="ignore"))
        ]), categorical_features),
    ]
)

model = XGBClassifier(
    max_depth=6,
    n_estimators=300,
    learning_rate=0.05,
    objective="binary:logistic",
    eval_metric="logloss",
    random_state=42
)

pipeline = Pipeline([
    ("preprocessor", preprocessor),
    ("model", model)
])

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

pipeline.fit(X_train, y_train)

pred = pipeline.predict(X_test)
prob = pipeline.predict_proba(X_test)[:, 1]

print("Accuracy:", accuracy_score(y_test, pred))
print("AUC:", roc_auc_score(y_test, prob))

joblib.dump(pipeline, "student_risk_pipeline.pkl")
print("Saved: student_risk_pipeline.pkl")