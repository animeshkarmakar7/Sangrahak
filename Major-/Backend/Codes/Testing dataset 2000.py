import pandas as pd
import numpy as np
import random
from faker import Faker

fake = Faker('en_IN')  # Indian names and locations

# ----------------------------
# 1️⃣ Parameters
# ----------------------------
num_items = 2000
num_days = 365

categories = ['Electronics', 'Grocery', 'Apparel', 'Home', 'Beauty']
brands = ['Samsung', 'Sony', 'LG', 'Tata', 'Amul', 'Puma', 'Nike', 'Himalaya', 'Godrej', 'Philips']

# ----------------------------
# 2️⃣ Generate Items
# ----------------------------
items = []
for i in range(1, num_items + 1):
    product_name = fake.word().capitalize() + f" {random.choice(['Pro','Max','Plus','X','Elite'])}"
    brand = random.choice(brands)
    category = random.choice(categories)
    supplier_name = fake.company()
    location = fake.city()
    items.append({
        'item_id': i,
        'product_name': product_name,
        'brand': brand,
        'category': category,
        'supplier_name': supplier_name,
        'location': location
    })

items_df = pd.DataFrame(items)

# ----------------------------
# 3️⃣ Generate Daily Data (features only)
# ----------------------------
all_data = []

for _, item in items_df.iterrows():
    base_stock = random.randint(50, 500)
    daily_sales_mean = random.randint(1, 20)
    reorder_level = random.randint(20, 100)
    lead_time = random.randint(1, 10)
    
    for day in range(1, num_days + 1):
        daily_sales = max(0, int(np.random.normal(daily_sales_mean, daily_sales_mean*0.3)))
        
        # Ensure current_stock stays above 10% of base_stock
        min_stock = int(base_stock * 0.1)
        current_stock = max(min_stock, base_stock - daily_sales*day + random.randint(-5,5))
        
        weekly_sales = daily_sales * 7
        days_to_empty = max(1, int(current_stock / (daily_sales+1)))
        
        all_data.append({
            'item_id': item['item_id'],
            'product_name': item['product_name'],
            'brand': item['brand'],
            'category': item['category'],
            'supplier_name': item['supplier_name'],
            'location': item['location'],
            'current_stock': current_stock,
            'daily_sales': daily_sales,
            'weekly_sales': weekly_sales,
            'reorder_level': reorder_level,
            'lead_time': lead_time,
            'days_to_empty': days_to_empty,
            'date': pd.Timestamp('2024-01-01') + pd.Timedelta(days=day-1)
        })

# ----------------------------
# 4️⃣ Create DataFrame and Save
# ----------------------------
df_test = pd.DataFrame(all_data)
df_test.to_csv(r'D:\Inventory Project\Backend\Dataset\new_test_inventory_input_only.csv', index=False)
print("✅ New test dataset (input features only) saved as 'new_test_inventory_input_only.csv'")
