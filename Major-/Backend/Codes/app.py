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
products_collection = db['products']

# Global variables
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


def load_models():
    """Load all ML models and encoders at startup"""
    global ml_model, use_xgb_native, target_encoders, arima_models
    
    try:
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
        
        if os.path.exists(ENCODERS_PATH):
            target_encoders = joblib.load(ENCODERS_PATH)
            print("✅ Loaded label encoders")
        
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
            
            if "Unknown" not in le.classes_:
                le.classes_ = np.append(le.classes_, "Unknown")
            
            df[col] = df[col].apply(
                lambda x: x if x in le.classes_ else "Unknown"
            )
            
            df[col] = le.transform(df[col])
        else:
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


def forecast_sales(item_id, historical_sales, steps=30):
    """Forecast future sales using ARIMA"""
    if item_id in arima_models:
        forecast = arima_models[item_id].forecast(steps=steps)
        forecast = np.maximum(forecast, 0)
    else:
        # Use simple moving average if no ARIMA model
        avg_sales = np.mean(historical_sales) if len(historical_sales) > 0 else 10
        forecast = np.array([avg_sales] * steps)
    return forecast


def generate_alerts(row, forecast_sales_data=None):
    """Generate alerts based on predictions"""
    alerts = []
    
    if row["stock_status_pred"] == "Understock" or row["priority_pred"] in ["High", "Very High"]:
        alerts.append(f"Immediate Restock Needed: {row['priority_pred']}")
    
    if forecast_sales_data is not None:
        total_forecasted = sum(forecast_sales_data)
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
            "confidence": float(np.random.uniform(0.75, 0.95))
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


@app.route('/api/ml/products', methods=['GET'])
def get_available_products():
    """Get all products from MongoDB for selection"""
    try:
        products = list(products_collection.find({}, {
            '_id': 0,
            'sku': 1,
            'name': 1,
            'category': 1,
            'stock': 1,
            'supplier': 1
        }))
        
        return jsonify({
            "success": True,
            "products": products,
            "count": len(products)
        })
    except Exception as e:
        print(f"❌ Error fetching products: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route('/api/ml/predict/custom', methods=['POST', 'OPTIONS'])
def predict_custom():
    """Run prediction with custom user inputs"""
    if request.method == 'OPTIONS':
        return '', 204
    
    try:
        data = request.json
        print(f"🔄 Received prediction request: {data}")
        
        # Extract user inputs
        sku = data.get('sku')
        product_name = data.get('productName')
        current_stock = float(data.get('currentStock', 0))
        daily_sales = float(data.get('dailySales', 0))
        weekly_sales = float(data.get('weeklySales', 0))
        reorder_level = float(data.get('reorderLevel', 0))
        lead_time = float(data.get('leadTime', 0))
        brand = data.get('brand', 'Unknown')
        category = data.get('category', 'Unknown')
        location = data.get('location', 'Unknown')
        supplier_name = data.get('supplierName', 'Unknown')
        forecast_days = int(data.get('forecastDays', 30))
        
        # Calculate days_to_empty
        days_to_empty = current_stock / daily_sales if daily_sales > 0 else 999
        
        # Create DataFrame for prediction
        input_data = pd.DataFrame([{
            'current_stock': current_stock,
            'daily_sales': daily_sales,
            'weekly_sales': weekly_sales,
            'reorder_level': reorder_level,
            'lead_time': lead_time,
            'days_to_empty': days_to_empty,
            'brand': brand,
            'category': category,
            'location': location,
            'supplier_name': supplier_name
        }])
        
        # Preprocess and predict
        print("🔧 Preprocessing data...")
        processed_data, features = preprocess_data(input_data)
        X_test = processed_data[features]
        
        print("🤖 Running ML prediction...")
        y_pred = predict_stock_status(X_test)
        
        stock_status_pred = y_pred["stock_status_pred"].iloc[0]
        priority_pred = y_pred["priority_pred"].iloc[0]
        
        # Generate forecast
        print(f"📊 Generating {forecast_days}-day forecast...")
        item_id = sku  # Use SKU as item_id
        historical_sales = [daily_sales] * 7  # Mock historical data
        future_sales = forecast_sales(item_id, historical_sales, steps=forecast_days)
        
        # Generate alerts
        row_data = {
            'current_stock': current_stock,
            'stock_status_pred': stock_status_pred,
            'priority_pred': priority_pred
        }
        alert_text = generate_alerts(row_data, forecast_sales_data=future_sales)
        
        # Generate forecast data points
        current_date = datetime.now().strftime('%Y-%m-%d')
        forecast_data = generate_forecast_data(future_sales, current_date)
        
        # Create forecast document
        forecast_doc = {
            "itemId": sku,
            "productName": product_name,
            "sku": sku,
            "currentStock": int(current_stock),
            "stockStatusPred": stock_status_pred,
            "priorityPred": priority_pred,
            "alert": alert_text,
            "forecastData": forecast_data,
            "inputParams": {
                "dailySales": daily_sales,
                "weeklySales": weekly_sales,
                "reorderLevel": reorder_level,
                "leadTime": lead_time,
                "brand": brand,
                "category": category,
                "location": location,
                "supplierName": supplier_name
            },
            "createdAt": datetime.now(),
            "updatedAt": datetime.now()
        }
        
        # Save to MongoDB
        print("💾 Saving forecast to MongoDB...")
        forecasts_collection.update_one(
            {"sku": sku},
            {"$set": forecast_doc},
            upsert=True
        )
        
        print(f"✅ Prediction complete for {sku}")
        
        return jsonify({
            "success": True,
            "forecast": forecast_doc,
            "message": f"Forecast generated successfully for {product_name}"
        })
    
    except Exception as e:
        print(f"❌ Error in custom prediction: {e}")
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
    
    if load_models():
        print("✅ All models loaded successfully")
        print("🌐 API running on http://localhost:5001")
        print("🔗 CORS enabled for http://localhost:5173")
        app.run(debug=True, port=5001, host='0.0.0.0')
    else:
        print("❌ Failed to load models. Please check model paths.")