import pandas as pd
import joblib
import numpy as np
from sklearn.preprocessing import LabelEncoder

# ----------------------------
# 1️⃣ Load new input-only test dataset
# ----------------------------
df_test = pd.read_csv(r"D:\Inventory Project\Backend\Dataset\new_test_inventory_input_only.csv")

# ----------------------------
# 2️⃣ Load saved models
# ----------------------------
ml_model = joblib.load(r"D:\Inventory Project\Backend\Models\ml_stock_priority_model.pkl")
target_encoders = joblib.load(r"D:\Inventory Project\Backend\Models\target_label_encoders.pkl")
arima_models = joblib.load(r"D:\Inventory Project\Backend\Models\arima_models_dict.pkl")

# ----------------------------
# 3️⃣ Preprocess categorical features safely
# ----------------------------
features = ['current_stock', 'daily_sales', 'weekly_sales', 'reorder_level', 
            'lead_time', 'days_to_empty']

categorical = ['brand', 'category', 'location', 'supplier_name']
label_encoders = {}

for col in categorical:
    le = LabelEncoder()
    # Combine training classes (from saved target encoders) and new test data to handle unseen labels
    known_classes = list(target_encoders.get(col, []))
    df_test[col] = df_test[col].astype(str)
    df_test[col] = df_test[col].apply(lambda x: x if x in known_classes else 'Unknown')
    
    le.fit(df_test[col])
    df_test[col] = le.transform(df_test[col])
    label_encoders[col] = le
    features.append(col)

# ----------------------------
# 4️⃣ Predict Stock Status + Priority (ML)
# ----------------------------
X_test = df_test[features]
y_pred_numeric = ml_model.predict(X_test)

# Decode numeric predictions back to original labels
y_pred = pd.DataFrame(y_pred_numeric, columns=['stock_status_pred','priority_pred'])
for col in ['stock_status_pred','priority_pred']:
    original_col = col.replace('_pred','')
    y_pred[col] = target_encoders[original_col].inverse_transform(y_pred[col])

df_test['stock_status_pred'] = y_pred['stock_status_pred']
df_test['priority_pred'] = y_pred['priority_pred']

# ----------------------------
# 5️⃣ Forecast Future Sales (ARIMA)
# ----------------------------
def forecast_sales(item_id, steps=30):
    if item_id in arima_models:
        forecast = arima_models[item_id].forecast(steps=steps)
        forecast = np.maximum(forecast, 0)
    else:
        # fallback: mean of past sales
        item_data = df_test[df_test['item_id']==item_id]
        forecast = np.array([np.mean(item_data['daily_sales'])]*steps)
    return forecast

# ----------------------------
# 6️⃣ Generate Combined Alerts
# ----------------------------
def generate_alerts(row, forecast_sales=None):
    alerts = []
    
    # ML-based alert
    if row['stock_status_pred'] == 'Understock' or row['priority_pred'] in ['High','Very High']:
        alerts.append(f"Immediate Restock Needed: {row['priority_pred']}")
    
    # Forecast-based alert
    if forecast_sales is not None:
        total_forecasted = sum(forecast_sales)
        if total_forecasted > row['current_stock']:
            alerts.append(f"Future Restock Warning: Forecasted sales {int(total_forecasted)} exceed current stock {row['current_stock']}")
    
    if not alerts:
        alerts.append("Stock OK")
    
    return "; ".join(alerts)

# ----------------------------
# 7️⃣ Apply alerts for latest day of each item
# ----------------------------
alert_list = []
for item_id in df_test['item_id'].unique():
    item_data = df_test[df_test['item_id']==item_id].sort_values('date').iloc[-1]
    future_sales = forecast_sales(item_id, steps=30)
    alert_text = generate_alerts(item_data, forecast_sales=future_sales)
    alert_list.append({
        'item_id': item_id,
        'product_name': item_data['product_name'],
        'current_stock': item_data['current_stock'],
        'stock_status_pred': item_data['stock_status_pred'],
        'priority_pred': item_data['priority_pred'],
        'alert': alert_text
    })

alerts_df = pd.DataFrame(alert_list)
alerts_df.to_csv(r'D:\Inventory Project\Backend\Combined csv alert\test_inventory_alerts.csv', index=False)
print("✅ Alerts generated and saved as 'test_inventory_alerts_realistic.csv'")
