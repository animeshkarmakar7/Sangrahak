const express = require('express');
const Alert = require('../models/Alert');
const Product = require('../models/Product');
const Depot = require('../models/Depot');

const router = express.Router();

// Get all alerts with filtering and pagination
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      type,
      severity,
      isRead,
      isResolved,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = {};

    // Apply filters
    if (type) {
      query.type = type;
    }
    
    if (severity) {
      query.severity = severity;
    }
    
    if (isRead !== undefined) {
      query.isRead = isRead === 'true';
    }
    
    if (isResolved !== undefined) {
      query.isResolved = isResolved === 'true';
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortDirection = sortOrder === 'desc' ? -1 : 1;

    const alerts = await Alert.find(query)
      .populate('relatedEntity.entityId')
      .sort({ [sortBy]: sortDirection })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Alert.countDocuments(query);

    res.json({
      alerts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get alert by ID
router.get('/:id', async (req, res) => {
  try {
    const alert = await Alert.findById(req.params.id)
      .populate('relatedEntity.entityId');
    
    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }
    
    res.json(alert);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new alert
router.post('/', async (req, res) => {
  try {
    const alert = new Alert(req.body);
    await alert.save();
    res.status(201).json(alert);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Mark alert as read
router.patch('/:id/read', async (req, res) => {
  try {
    const alert = await Alert.findByIdAndUpdate(
      req.params.id,
      { isRead: true },
      { new: true }
    );
    
    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }
    
    res.json(alert);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Mark alert as resolved
router.patch('/:id/resolve', async (req, res) => {
  try {
    const { resolvedBy, resolutionNotes } = req.body;
    
    const alert = await Alert.findByIdAndUpdate(
      req.params.id,
      { 
        isResolved: true, 
        resolvedAt: new Date(),
        resolvedBy,
        resolutionNotes
      },
      { new: true }
    );
    
    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }
    
    res.json(alert);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete alert
router.delete('/:id', async (req, res) => {
  try {
    const alert = await Alert.findByIdAndDelete(req.params.id);
    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }
    res.json({ message: 'Alert deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get alert statistics
router.get('/stats/overview', async (req, res) => {
  try {
    const stats = await Alert.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          unread: { $sum: { $cond: [{ $eq: ['$isRead', false] }, 1, 0] } },
          unresolved: { $sum: { $cond: [{ $eq: ['$isResolved', false] }, 1, 0] } },
          high: { $sum: { $cond: [{ $eq: ['$severity', 'high'] }, 1, 0] } },
          medium: { $sum: { $cond: [{ $eq: ['$severity', 'medium'] }, 1, 0] } },
          low: { $sum: { $cond: [{ $eq: ['$severity', 'low'] }, 1, 0] } }
        }
      }
    ]);

    const typeStats = await Alert.aggregate([
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          unresolved: { $sum: { $cond: [{ $eq: ['$isResolved', false] }, 1, 0] } }
        }
      }
    ]);

    res.json({
      overview: stats[0] || { total: 0, unread: 0, unresolved: 0, high: 0, medium: 0, low: 0 },
      byType: typeStats
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark multiple alerts as read
router.patch('/bulk/read', async (req, res) => {
  try {
    const { alertIds } = req.body;
    
    const result = await Alert.updateMany(
      { _id: { $in: alertIds } },
      { isRead: true }
    );
    
    res.json({ 
      message: `${result.modifiedCount} alerts marked as read`,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;