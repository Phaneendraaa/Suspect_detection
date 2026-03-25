const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const UAParser = require('ua-parser-js');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

const PORT = 8001;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const ADMIN_EMAIL = 'nagaphaneendrapuranam@gmail.com';

// Middleware
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());

// MongoDB Connection
const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'security_monitoring_db';

mongoose.connect(`${MONGO_URL}/${DB_NAME}`)
  .then(() => {
    console.log('✅ Connected to MongoDB');
    initializeDefaultUsers();
  })
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Email Configuration
const emailTransporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Test email configuration
if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
  emailTransporter.verify((error, success) => {
    if (error) {
      console.log('❌ Email service error:', error);
    } else {
      console.log('✅ Email service ready');
    }
  });
}

// In-memory rate limiting storage
const loginAttempts = new Map();
const deviceHistory = new Map();
const userLoginTimes = new Map();

// Schemas
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['USER', 'ADMIN'], default: 'USER' },
  createdAt: { type: Date, default: Date.now },
  lastLoginTime: { type: Date },
  typicalLoginHour: { type: Number }
});

const activitySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  email: { type: String },
  status: { type: String, enum: ['success', 'failed'], required: true },
  location: { type: String, default: 'Unknown' },
  timestamp: { type: Date, default: Date.now },
  riskScore: { type: Number, default: 0 },
  reason: { type: String },
  deviceInfo: {
    browser: String,
    os: String,
    device: String,
    fingerprint: String
  },
  alertTriggered: { type: Boolean, default: false },
  ipAddress: { type: String }
});

const User = mongoose.model('User', userSchema);
const Activity = mongoose.model('Activity', activitySchema);

// Initialize default users
async function initializeDefaultUsers() {
  try {
    const adminExists = await User.findOne({ email: ADMIN_EMAIL });
    
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await User.create({
        email: ADMIN_EMAIL,
        password: hashedPassword,
        role: 'ADMIN'
      });
      console.log(`✅ Default ADMIN created: ${ADMIN_EMAIL}`);
    }

    const userExists = await User.findOne({ email: 'user@test.com' });
    if (!userExists) {
      const hashedPassword = await bcrypt.hash('password123', 10);
      await User.create({
        email: 'user@test.com',
        password: hashedPassword,
        role: 'USER'
      });
      console.log('✅ Default USER created: user@test.com / password123');
    }
  } catch (error) {
    console.error('Error initializing users:', error);
  }
}

// Advanced Detection Engine
function analyzeFrequency(email) {
  const now = Date.now();
  const fiveMinutes = 5 * 60 * 1000;
  
  if (!loginAttempts.has(email)) {
    loginAttempts.set(email, []);
  }
  
  const attempts = loginAttempts.get(email);
  // Clean old attempts
  const recentAttempts = attempts.filter(time => now - time < fiveMinutes);
  loginAttempts.set(email, recentAttempts);
  
  // Add current attempt
  recentAttempts.push(now);
  
  // Score based on frequency
  if (recentAttempts.length >= 5) return 30;
  if (recentAttempts.length >= 3) return 20;
  return 0;
}

function analyzeTimePattern(email, userId) {
  const hour = new Date().getHours();
  
  // Check if we have historical data
  if (!userLoginTimes.has(userId)) {
    userLoginTimes.set(userId, []);
  }
  
  const times = userLoginTimes.get(userId);
  
  // Unusual hours (midnight to 5 AM)
  let score = 0;
  if (hour >= 0 && hour < 5) {
    score += 20;
  }
  
  // If user has history, check deviation
  if (times.length > 3) {
    const avgHour = times.reduce((a, b) => a + b, 0) / times.length;
    const deviation = Math.abs(hour - avgHour);
    if (deviation > 6) {
      score += 15;
    }
  }
  
  // Update history
  times.push(hour);
  if (times.length > 10) times.shift(); // Keep last 10
  
  return score;
}

function analyzeDevice(userId, deviceFingerprint) {
  if (!deviceHistory.has(userId)) {
    deviceHistory.set(userId, new Set());
  }
  
  const devices = deviceHistory.get(userId);
  const isNewDevice = !devices.has(deviceFingerprint);
  
  if (isNewDevice) {
    devices.add(deviceFingerprint);
    return 20; // New device increases risk
  }
  
  return 0;
}

function analyzeFailurePattern(email) {
  if (!loginAttempts.has(email)) return 0;
  
  const attempts = loginAttempts.get(email);
  // If there were recent failed attempts (spike pattern)
  if (attempts.length >= 3) {
    return 30; // High risk if success after multiple failures
  }
  
  return 0;
}

function calculateAdvancedRiskScore(email, userId, status, deviceFingerprint, hadRecentFailures) {
  let score = 0;
  
  // Failed attempt
  if (status === 'failed') {
    score += 30;
  }
  
  // Frequency analysis
  score += analyzeFrequency(email);
  
  // Time pattern analysis
  if (userId) {
    score += analyzeTimePattern(email, userId);
  }
  
  // Device change detection
  if (userId && deviceFingerprint) {
    score += analyzeDevice(userId, deviceFingerprint);
  }
  
  // Failure pattern (brute force detection)
  if (status === 'success' && hadRecentFailures) {
    score += analyzeFailurePattern(email);
  }
  
  return Math.min(score, 100);
}

// Send Email Alert
async function sendSecurityAlert(userEmail, ipAddress, riskScore, reason, timestamp) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.log('⚠️ Email not configured, skipping alert');
    return false;
  }

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: ADMIN_EMAIL,
    subject: `🚨 Security Alert: High Risk Login Detected (Score: ${riskScore})`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #ef4444; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">⚠️ Security Alert</h1>
          <p style="margin: 5px 0 0 0;">High Risk Activity Detected</p>
        </div>
        <div style="padding: 20px; border: 1px solid #e5e7eb;">
          <h2 style="color: #1f2937; margin-top: 0;">Alert Details</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 10px 0; font-weight: bold; width: 40%;">User Email:</td>
              <td style="padding: 10px 0;">${userEmail}</td>
            </tr>
            <tr style="background-color: #f9fafb;">
              <td style="padding: 10px 0; font-weight: bold;">IP Address:</td>
              <td style="padding: 10px 0;"><code>${ipAddress}</code></td>
            </tr>
            <tr>
              <td style="padding: 10px 0; font-weight: bold;">Timestamp:</td>
              <td style="padding: 10px 0;">${timestamp.toLocaleString()}</td>
            </tr>
            <tr style="background-color: #f9fafb;">
              <td style="padding: 10px 0; font-weight: bold;">Risk Score:</td>
              <td style="padding: 10px 0;">
                <span style="background-color: #ef4444; color: white; padding: 5px 10px; border-radius: 3px; font-weight: bold;">
                  ${riskScore}/100
                </span>
              </td>
            </tr>
            <tr>
              <td style="padding: 10px 0; font-weight: bold;">Reason:</td>
              <td style="padding: 10px 0;">${reason}</td>
            </tr>
          </table>
          <div style="margin-top: 20px; padding: 15px; background-color: #fef2f2; border-left: 4px solid #ef4444;">
            <p style="margin: 0; color: #991b1b;"><strong>Action Required:</strong> Please review this activity immediately in your security dashboard.</p>
          </div>
        </div>
        <div style="padding: 15px; text-align: center; color: #6b7280; font-size: 12px; border-top: 1px solid #e5e7eb;">
          <p>This is an automated security alert from Smart Security Monitoring System.</p>
          <p>Do not reply to this email.</p>
        </div>
      </div>
    `
  };

  try {
    await emailTransporter.sendMail(mailOptions);
    console.log(`✅ Security alert email sent to ${ADMIN_EMAIL}`);
    return true;
  } catch (error) {
    console.error('❌ Failed to send email alert:', error);
    return false;
  }
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

// Socket.IO connection
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Routes

app.get('/api/', (req, res) => {
  res.json({ message: 'Security Monitoring API v2.0' });
});

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Sanitize email
    const sanitizedEmail = email.toLowerCase().trim();

    const existingUser = await User.findOne({ email: sanitizedEmail });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Check if email is the hardcoded admin
    const role = sanitizedEmail === ADMIN_EMAIL ? 'ADMIN' : 'USER';
    
    const user = await User.create({
      email: sanitizedEmail,
      password: hashedPassword,
      role
    });

    res.status(201).json({
      message: 'User registered successfully',
      userId: user._id,
      email: user.email,
      role: user.role
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

    // Sanitize email
    const sanitizedEmail = email.toLowerCase().trim();

    // Parse User-Agent
    const userAgent = req.headers['user-agent'] || '';
    const parser = new UAParser(userAgent);
    const deviceInfo = {
      browser: parser.getBrowser().name || 'Unknown',
      os: parser.getOS().name || 'Unknown',
      device: parser.getDevice().type || 'Desktop',
      fingerprint: `${parser.getBrowser().name}-${parser.getOS().name}-${parser.getDevice().type || 'Desktop'}`
    };

    const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'Unknown';
    const timestamp = new Date();
    
    const user = await User.findOne({ email: sanitizedEmail });
    
    // Check for recent failed attempts
    const hadRecentFailures = loginAttempts.has(sanitizedEmail) && loginAttempts.get(sanitizedEmail).length >= 2;
    
    if (!user) {
      const riskScore = calculateAdvancedRiskScore(sanitizedEmail, null, 'failed', null, false);
      
      await Activity.create({
        email: sanitizedEmail,
        status: 'failed',
        location: ipAddress,
        riskScore,
        reason: 'User not found',
        deviceInfo,
        ipAddress,
        alertTriggered: riskScore >= 70
      });
      
      if (riskScore >= 70) {
        sendSecurityAlert(sanitizedEmail, ipAddress, riskScore, 'Failed login attempt - User not found', timestamp);
        io.emit('security-alert', {
          email: sanitizedEmail,
          riskScore,
          reason: 'Failed login - User not found',
          timestamp
        });
      }
      
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    
    if (!validPassword) {
      const riskScore = calculateAdvancedRiskScore(sanitizedEmail, user._id.toString(), 'failed', deviceInfo.fingerprint, false);
      
      await Activity.create({
        userId: user._id,
        email: sanitizedEmail,
        status: 'failed',
        location: ipAddress,
        riskScore,
        reason: 'Invalid password',
        deviceInfo,
        ipAddress,
        alertTriggered: riskScore >= 70
      });
      
      if (riskScore >= 70) {
        sendSecurityAlert(sanitizedEmail, ipAddress, riskScore, 'Multiple failed login attempts detected', timestamp);
        io.emit('security-alert', {
          email: sanitizedEmail,
          riskScore,
          reason: 'Multiple failed password attempts',
          timestamp
        });
      }
      
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Successful login
    const riskScore = calculateAdvancedRiskScore(sanitizedEmail, user._id.toString(), 'success', deviceInfo.fingerprint, hadRecentFailures);
    
    const alertTriggered = riskScore >= 70;
    
    await Activity.create({
      userId: user._id,
      email: sanitizedEmail,
      status: 'success',
      location: ipAddress,
      riskScore,
      reason: riskScore >= 70 ? 'High risk factors detected' : 'Successful login',
      deviceInfo,
      ipAddress,
      alertTriggered
    });

    // Send alert if high risk
    if (alertTriggered) {
      const reasons = [];
      if (hadRecentFailures) reasons.push('Previous failed attempts');
      if (riskScore >= 70) reasons.push('Unusual activity pattern');
      
      const alertReason = reasons.join(', ') || 'High risk score detected';
      
      sendSecurityAlert(sanitizedEmail, ipAddress, riskScore, alertReason, timestamp);
      
      io.emit('security-alert', {
        email: sanitizedEmail,
        riskScore,
        reason: alertReason,
        timestamp,
        status: 'success'
      });
    }

    // Clear failed attempts on successful login
    if (loginAttempts.has(sanitizedEmail)) {
      loginAttempts.delete(sanitizedEmail);
    }

    // Update user's last login time
    await User.findByIdAndUpdate(user._id, {
      lastLoginTime: timestamp,
      typicalLoginHour: new Date().getHours()
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
      },
      riskScore,
      alertTriggered
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
      .limit(200)
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
    const highRiskLogins = await Activity.countDocuments({ riskScore: { $gte: 70 } });
    const alertsTriggered = await Activity.countDocuments({ alertTriggered: true });
    const suspiciousActivityCount = await Activity.countDocuments({ riskScore: { $gte: 60 } });
    
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
          },
          highRisk: {
            $sum: { $cond: [{ $gte: ['$riskScore', 70] }, 1, 0] }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    // Risk distribution
    const riskDistribution = [
      { name: 'Low (0-30)', value: await Activity.countDocuments({ riskScore: { $lte: 30 } }), fill: '#10B981' },
      { name: 'Medium (31-60)', value: await Activity.countDocuments({ riskScore: { $gt: 30, $lte: 60 } }), fill: '#F59E0B' },
      { name: 'High (61-100)', value: await Activity.countDocuments({ riskScore: { $gt: 60 } }), fill: '#EF4444' }
    ];
    
    // Recent high-risk activities
    const recentHighRisk = await Activity.find({ riskScore: { $gte: 70 } })
      .sort({ timestamp: -1 })
      .limit(10)
      .select('email timestamp riskScore reason');
    
    res.json({
      totalLogins,
      failedAttempts,
      highRiskLogins,
      alertsTriggered,
      suspiciousActivityCount,
      dailyActivity,
      riskDistribution,
      recentHighRisk
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

// Start server with Socket.IO
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📧 Admin email: ${ADMIN_EMAIL}`);
});

// Export io for use in other modules if needed
module.exports = { io };
