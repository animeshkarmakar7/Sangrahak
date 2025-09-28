// seedData.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/inventroops', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Schemas (same as in server.js)
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'manager', 'staff'], default: 'staff' },
  avatar: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const productSchema = new mongoose.Schema({
  sku: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  category: { type: String, required: true },
  stock: { type: Number, required: true, default: 0 },
  reorderPoint: { type: Number, required: true, default: 10 },
  supplier: { type: String, required: true },
  price: { type: Number, required: true },
  status: { 
    type: String, 
    enum: ['in-stock', 'low-stock', 'out-of-stock', 'overstock'], 
    default: 'in-stock' 
  },
  lastSoldDate: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const depotSchema = new mongoose.Schema({
  name: { type: String, required: true },
  location: { type: String, required: true },
  capacity: { type: Number, required: true },
  currentUtilization: { type: Number, default: 0 },
  itemsStored: { type: Number, default: 0 },
  status: { 
    type: String, 
    enum: ['normal', 'warning', 'critical'], 
    default: 'normal' 
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const alertSchema = new mongoose.Schema({
  type: { 
    type: String, 
    enum: ['low-stock','out-of-stock' , 'demand-spike', 'capacity-warning', 'anomaly'], 
    required: true 
  },
  title: { type: String, required: true },
  description: { type: String, required: true },
  severity: { type: String, enum: ['low', 'medium', 'high'], required: true },
  isRead: { type: Boolean, default: false },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  depotId: { type: mongoose.Schema.Types.ObjectId, ref: 'Depot' },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Product = mongoose.model('Product', productSchema);
const Depot = mongoose.model('Depot', depotSchema);
const Alert = mongoose.model('Alert', alertSchema);

const seedData = async () => {
  try {
    // Clear existing data
    await User.deleteMany({});
    await Product.deleteMany({});
    await Depot.deleteMany({});
    await Alert.deleteMany({});

    console.log('Cleared existing data');

    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const adminUser = new User({
      name: 'Sarah Chen',
      email: 'admin@inventroops.com',
      password: hashedPassword,
      role: 'admin'
    });
    await adminUser.save();

    // Create sample products
    const products = [
      {
        sku: 'ELC-001',
        name: 'iPhone 15 Pro Max',
        category: 'Electronics',
        stock: 45,
        reorderPoint: 20,
        supplier: 'Apple Inc.',
        price: 1199,
        status: 'in-stock'
      },
      {
        sku: 'APL-002',
        name: 'Nike Air Max 270',
        category: 'Apparel',
        stock: 8,
        reorderPoint: 15,
        supplier: 'Nike',
        price: 150,
        status: 'low-stock'
      },
      {
        sku: 'HME-003',
        name: 'Dyson V15 Detect',
        category: 'Home Goods',
        stock: 0,
        reorderPoint: 10,
        supplier: 'Dyson',
        price: 749,
        status: 'out-of-stock'
      },
      {
        sku: 'ELC-004',
        name: 'MacBook Pro 16"',
        category: 'Electronics',
        stock: 25,
        reorderPoint: 12,
        supplier: 'Apple Inc.',
        price: 2499,
        status: 'in-stock'
      },
      {
        sku: 'APL-005',
        name: 'Levi\'s 501 Jeans',
        category: 'Apparel',
        stock: 120,
        reorderPoint: 30,
        supplier: 'Levi Strauss',
        price: 89,
        status: 'overstock'
      },
      {
        sku: 'HME-006',
        name: 'KitchenAid Stand Mixer',
        category: 'Home Goods',
        stock: 18,
        reorderPoint: 8,
        supplier: 'Whirlpool',
        price: 379,
        status: 'in-stock'
      },
      {
        sku: 'ELC-007',
        name: 'Samsung 65" QLED TV',
        category: 'Electronics',
        stock: 12,
        reorderPoint: 5,
        supplier: 'Samsung',
        price: 1299,
        status: 'in-stock'
      },
      {
        sku: 'APL-008',
        name: 'Adidas Ultraboost 22',
        category: 'Apparel',
        stock: 3,
        reorderPoint: 20,
        supplier: 'Adidas',
        price: 180,
        status: 'low-stock'
      }
    ];

    const savedProducts = await Product.insertMany(products);
    console.log('Created sample products');

    // Create sample depots
    const depots = [
      {
        name: 'Main Warehouse',
        location: 'New York, NY',
        capacity: 10000,
        currentUtilization: 7500,
        itemsStored: 1250,
        status: 'normal'
      },
      {
        name: 'West Coast Hub',
        location: 'Los Angeles, CA',
        capacity: 8000,
        currentUtilization: 7200,
        itemsStored: 980,
        status: 'warning'
      },
      {
        name: 'Chicago Distribution',
        location: 'Chicago, IL',
        capacity: 6000,
        currentUtilization: 2400,
        itemsStored: 720,
        status: 'normal'
      },
      {
        name: 'Southeast Facility',
        location: 'Atlanta, GA',
        capacity: 5000,
        currentUtilization: 4750,
        itemsStored: 890,
        status: 'critical'
      }
    ];

    const savedDepots = await Depot.insertMany(depots);
    console.log('Created sample depots');

    // Create sample alerts
    const alerts = [
      {
        type: 'low-stock',
        title: 'Low Stock Alert',
        description: 'Nike Air Max 270 (APL-002) has only 8 units remaining',
        severity: 'high',
        isRead: false,
        productId: savedProducts[1]._id
      },
      {
        type: 'out-of-stock',
        title: 'Out of Stock Alert',
        description: 'Dyson V15 Detect (HME-003) is completely out of stock',
        severity: 'high',
        isRead: false,
        productId: savedProducts[2]._id
      },
      {
        type: 'capacity-warning',
        title: 'Depot Near Capacity',
        description: 'Southeast Facility is at 95% capacity utilization',
        severity: 'high',
        isRead: true,
        depotId: savedDepots[3]._id
      },
      {
        type: 'low-stock',
        title: 'Low Stock Warning',
        description: 'Adidas Ultraboost 22 (APL-008) has only 3 units remaining',
        severity: 'medium',
        isRead: false,
        productId: savedProducts[7]._id
      }
    ];

    await Alert.insertMany(alerts);
    console.log('Created sample alerts');

    console.log('Database seeded successfully!');
    console.log('Admin user created: admin@inventroops.com / admin123');
    
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedData();