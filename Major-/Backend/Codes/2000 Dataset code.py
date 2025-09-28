import pandas as pd
import numpy as np
from faker import Faker
from datetime import datetime, timedelta
import random

# Indian locale
fake = Faker('en_IN')

# Parameters
num_items = 2000
num_days = 365
start_date = datetime(2025, 1, 1)

# Categories and Indian brands
categories = ['Electronics', 'Grocery', 'Clothing', 'Furniture', 'Toys']
brand_dict = {
    'Electronics': ['Samsung', 'Mi', 'OnePlus', 'LG', 'Sony'],
    'Clothing': ['Peter England', "Levi's", 'Allen Solly', 'Raymond'],
    'Grocery': ['Amul', 'Britannia', 'Haldiram', 'Dabur'],
    'Furniture': ['Godrej', 'Urban Ladder', 'Nilkamal'],
    'Toys': ['Funskool', 'Fisher-Price', 'Chicco']
}

# Generate static item info
item_ids = range(1, num_items + 1)
item_categories = np.random.choice(categories, num_items)
product_names = [f"{fake.color_name()} {fake.word().capitalize()}" for _ in item_ids]
brands = [random.choice(brand_dict[cat]) for cat in item_categories]
locations = [fake.city() for _ in item_ids]
supplier_names = [fake.name() for _ in item_ids]
supplier_id = [fake.random_int(1000, 2000) for _ in item_ids]
reorder_level = np.random.randint(20, 100, num_items)
lead_time = np.random.randint(3, 15, num_items)

# Desired stock status distribution
stock_status_probs = {'Understock': 0.3, 'Perfect': 0.4, 'Overstock': 0.3}

# Helper to assign initial stock based on stock status
def generate_initial_stock(status, reorder):
    if status == 'Understock':
        return np.random.randint(0, reorder)
    elif status == 'Perfect':
        return np.random.randint(reorder, reorder*2)
    else:  # Overstock
        return np.random.randint(reorder*2+1, reorder*4)

# Pre-calculate total rows
total_rows = num_items * num_days
understock_rows = int(total_rows * stock_status_probs['Understock'])
perfect_rows = int(total_rows * stock_status_probs['Perfect'])
overstock_rows = total_rows - understock_rows - perfect_rows  # ensure sum = total_rows

# Create stock status list for perfect balance
stock_status_list = (['Understock'] * understock_rows +
                     ['Perfect'] * perfect_rows +
                     ['Overstock'] * overstock_rows)
random.shuffle(stock_status_list)  # shuffle to distribute across items and days

# Initialize rows
all_rows = []
idx = 0

for i in range(num_items):
    stock = generate_initial_stock(random.choice(['Understock','Perfect','Overstock']), reorder_level[i])
    
    for day in range(num_days):
        current_date = start_date + timedelta(days=day)
        daily_sale = max(0, int(np.random.normal(15, 10)))
        weekly_sale = daily_sale * 7
        stock -= daily_sale
        stock = max(stock, 0)
        
        # Assign perfectly balanced stock status
        stock_status = stock_status_list[idx]
        idx += 1
        
        # Assign priority based on stock status
        if stock_status == 'Understock':
            priority = random.choice(['High','Very High'])
        elif stock_status == 'Perfect':
            priority = random.choice(['Medium','High'])
        else:  # Overstock
            priority = random.choice(['Low','Medium'])
        
        days_to_empty = stock / max(daily_sale,1)
        last_restock_date = current_date - timedelta(days=random.randint(1,30))
        
        # Smart alert
        alert = f"Restock Needed: {priority}" if stock < reorder_level[i] or priority in ['High','Very High'] else 'OK'
        
        all_rows.append({
            'item_id': item_ids[i],
            'product_name': product_names[i],
            'brand': brands[i],
            'category': item_categories[i],
            'location': locations[i],
            'supplier_id': supplier_id[i],
            'supplier_name': supplier_names[i],
            'current_stock': stock,
            'daily_sales': daily_sale,
            'weekly_sales': weekly_sale,
            'reorder_level': reorder_level[i],
            'stock_status': stock_status,
            'priority': priority,
            'date': current_date,
            'last_restock_date': last_restock_date,
            'lead_time': lead_time[i],
            'days_to_empty': days_to_empty,
            'alert': alert
        })

# Create DataFrame
df = pd.DataFrame(all_rows)

# Save CSV
df.to_csv(r"D:\Inventory Project\Backend\Dataset\balanced_indian_inventory_2000.csv", index=False)
print("Perfectly balanced, India-realistic 2,000 × 365 dataset generated successfully!")






