import pandas as pd
import numpy as np
from sklearn.preprocessing import LabelEncoder
from sklearn.multioutput import MultiOutputClassifier
from xgboost import XGBClassifier
import joblib
from statsmodels.tsa.arima.model import ARIMA
import warnings
warnings.filterwarnings("ignore")

# ----------------------------
# 1️⃣ Load Dataset
# ----------------------------
df = pd.read_csv(r"D:\Inventory Project\Backend\Dataset\balanced_indian_inventory_2000.csv")

# ----------------------------
# 2️⃣ Preprocess Features for ML
# ----------------------------
features = ['current_stock', 'daily_sales', 'weekly_sales', 'reorder_level', 
            'lead_time', 'days_to_empty']

# Encode categorical features
categorical = ['brand', 'category', 'location', 'supplier_name']
label_encoders = {}
for col in categorical:
    le = LabelEncoder()
    df[col] = le.fit_transform(df[col])
    label_encoders[col] = le
    features.append(col)

# ----------------------------
# 3️⃣ Encode target labels for ML
# ----------------------------
y = df[['stock_status', 'priority']]
target_encoders = {}
y_encoded = pd.DataFrame()

for col in ['stock_status', 'priority']:
    le = LabelEncoder()
    y_encoded[col] = le.fit_transform(y[col])
    target_encoders[col] = le

# ----------------------------
# 4️⃣ Train ML Model (XGBoost multi-output)
# ----------------------------
xgb = XGBClassifier(n_estimators=200, random_state=42, use_label_encoder=False, eval_metric='mlogloss')
multi_xgb = MultiOutputClassifier(xgb)
multi_xgb.fit(df[features], y_encoded)

# Save ML model and target encoders
joblib.dump(multi_xgb, r'D:\Inventory Project\Backend\Models\ml_stock_priority_model.pkl')
joblib.dump(target_encoders, r'D:\Inventory Project\Backend\Models\target_label_encoders.pkl')
print("✅ ML model and label encoders saved successfully!")

# ----------------------------
# 5️⃣ Fit ARIMA Models per Item
# ----------------------------
arima_models = {}
for item_id in df['item_id'].unique():
    item_data = df[df['item_id']==item_id].sort_values('date')
    sales = item_data['daily_sales'].values
    try:
        model = ARIMA(sales, order=(1,1,1))
        model_fit = model.fit()
        arima_models[item_id] = model_fit
    except:
        continue

# Save ARIMA models
joblib.dump(arima_models, r'D:\Inventory Project\Backend\Models\arima_models_dict.pkl')
print("✅ ARIMA models saved successfully!")

# ----------------------------
# 6️⃣ Generate Combined Alerts
# ----------------------------
def forecast_sales(item_id, steps=30):
    if item_id in arima_models:
        forecast = arima_models[item_id].forecast(steps=steps)
        forecast = np.maximum(forecast, 0)
    else:
        item_data = df[df['item_id']==item_id]
        forecast = np.array([np.mean(item_data['daily_sales'])]*steps)
    return forecast

def generate_alerts(row, forecast_sales=None):
    alerts = []
    
    # Immediate ML-based alert
    if row['stock_status'] == 'Understock' or row['priority'] in ['High','Very High']:
        alerts.append(f"Immediate Restock Needed: {row['priority']}")
    
    # Forecast-based alert
    if forecast_sales is not None:
        total_forecasted = sum(forecast_sales)
        if total_forecasted > row['current_stock']:
            alerts.append(f"Future Restock Warning: Forecasted sales {int(total_forecasted)} exceed current stock {row['current_stock']}")
    
    if not alerts:
        alerts.append("Stock OK")
    
    return "; ".join(alerts)

# Generate alerts for latest day of each item
alert_list = []
for item_id in df['item_id'].unique():
    item_data = df[df['item_id']==item_id].sort_values('date').iloc[-1]
    future_sales = forecast_sales(item_id, steps=30)
    alert_text = generate_alerts(item_data, forecast_sales=future_sales)
    alert_list.append({
        'item_id': item_id,
        'product_name': item_data['product_name'],
        'current_stock': item_data['current_stock'],
        'stock_status': item_data['stock_status'],
        'priority': item_data['priority'],
        'alert': alert_text
    })

alerts_df = pd.DataFrame(alert_list)
alerts_df.to_csv(r'D:\Inventory Project\Backend\Combined csv alert\combined_inventory_alerts.csv', index=False)
print("✅ Combined alerts saved as 'combined_inventory_alerts.csv'")
