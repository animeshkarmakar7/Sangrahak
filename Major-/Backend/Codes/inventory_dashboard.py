import streamlit as st
import pandas as pd
import numpy as np
import joblib
import plotly.express as px

# ----------------------------
# 1️⃣ Load datasets and models
# ----------------------------
df_test = pd.read_csv(r"D:\Inventory Project\Backend\Dataset\new_test_inventory_input_only.csv")
alerts_df = pd.read_csv(r"D:\Inventory Project\Backend\Combined csv alert\test_inventory_alerts.csv")
arima_models = joblib.load(r"D:\Inventory Project\Backend\Models\arima_models_dict.pkl")

# ----------------------------
# 2️⃣ Sidebar Filters
# ----------------------------
st.sidebar.title("Filters")
filter_option = st.sidebar.radio("Filter by:", ["Product", "Category", "Location"])

if filter_option == "Product":
    options = alerts_df['product_name'].unique()
    selected = st.sidebar.selectbox("Select Product", options)
    filtered_alerts = alerts_df[alerts_df['product_name'] == selected]
elif filter_option == "Category":
    options = df_test['category'].unique()
    selected = st.sidebar.selectbox("Select Category", options)
    filtered_alerts = alerts_df[alerts_df['product_name'].isin(df_test[df_test['category']==selected]['product_name'].unique())]
else:
    options = df_test['location'].unique()
    selected = st.sidebar.selectbox("Select Location", options)
    filtered_alerts = alerts_df[alerts_df['product_name'].isin(df_test[df_test['location']==selected]['product_name'].unique())]

st.title("📊 Inventory Forecasting Dashboard")

# ----------------------------
# 3️⃣ Show Alerts Table
# ----------------------------
st.subheader("Alerts Summary")
st.dataframe(filtered_alerts[['product_name','current_stock','stock_status_pred','priority_pred','alert']].reset_index(drop=True))

# ----------------------------
# 4️⃣ Forecast & Historical Charts for Selected Product
# ----------------------------
st.subheader("Product Forecast & Stock Details")
if filter_option == "Product":
    product_alert = filtered_alerts.iloc[0]
    item_id = product_alert['item_id']

    # Forecast using ARIMA
    if item_id in arima_models:
        forecast = arima_models[item_id].forecast(steps=30)
    else:
        product_data = df_test[df_test['item_id'] == item_id]
        forecast = np.array([np.mean(product_data['daily_sales'])]*30)

    forecast_dates = pd.date_range(start=pd.Timestamp(df_test['date'].max()) + pd.Timedelta(days=1), periods=30)
    forecast_df = pd.DataFrame({'date': forecast_dates, 'forecasted_sales': forecast})

    fig_forecast = px.line(forecast_df, x='date', y='forecasted_sales', title=f'Forecasted Daily Sales for {selected}')
    st.plotly_chart(fig_forecast)

    # Historical daily sales
    historical_data = df_test[df_test['item_id'] == item_id].sort_values('date')
    fig_history = px.line(historical_data, x='date', y='daily_sales', title=f'Historical Daily Sales for {selected}')
    st.plotly_chart(fig_history)

    # Display stock & alerts
    st.write(f"**Current Stock:** {product_alert['current_stock']}")
    st.write(f"**Predicted Stock Status:** {product_alert['stock_status_pred']}")
    st.write(f"**Predicted Priority:** {product_alert['priority_pred']}")
    st.write(f"**Alert:** {product_alert['alert']}")

# ----------------------------
# 5️⃣ Optional: Summary Charts
# ----------------------------
st.subheader("Summary Charts for Filtered Products")

# Stock Status distribution
stock_status_counts = filtered_alerts['stock_status_pred'].value_counts().reset_index()
stock_status_counts.columns = ['Stock Status','Count']
fig_stock_status = px.bar(stock_status_counts, x='Stock Status', y='Count', title='Stock Status Distribution')
st.plotly_chart(fig_stock_status)

# Priority distribution
priority_counts = filtered_alerts['priority_pred'].value_counts().reset_index()
priority_counts.columns = ['Priority','Count']
fig_priority = px.bar(priority_counts, x='Priority', y='Count', title='Priority Distribution')
st.plotly_chart(fig_priority)
