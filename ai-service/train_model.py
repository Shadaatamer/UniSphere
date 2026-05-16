import pandas as pd
import os
import joblib
from sklearn.model_selection import train_test_split
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import OneHotEncoder
from sklearn.metrics import accuracy_score, roc_auc_score
from xgboost import XGBClassifier

# Load datasets
base_dir = os.path.dirname(__file__)

student_info = pd.read_csv(os.path.join(base_dir, "studentInfo.csv"))
student_vle = pd.read_csv(os.path.join(base_dir, "studentVle.csv"))
student_assessment = pd.read_csv(os.path.join(base_dir, "studentAssessment.csv"))

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
data["avg_score"] = data["avg_score"].fillna(0)
data["assessments_done"] = data["assessments_done"].fillna(0)

# Target column
data["at_risk"] = data["final_result"].apply(
    lambda x: 1 if x in ["Fail", "Withdrawn"] else 0
)

# Features
feature_cols = [
    "code_module",
    "avg_score",
]

numeric_features  = ["avg_score"]
categorical_features = ["code_module"]

X = data[feature_cols]
y = data["at_risk"]

numeric_features  = ["avg_score"]
categorical_features = ["code_module"]

preprocessor = ColumnTransformer(
    transformers=[
        ("num", SimpleImputer(strategy="constant", fill_value=0), numeric_features),
        ("cat", Pipeline([
            ("imputer", SimpleImputer(strategy="most_frequent")),
            ("onehot", OneHotEncoder(handle_unknown="ignore"))
        ]), categorical_features),
    ]
)

# Count ratio to balance classes
neg = (y == 0).sum()
pos = (y == 1).sum()
ratio = neg / pos
print(f"scale_pos_weight should be: {ratio:.2f}")

model = XGBClassifier(
    max_depth=4,          # reduced to prevent overfitting
    n_estimators=300,
    learning_rate=0.05,
    objective="binary:logistic",
    eval_metric="logloss",
    scale_pos_weight=ratio,  # balances the imbalanced dataset
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
print(data["final_result"].value_counts())
print("=== assessments_done distribution ===")
print(assessment_stats["assessments_done"].describe())

print("\n=== avg_score distribution ===")
print(assessment_stats["avg_score"].describe())

print("\n=== studied_credits distribution ===")
print(student_info["studied_credits"].describe())

print("\n=== Sample of at_risk vs features ===")
print(data[["assessments_done", "avg_score", "studied_credits", "at_risk"]].groupby("at_risk").mean())
joblib.dump(pipeline, "student_risk_pipeline.pkl")
print("Saved: student_risk_pipeline.pkl")