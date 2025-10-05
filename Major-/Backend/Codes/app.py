from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np
import joblib
import xgboost as xgb
from pymongo import MongoClient
from datetime import datetime, timedelta
from sklearn.preprocessing import LabelEncoder
import os
import traceback

app = Flask(__name__)
# CRITICAL: Enable CORS for frontend on port 5173
CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:5173", "http://localhost:5174"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type"]
    }
})

# MongoDB Configuration
MONGODB_URI = "mongodb+srv://luckyak619_db_user:luckyak619@cluster0.lcmjwhw.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
client = MongoClient(MONGODB_URI)
db = client['inventroops']
forecasts_collection = db['forecasts']

# Global variables to store models
ml_model = None
use_xgb_native = False
target_encoders = None
arima_models = None

# Model paths
BASE_PATH = r"D:\sangrahak\Major-\Backend"
JSON_MODEL_PATH = os.path.join(BASE_PATH, "Models", "ml_stock_priority_model.json")
PKL_MODEL_PATH = os.path.join(BASE_PATH, "Models", "ml_stock_priority_model.pkl")
ENCODERS_PATH = os.path.join(BASE_PATH, "Models", "target_label_encoders.pkl")
ARIMA_PATH = os.path.join(BASE_PATH, "Models", "arima_models_dict.pkl")
TEST_DATA_PATH = os.path.join(BASE_PATH, "Combinedcsvalerts", "new_test_inventory_input_only.csv")


def load_models():
    """Load all ML models and encoders at startup"""
    global ml_model, use_xgb_native, target_encoders, arima_models
    
    try:
        # Load ML model
        if os.path.exists(JSON_MODEL_PATH):
            try:
                ml_model = xgb.Booster()
                ml_model.load_model(JSON_MODEL_PATH)
                use_xgb_native = True
                print("✅ Loaded ML model from JSON")
            except Exception as e:
                print(f"⚠️ Failed to load JSON model: {e}")
        
        if ml_model is None and os.path.exists(PKL_MODEL_PATH):
            ml_model = joblib.load(PKL_MODEL_PATH)
            use_xgb_native = False
            print("✅ Loaded ML model from Pickle")
        
        # Load encoders
        if os.path.exists(ENCODERS_PATH):
            target_encoders = joblib.load(ENCODERS_PATH)
            print("✅ Loaded label encoders")
        
        # Load ARIMA models
        if os.path.exists(ARIMA_PATH):
            arima_models = joblib.load(ARIMA_PATH)
            print("✅ Loaded ARIMA models")
        
        return True
    except Exception as e:
        print(f"❌ Error loading models: {e}")
        traceback.print_exc()
        return False


def preprocess_data(df):
    """Preprocess the input data"""
    features = [
        "current_stock",
        "daily_sales",
        "weekly_sales",
        "reorder_level",
        "lead_time",
        "days_to_empty",
    ]
    
    categorical = ["brand", "category", "location", "supplier_name"]
    
    for col in categorical:
        df[col] = df[col].astype(str)
        
        if col in target_encoders:
            le = target_encoders[col]
            
            # Add "Unknown" to classes if missing
            if "Unknown" not in le.classes_:
                le.classes_ = np.append(le.classes_, "Unknown")
            
            # Replace unseen labels with "Unknown"
            df[col] = df[col].apply(
                lambda x: x if x in le.classes_ else "Unknown"
            )
            
            # Transform with training encoder
            df[col] = le.transform(df[col])
        else:
            # If encoder not found, just label encode on the fly
            le = LabelEncoder()
            df[col] = le.fit_transform(df[col])
        
        features.append(col)
    
    return df, features


def predict_stock_status(X_test):
    """Predict stock status and priority"""
    if use_xgb_native:
        dtest = xgb.DMatrix(X_test)
        y_pred_numeric = ml_model.predict(dtest)
        if y_pred_numeric.ndim > 1:
            y_pred_numeric = np.argmax(y_pred_numeric, axis=1)
    else:
        y_pred_numeric = ml_model.predict(X_test)
    
    # Handle model output shape
    if isinstance(y_pred_numeric, np.ndarray):
        if y_pred_numeric.ndim == 1:
            y_pred = pd.DataFrame({
                "stock_status_pred": y_pred_numeric,
                "priority_pred": y_pred_numeric
            })
        elif y_pred_numeric.shape[1] == 2:
            y_pred = pd.DataFrame(
                y_pred_numeric, columns=["stock_status_pred", "priority_pred"]
            )
        else:
            raise ValueError(f"Unexpected model output shape: {y_pred_numeric.shape}")
    else:
        raise ValueError("Model prediction returned unexpected type")
    
    # Decode back to labels
    for col in ["stock_status_pred", "priority_pred"]:
        encoder_key = col.replace("_pred", "")
        if encoder_key in target_encoders:
            encoder = target_encoders[encoder_key]
            try:
                y_pred[col] = encoder.inverse_transform(y_pred[col].astype(int))
            except (ValueError, KeyError) as e:
                print(f"⚠️ Could not decode {col}: {e}")
                y_pred[col] = "Unknown"
    
    return y_pred


def forecast_sales(item_id, df_test, steps=30):
    """Forecast future sales using ARIMA"""
    if item_id in arima_models:
        forecast = arima_models[item_id].forecast(steps=steps)
        forecast = np.maximum(forecast, 0)
    else:
        item_data = df_test[df_test["item_id"] == item_id]
        if not item_data.empty:
            forecast = np.array([np.mean(item_data["daily_sales"])] * steps)
        else:
            forecast = np.zeros(steps)
    return forecast


def generate_alerts(row, forecast_sales=None):
    """Generate alerts based on predictions"""
    alerts = []
    
    if row["stock_status_pred"] == "Understock" or row["priority_pred"] in ["High", "Very High"]:
        alerts.append(f"Immediate Restock Needed: {row['priority_pred']}")
    
    if forecast_sales is not None:
        total_forecasted = sum(forecast_sales)
        if total_forecasted > row["current_stock"]:
            alerts.append(
                f"Future Restock Warning: Forecasted sales {int(total_forecasted)} exceed current stock {row['current_stock']}"
            )
    
    if not alerts:
        alerts.append("Stock OK")
    
    return "; ".join(alerts)


def generate_forecast_data(future_sales, current_date):
    """Generate forecast data points for the next 30 days"""
    forecast_data = []
    base_date = datetime.strptime(current_date, '%Y-%m-%d') if isinstance(current_date, str) else current_date
    
    for i, predicted_val in enumerate(future_sales):
        forecast_date = base_date + timedelta(days=i+1)
        forecast_data.append({
            "date": forecast_date.strftime('%Y-%m-%d'),
            "predicted": float(predicted_val),
            "actual": None,
            "confidence": float(np.random.uniform(0.75, 0.95))  # Mock confidence
        })
    
    return forecast_data


@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "OK",
        "timestamp": datetime.now().isoformat(),
        "models_loaded": ml_model is not None and target_encoders is not None
    })


@app.route('/api/ml/predict', methods=['POST', 'OPTIONS'])
def predict_all():
    """Run predictions on all inventory items and store in MongoDB"""
    if request.method == 'OPTIONS':
        return '', 204
    
    try:
        print("🔄 Starting prediction process...")
        
        # Load test data
        if not os.path.exists(TEST_DATA_PATH):
            return jsonify({
                "success": False,
                "error": f"Test data file not found at: {TEST_DATA_PATH}"
            }), 404
        
        print(f"📂 Loading data from: {TEST_DATA_PATH}")
        df_test = pd.read_csv(TEST_DATA_PATH)
        print(f"✅ Loaded {len(df_test)} records")
        
        # Preprocess data
        print("🔧 Preprocessing data...")
        df_test, features = preprocess_data(df_test)
        X_test = df_test[features]
        
        # Predict
        print("🤖 Running ML predictions...")
        y_pred = predict_stock_status(X_test)
        df_test["stock_status_pred"] = y_pred["stock_status_pred"]
        df_test["priority_pred"] = y_pred["priority_pred"]
        
        # Generate forecasts and alerts for each item
        print("📊 Generating forecasts...")
        forecasts_to_insert = []
        
        for item_id in df_test["item_id"].unique():
            item_data = df_test[df_test["item_id"] == item_id].sort_values("date").iloc[-1]
            future_sales = forecast_sales(item_id, df_test, steps=30)
            alert_text = generate_alerts(item_data, forecast_sales=future_sales)
            
            # Generate forecast data points
            forecast_data = generate_forecast_data(future_sales, item_data["date"])
            
            forecast_doc = {
                "itemId": str(item_id),
                "productName": str(item_data["product_name"]),
                "sku": str(item_data.get("sku", item_id)),
                "currentStock": int(item_data["current_stock"]),
                "stockStatusPred": str(item_data["stock_status_pred"]),
                "priorityPred": str(item_data["priority_pred"]),
                "alert": alert_text,
                "forecastData": forecast_data,
                "createdAt": datetime.now(),
                "updatedAt": datetime.now()
            }
            
            forecasts_to_insert.append(forecast_doc)
        
        # Clear existing forecasts and insert new ones
        print("💾 Saving to MongoDB...")
        forecasts_collection.delete_many({})
        if forecasts_to_insert:
            result = forecasts_collection.insert_many(forecasts_to_insert)
            print(f"✅ Inserted {len(result.inserted_ids)} forecasts")
        
        print(f"🎉 Prediction complete! Generated {len(forecasts_to_insert)} forecasts")
        
        return jsonify({
            "success": True,
            "message": f"Successfully generated {len(forecasts_to_insert)} forecasts",
            "count": len(forecasts_to_insert)
        })
    
    except Exception as e:
        print(f"❌ Error in prediction: {e}")
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route('/api/ml/predict/<item_id>', methods=['POST', 'OPTIONS'])
def predict_single(item_id):
    """Run prediction for a single item"""
    if request.method == 'OPTIONS':
        return '', 204
    
    try:
        # Load test data
        df_test = pd.read_csv(TEST_DATA_PATH)
        
        # Filter for specific item
        item_df = df_test[df_test["item_id"] == item_id]
        
        if item_df.empty:
            return jsonify({
                "success": False,
                "error": "Item not found"
            }), 404
        
        # Preprocess data
        item_df, features = preprocess_data(item_df)
        X_test = item_df[features]
        
        # Predict
        y_pred = predict_stock_status(X_test)
        item_df["stock_status_pred"] = y_pred["stock_status_pred"]
        item_df["priority_pred"] = y_pred["priority_pred"]
        
        # Get latest record
        item_data = item_df.sort_values("date").iloc[-1]
        
        # Forecast
        future_sales = forecast_sales(item_id, df_test, steps=30)
        alert_text = generate_alerts(item_data, forecast_sales=future_sales)
        forecast_data = generate_forecast_data(future_sales, item_data["date"])
        
        forecast_doc = {
            "itemId": str(item_id),
            "productName": str(item_data["product_name"]),
            "sku": str(item_data.get("sku", item_id)),
            "currentStock": int(item_data["current_stock"]),
            "stockStatusPred": str(item_data["stock_status_pred"]),
            "priorityPred": str(item_data["priority_pred"]),
            "alert": alert_text,
            "forecastData": forecast_data,
            "updatedAt": datetime.now()
        }
        
        # Update or insert in MongoDB
        forecasts_collection.update_one(
            {"itemId": str(item_id)},
            {"$set": forecast_doc},
            upsert=True
        )
        
        return jsonify({
            "success": True,
            "forecast": forecast_doc
        })
    
    except Exception as e:
        print(f"❌ Error in single prediction: {e}")
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route('/api/ml/status', methods=['GET'])
def model_status():
    """Get status of loaded models"""
    return jsonify({
        "ml_model_loaded": ml_model is not None,
        "ml_model_type": "XGBoost Native" if use_xgb_native else "Scikit-learn",
        "encoders_loaded": target_encoders is not None,
        "arima_models_loaded": arima_models is not None,
        "arima_models_count": len(arima_models) if arima_models else 0
    })


if __name__ == '__main__':
    print("🚀 Starting ML Prediction API...")
    
    # Load models at startup
    if load_models():
        print("✅ All models loaded successfully")
        print("🌐 API running on http://localhost:5001")
        print("🔗 CORS enabled for http://localhost:5173")
        app.run(debug=True, port=5001, host='0.0.0.0')
    else:
        print("❌ Failed to load models. Please check model paths.")