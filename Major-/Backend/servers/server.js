// server.js - NO AUTHENTICATION VERSION
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://luckyak619_db_user:luckyak619@cluster0.lcmjwhw.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Connection event listeners
mongoose.connection.on('connected', () => {
  console.log('Connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

// User Schema (simplified - no auth fields needed)
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  role: { type: String, enum: ['admin', 'manager', 'staff'], default: 'staff' },
  avatar: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Product Schema
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

// Depot Schema
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

// Alert Schema - FIXED: Added 'out-of-stock' to enum
const alertSchema = new mongoose.Schema({
  type: { 
    type: String, 
    enum: ['low-stock', 'out-of-stock', 'demand-spike', 'capacity-warning', 'anomaly'], 
    required: true 
  },
  title: { type: String, required: true },
  description: { type: String, required: true },
  severity: { type: String, enum: ['low', 'medium', 'high'], required: true },
  isRead: { type: Boolean, default: false },
  isResolved: { type: Boolean, default: false },
  resolvedAt: { type: Date },
  resolvedBy: { type: String },
  resolutionNotes: { type: String },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  depotId: { type: mongoose.Schema.Types.ObjectId, ref: 'Depot' },
  createdAt: { type: Date, default: Date.now }
});

// Models
const User = mongoose.model('User', userSchema);
const Product = mongoose.model('Product', productSchema);
const Depot = mongoose.model('Depot', depotSchema);
const Alert = mongoose.model('Alert', alertSchema);

// Helper function to update product status based on stock
const updateProductStatus = (product) => {
  if (product.stock === 0) {
    product.status = 'out-of-stock';
  } else if (product.stock <= product.reorderPoint) {
    product.status = 'low-stock';
  } else if (product.stock > product.reorderPoint * 3) {
    product.status = 'overstock';
  } else {
    product.status = 'in-stock';
  }
  return product;
};

// Helper function to create alerts for low/out of stock
const createStockAlert = async (product) => {
  if (product.status === 'low-stock' || product.status === 'out-of-stock') {
    // Check if alert already exists for this product
    const existingAlert = await Alert.findOne({
      productId: product._id,
      type: product.status === 'out-of-stock' ? 'out-of-stock' : 'low-stock',
      isResolved: false
    });

    if (!existingAlert) {
      const alert = new Alert({
        type: product.status === 'out-of-stock' ? 'out-of-stock' : 'low-stock',
        title: `${product.status === 'out-of-stock' ? 'Out of Stock' : 'Low Stock'} Alert`,
        description: `${product.name} (${product.sku}) ${product.status === 'out-of-stock' ? 'is out of stock' : `has only ${product.stock} units remaining`}`,
        severity: product.status === 'out-of-stock' ? 'high' : 'medium',
        productId: product._id
      });
      await alert.save();
    }
  }
};

// Product Routes - REMOVED authenticateToken middleware
app.get('/api/products', async (req, res) => {
  try {
    const { search, category, status, page = 1, limit = 50 } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } }
      ];
    }

    if (category && category !== 'all') {
      query.category = category;
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    const products = await Product.find(query)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ updatedAt: -1 });

    const total = await Product.countDocuments(query);

    res.json({
      products: products.map(product => ({
        id: product._id,
        sku: product.sku,
        name: product.name,
        category: product.category,
        stock: product.stock,
        reorderPoint: product.reorderPoint,
        supplier: product.supplier,
        price: product.price,
        status: product.status,
        lastSoldDate: product.lastSoldDate.toISOString().split('T')[0]
      })),
      total,
      pages: Math.ceil(total / limit),
      currentPage: page
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.post('/api/products', async (req, res) => {
  try {
    const productData = req.body;
    let product = new Product(productData);
    
    // Update status based on stock
    product = updateProductStatus(product);
    
    await product.save();

    // Create alert if needed
    await createStockAlert(product);

    res.status(201).json({
      message: 'Product created successfully',
      product: {
        id: product._id,
        sku: product.sku,
        name: product.name,
        category: product.category,
        stock: product.stock,
        reorderPoint: product.reorderPoint,
        supplier: product.supplier,
        price: product.price,
        status: product.status,
        lastSoldDate: product.lastSoldDate.toISOString().split('T')[0]
      }
    });
  } catch (error) {
    console.error('Error creating product:', error);
    if (error.code === 11000) {
      res.status(400).json({ message: 'SKU already exists' });
    } else {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
});

app.put('/api/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    Object.assign(product, req.body);
    product.updatedAt = new Date();
    
    // Update status based on stock
    updateProductStatus(product);
    
    await product.save();

    // Create alert if needed
    await createStockAlert(product);

    res.json({
      message: 'Product updated successfully',
      product: {
        id: product._id,
        sku: product.sku,
        name: product.name,
        category: product.category,
        stock: product.stock,
        reorderPoint: product.reorderPoint,
        supplier: product.supplier,
        price: product.price,
        status: product.status,
        lastSoldDate: product.lastSoldDate.toISOString().split('T')[0]
      }
    });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.delete('/api/products/:id', async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Also delete related alerts
    await Alert.deleteMany({ productId: req.params.id });

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get categories for filter
app.get('/api/products/categories', async (req, res) => {
  try {
    const categories = await Product.distinct('category');
    res.json({ categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Depot Routes
app.get('/api/depots', async (req, res) => {
  try {
    const depots = await Depot.find().sort({ updatedAt: -1 });
    
    res.json({
      depots: depots.map(depot => ({
        id: depot._id,
        name: depot.name,
        location: depot.location,
        capacity: depot.capacity,
        currentUtilization: depot.currentUtilization,
        itemsStored: depot.itemsStored,
        status: depot.status
      }))
    });
  } catch (error) {
    console.error('Error fetching depots:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.post('/api/depots', async (req, res) => {
  try {
    const depot = new Depot(req.body);
    
    // Update status based on utilization
    const utilizationPercentage = (depot.currentUtilization / depot.capacity) * 100;
    if (utilizationPercentage >= 95) {
      depot.status = 'critical';
    } else if (utilizationPercentage >= 85) {
      depot.status = 'warning';
    } else {
      depot.status = 'normal';
    }
    
    await depot.save();

    res.status(201).json({
      message: 'Depot created successfully',
      depot: {
        id: depot._id,
        name: depot.name,
        location: depot.location,
        capacity: depot.capacity,
        currentUtilization: depot.currentUtilization,
        itemsStored: depot.itemsStored,
        status: depot.status
      }
    });
  } catch (error) {
    console.error('Error creating depot:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Alert Routes
app.get('/api/alerts', async (req, res) => {
  try {
    const { unreadOnly = false, page = 1, limit = 20 } = req.query;
    const query = {};
    
    if (unreadOnly === 'true') {
      query.isRead = false;
    }
    
    const alerts = await Alert.find(query)
      .populate('productId', 'name sku')
      .populate('depotId', 'name')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Alert.countDocuments(query);

    res.json({
      alerts: alerts.map(alert => ({
        id: alert._id,
        type: alert.type,
        title: alert.title,
        description: alert.description,
        severity: alert.severity,
        isRead: alert.isRead,
        isResolved: alert.isResolved,
        timestamp: alert.createdAt.toISOString(),
        product: alert.productId,
        depot: alert.depotId
      })),
      total,
      pages: Math.ceil(total / limit),
      currentPage: page
    });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.put('/api/alerts/:id/read', async (req, res) => {
  try {
    const alert = await Alert.findByIdAndUpdate(
      req.params.id,
      { isRead: true },
      { new: true }
    );
    
    if (!alert) {
      return res.status(404).json({ message: 'Alert not found' });
    }

    res.json({ message: 'Alert marked as read' });
  } catch (error) {
    console.error('Error updating alert:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Dashboard Stats
app.get('/api/dashboard/stats', async (req, res) => {
  try {
    const totalProducts = await Product.countDocuments();
    const lowStockCount = await Product.countDocuments({ status: 'low-stock' });
    const outOfStockCount = await Product.countDocuments({ status: 'out-of-stock' });
    const totalDepots = await Depot.countDocuments();
    const unreadAlerts = await Alert.countDocuments({ isRead: false });
    
    // Calculate total inventory value
    const products = await Product.find();
    const totalValue = products.reduce((sum, product) => sum + (product.price * product.stock), 0);
    
    // Calculate average depot utilization
    const depots = await Depot.find();
    const avgUtilization = depots.length > 0 
      ? depots.reduce((sum, depot) => sum + ((depot.currentUtilization / depot.capacity) * 100), 0) / depots.length 
      : 0;

    const kpis = [
      {
        title: 'Total Products',
        value: totalProducts.toString(),
        change: 5.2,
        changeType: 'positive',
        icon: 'Package'
      },
      {
        title: 'Inventory Value',
        value: `$${(totalValue / 1000000).toFixed(1)}M`,
        change: -2.1,
        changeType: 'negative',
        icon: 'DollarSign'
      },
      {
        title: 'Depot Utilization',
        value: `${avgUtilization.toFixed(0)}%`,
        change: 3.8,
        changeType: 'positive',
        icon: 'Warehouse'
      },
      {
        title: 'Active Alerts',
        value: unreadAlerts.toString(),
        change: lowStockCount > 0 ? 12.5 : -8.3,
        changeType: lowStockCount > 0 ? 'negative' : 'positive',
        icon: 'AlertTriangle'
      }
    ];

    res.json({
      kpis,
      stats: {
        totalProducts,
        lowStockCount,
        outOfStockCount,
        totalDepots,
        unreadAlerts,
        totalValue,
        avgUtilization
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get top SKUs by stock level (for charts)
app.get('/api/dashboard/top-skus', async (req, res) => {
  try {
    const products = await Product.find()
      .sort({ stock: -1 })
      .limit(5);

    const topSKUs = products.map(product => ({
      sku: product.sku,
      name: product.name,
      predictedDemand: Math.floor(product.stock * 0.3 + Math.random() * 50), // Mock prediction
      currentStock: product.stock,
      category: product.category
    }));

    res.json({ topSKUs });
  } catch (error) {
    console.error('Error fetching top SKUs:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});