const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = 8001;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());

// MongoDB Connection
const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'test_database';

mongoose.connect(`${MONGO_URL}/${DB_NAME}`)
  .then(() => {
    console.log('✅ Connected to MongoDB');
    initializeDefaultUsers();
  })
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Schemas
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['USER', 'ADMIN'], default: 'USER' },
  createdAt: { type: Date, default: Date.now }
});

const activitySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  email: { type: String },
  status: { type: String, enum: ['success', 'failed'], required: true },
  location: { type: String, default: 'Unknown' },
  timestamp: { type: Date, default: Date.now },
  riskScore: { type: Number, default: 0 },
  reason: { type: String }
});

const User = mongoose.model('User', userSchema);
const Activity = mongoose.model('Activity', activitySchema);

// Initialize default users
async function initializeDefaultUsers() {
  try {
    const userExists = await User.findOne({ email: 'user@test.com' });
    const adminExists = await User.findOne({ email: 'admin@test.com' });

    if (!userExists) {
      const hashedPassword = await bcrypt.hash('password123', 10);
      await User.create({
        email: 'user@test.com',
        password: hashedPassword,
        role: 'USER'
      });
      console.log('✅ Default USER created: user@test.com / password123');
    }

    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await User.create({
        email: 'admin@test.com',
        password: hashedPassword,
        role: 'ADMIN'
      });
      console.log('✅ Default ADMIN created: admin@test.com / admin123');
    }
  } catch (error) {
    console.error('Error initializing users:', error);
  }
}

// Risk Scoring Logic
function calculateRiskScore(email, status, hour) {
  let score = 0;
  
  // Failed login increases risk
  if (status === 'failed') {
    score += 40;
  }
  
  // Unusual hours (midnight to 5 AM)
  if (hour >= 0 && hour < 5) {
    score += 30;
  }
  
  // Random factor for demo
  score += Math.floor(Math.random() * 30);
  
  return Math.min(score, 100);
}

// Middleware to verify JWT
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const verified = jwt.verify(token, JWT_SECRET);
    req.user = verified;
    next();
  } catch (error) {
    res.status(403).json({ error: 'Invalid token' });
  }
}

// Middleware to check ADMIN role
function requireAdmin(req, res, next) {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Access denied. Admin only.' });
  }
  next();
}

// Routes

// Test route
app.get('/api/', (req, res) => {
  res.json({ message: 'Security Monitoring API' });
});

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      email,
      password: hashedPassword,
      role: 'USER'
    });

    res.status(201).json({
      message: 'User registered successfully',
      userId: user._id,
      email: user.email
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await User.findOne({ email });
    
    const hour = new Date().getHours();
    const location = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'Unknown';
    
    if (!user) {
      // Log failed attempt
      const riskScore = calculateRiskScore(email, 'failed', hour);
      await Activity.create({
        email,
        status: 'failed',
        location,
        riskScore,
        reason: 'User not found'
      });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    
    if (!validPassword) {
      // Log failed attempt
      const riskScore = calculateRiskScore(email, 'failed', hour);
      await Activity.create({
        userId: user._id,
        email,
        status: 'failed',
        location,
        riskScore,
        reason: 'Invalid password'
      });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Successful login
    const riskScore = calculateRiskScore(email, 'success', hour);
    await Activity.create({
      userId: user._id,
      email,
      status: 'success',
      location,
      riskScore,
      reason: 'Successful login'
    });

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get all activities (Admin only)
app.get('/api/activity', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const activities = await Activity.find()
      .sort({ timestamp: -1 })
      .limit(100)
      .select('-__v');
    
    res.json(activities);
  } catch (error) {
    console.error('Get activities error:', error);
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
});

// Get activity stats (Admin only)
app.get('/api/activity/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const totalLogins = await Activity.countDocuments({ status: 'success' });
    const failedAttempts = await Activity.countDocuments({ status: 'failed' });
    const highRiskLogins = await Activity.countDocuments({ riskScore: { $gte: 60 } });
    
    // Get activity by day (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const dailyActivity = await Activity.aggregate([
      { $match: { timestamp: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
          success: {
            $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] }
          },
          failed: {
            $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    // Risk distribution
    const riskDistribution = [
      { name: 'Low (0-30)', value: await Activity.countDocuments({ riskScore: { $lte: 30 } }) },
      { name: 'Medium (31-60)', value: await Activity.countDocuments({ riskScore: { $gt: 30, $lte: 60 } }) },
      { name: 'High (61-100)', value: await Activity.countDocuments({ riskScore: { $gt: 60 } }) }
    ];
    
    res.json({
      totalLogins,
      failedAttempts,
      highRiskLogins,
      dailyActivity,
      riskDistribution
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Get all users (Admin only)
app.get('/api/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = await User.find().select('-password -__v');
    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Update user role (Admin only)
app.put('/api/users/:id/role', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['USER', 'ADMIN'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const user = await User.findByIdAndUpdate(
      id,
      { role },
      { new: true }
    ).select('-password -__v');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'Role updated successfully',
      user
    });
  } catch (error) {
    console.error('Update role error:', error);
    res.status(500).json({ error: 'Failed to update role' });
  }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
