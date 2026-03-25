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
const BLOCK_DURATION = 10 * 60 * 1000; // 10 minutes in milliseconds
const MAX_ATTEMPTS_2MIN = 5; // Max attempts allowed in 2 minutes
const TWO_MINUTES = 2 * 60 * 1000; // 2 minutes in milliseconds

// Middleware
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());

// MongoDB Atlas Connection
const MONGO_URL = process.env.MONGO_URL;
const DB_NAME = process.env.DB_NAME || 'security_monitoring_db';

mongoose.connect(MONGO_URL)
  .then(() => {
    console.log('✅ Connected to MongoDB Atlas Cluster');
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

if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
  emailTransporter.verify((error, success) => {
    if (error) {
      console.log('❌ Email service error:', error);
    } else {
      console.log('✅ Email service ready');
    }
  });
}

// In-memory storage for ML and rate limiting
const loginAttempts = new Map();
const deviceHistory = new Map();
const userLoginTimes = new Map();
const userBehaviorProfiles = new Map();

// Schemas
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['USER', 'ADMIN'], default: 'USER' },
  createdAt: { type: Date, default: Date.now },
  lastLoginTime: { type: Date },
  typicalLoginHour: { type: Number },
  isBlocked: { type: Boolean, default: false },
  blockReason: { type: String },
  blockedUntil: { type: Date }
});

const activitySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  email: { type: String },
  status: { type: String, enum: ['success', 'failed', 'blocked'], required: true },
  location: { type: String, default: 'Unknown' },
  timestamp: { type: Date, default: Date.now },
  riskScore: { type: Number, default: 0 },
  mlAnomalyScore: { type: Number, default: 0 },
  reason: { type: String },
  deviceInfo: {
    browser: String,
    os: String,
    device: String,
    fingerprint: String
  },
  alertTriggered: { type: Boolean, default: false },
  ipAddress: { type: String },
  wasBlocked: { type: Boolean, default: false }
});

const blockedIPSchema = new mongoose.Schema({
  ipAddress: { type: String, required: true, unique: true },
  reason: { type: String },
  blockedAt: { type: Date, default: Date.now },
  blockedUntil: { type: Date, required: true },
  attempts: { type: Number, default: 1 }
});

const blockedDeviceSchema = new mongoose.Schema({
  deviceFingerprint: { type: String, required: true, unique: true },
  reason: { type: String },
  blockedAt: { type: Date, default: Date.now },
  blockedUntil: { type: Date, required: true },
  attempts: { type: Number, default: 1 }
});

const User = mongoose.model('User', userSchema);
const Activity = mongoose.model('Activity', activitySchema);
const BlockedIP = mongoose.model('BlockedIP', blockedIPSchema);
const BlockedDevice = mongoose.model('BlockedDevice', blockedDeviceSchema);

// ML-Based Anomaly Detection
class MLAnomalyDetector {
  constructor() {
    this.userProfiles = new Map();
  }

  async buildUserProfile(userId) {
    try {
      const activities = await Activity.find({ userId, status: 'success' })
        .sort({ timestamp: -1 })
        .limit(50);

      if (activities.length < 5) {
        return null; // Not enough data
      }

      const profile = {
        avgLoginHour: 0,
        stdLoginHour: 0,
        commonDevices: new Set(),
        commonIPs: new Set(),
        avgTimeBetweenLogins: 0,
        loginFrequency: 0
      };

      // Calculate average login hour
      const hours = activities.map(a => new Date(a.timestamp).getHours());
      profile.avgLoginHour = hours.reduce((a, b) => a + b, 0) / hours.length;

      // Calculate standard deviation
      const variance = hours.reduce((sum, h) => sum + Math.pow(h - profile.avgLoginHour, 2), 0) / hours.length;
      profile.stdLoginHour = Math.sqrt(variance);

      // Collect common devices and IPs
      activities.forEach(a => {
        if (a.deviceInfo?.fingerprint) profile.commonDevices.add(a.deviceInfo.fingerprint);
        if (a.ipAddress) profile.commonIPs.add(a.ipAddress);
      });

      // Calculate time between logins
      if (activities.length >= 2) {
        const timeDiffs = [];
        for (let i = 0; i < activities.length - 1; i++) {
          const diff = new Date(activities[i].timestamp) - new Date(activities[i + 1].timestamp);
          timeDiffs.push(diff);
        }
        profile.avgTimeBetweenLogins = timeDiffs.reduce((a, b) => a + b, 0) / timeDiffs.length;
      }

      this.userProfiles.set(userId, profile);
      return profile;
    } catch (error) {
      console.error('Error building user profile:', error);
      return null;
    }
  }

  async detectAnomaly(userId, currentHour, deviceFingerprint, ipAddress) {
    let profile = this.userProfiles.get(userId);
    
    if (!profile) {
      profile = await this.buildUserProfile(userId);
      if (!profile) return 0; // Not enough data
    }

    let anomalyScore = 0;

    // Time-based anomaly (Z-score approach)
    if (profile.stdLoginHour > 0) {
      const zScore = Math.abs((currentHour - profile.avgLoginHour) / profile.stdLoginHour);
      if (zScore > 2) anomalyScore += 30; // 2 standard deviations
      else if (zScore > 1.5) anomalyScore += 20;
    }

    // Device anomaly
    if (deviceFingerprint && !profile.commonDevices.has(deviceFingerprint)) {
      anomalyScore += 25; // Unknown device
    }

    // IP anomaly
    if (ipAddress && !profile.commonIPs.has(ipAddress)) {
      anomalyScore += 20; // Unknown IP
    }

    // Frequency anomaly (too frequent logins)
    const recentActivity = await Activity.findOne({
      userId,
      timestamp: { $gte: new Date(Date.now() - 3600000) } // Last hour
    });

    if (recentActivity) {
      const timeSinceLastLogin = Date.now() - new Date(recentActivity.timestamp).getTime();
      if (timeSinceLastLogin < 300000) { // Less than 5 minutes
        anomalyScore += 25; // Unusual frequency
      }
    }

    return Math.min(anomalyScore, 100);
  }
}

const mlDetector = new MLAnomalyDetector();

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
      console.log('✅ Default USER created: user@test.com');
    }
  } catch (error) {
    console.error('Error initializing users:', error);
  }
}

// Blocking Functions
async function blockUser(userId, reason) {
  const blockedUntil = new Date(Date.now() + BLOCK_DURATION);
  await User.findByIdAndUpdate(userId, {
    isBlocked: true,
    blockReason: reason,
    blockedUntil
  });
  console.log(`🚫 User ${userId} blocked until ${blockedUntil}`);
}

async function blockIP(ipAddress, reason) {
  const blockedUntil = new Date(Date.now() + BLOCK_DURATION);
  await BlockedIP.findOneAndUpdate(
    { ipAddress },
    { ipAddress, reason, blockedUntil, $inc: { attempts: 1 } },
    { upsert: true, new: true }
  );
  console.log(`🚫 IP ${ipAddress} blocked until ${blockedUntil}`);
}

async function blockDevice(deviceFingerprint, reason) {
  const blockedUntil = new Date(Date.now() + BLOCK_DURATION);
  await BlockedDevice.findOneAndUpdate(
    { deviceFingerprint },
    { deviceFingerprint, reason, blockedUntil, $inc: { attempts: 1 } },
    { upsert: true, new: true }
  );
  console.log(`🚫 Device ${deviceFingerprint} blocked until ${blockedUntil}`);
}

async function checkIfBlocked(userId, ipAddress, deviceFingerprint) {
  const now = new Date();

  // Check user block
  if (userId) {
    const user = await User.findById(userId);
    if (user?.isBlocked && user.blockedUntil > now) {
      return { blocked: true, reason: user.blockReason, until: user.blockedUntil };
    } else if (user?.isBlocked && user.blockedUntil <= now) {
      // Auto-unblock
      await User.findByIdAndUpdate(userId, {
        isBlocked: false,
        blockReason: null,
        blockedUntil: null
      });
    }
  }

  // Check IP block
  const blockedIP = await BlockedIP.findOne({ ipAddress, blockedUntil: { $gt: now } });
  if (blockedIP) {
    return { blocked: true, reason: blockedIP.reason, until: blockedIP.blockedUntil };
  }

  // Check device block
  const blockedDevice = await BlockedDevice.findOne({ deviceFingerprint, blockedUntil: { $gt: now } });
  if (blockedDevice) {
    return { blocked: true, reason: blockedDevice.reason, until: blockedDevice.blockedUntil };
  }

  return { blocked: false };
}

// Advanced Risk Calculation with ML
function calculateAdvancedRiskScore(email, userId, status, deviceFingerprint, hadRecentFailures, mlScore) {
  let score = mlScore || 0; // Start with ML anomaly score
  
  if (status === 'failed') score += 30;
  
  score += analyzeFrequency(email);
  
  if (userId) {
    score += analyzeTimePattern(email, userId);
  }
  
  if (userId && deviceFingerprint) {
    score += analyzeDevice(userId, deviceFingerprint);
  }
  
  if (status === 'success' && hadRecentFailures) {
    score += analyzeFailurePattern(email);
  }
  
  return Math.min(score, 100);
}

// Check 5 attempts in 2 minutes rule
function check5AttemptsIn2Minutes(email) {
  const now = Date.now();
  
  if (!loginAttempts.has(email)) {
    loginAttempts.set(email, []);
  }
  
  const attempts = loginAttempts.get(email);
  // Clean attempts older than 2 minutes
  const recentAttempts = attempts.filter(time => now - time < TWO_MINUTES);
  loginAttempts.set(email, recentAttempts);
  
  // Add current attempt
  recentAttempts.push(now);
  
  // Check if 5 or more attempts in 2 minutes
  return recentAttempts.length >= MAX_ATTEMPTS_2MIN;
}

function analyzeFrequency(email) {
  const now = Date.now();
  const fiveMinutes = 5 * 60 * 1000;
  
  if (!loginAttempts.has(email)) {
    loginAttempts.set(email, []);
  }
  
  const attempts = loginAttempts.get(email);
  const recentAttempts = attempts.filter(time => now - time < fiveMinutes);
  loginAttempts.set(email, recentAttempts);
  recentAttempts.push(now);
  
  if (recentAttempts.length >= 5) return 30;
  if (recentAttempts.length >= 3) return 20;
  return 0;
}

function analyzeTimePattern(email, userId) {
  const hour = new Date().getHours();
  
  if (!userLoginTimes.has(userId)) {
    userLoginTimes.set(userId, []);
  }
  
  const times = userLoginTimes.get(userId);
  let score = 0;
  
  if (hour >= 0 && hour < 5) {
    score += 20;
  }
  
  if (times.length > 3) {
    const avgHour = times.reduce((a, b) => a + b, 0) / times.length;
    const deviation = Math.abs(hour - avgHour);
    if (deviation > 6) {
      score += 15;
    }
  }
  
  times.push(hour);
  if (times.length > 10) times.shift();
  
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
    return 20;
  }
  
  return 0;
}

function analyzeFailurePattern(email) {
  if (!loginAttempts.has(email)) return 0;
  const attempts = loginAttempts.get(email);
  if (attempts.length >= 3) return 30;
  return 0;
}

// Send Email Alert - Updated to send for medium and high risk
async function sendSecurityAlert(userEmail, ipAddress, riskScore, mlScore, reason, timestamp, wasBlocked, riskLevel = 'HIGH') {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.log('⚠️ Email not configured');
    return false;
  }

  const colors = {
    HIGH: { bg: '#dc2626', text: '#991b1b', border: '#ef4444' },
    MEDIUM: { bg: '#f59e0b', text: '#92400e', border: '#fbbf24' }
  };
  
  const color = colors[riskLevel] || colors.HIGH;
  const blockStatus = wasBlocked ? '<p style="color: #dc2626; font-weight: bold;">⛔ ACCOUNT HAS BEEN BLOCKED FOR 10 MINUTES</p>' : '';

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: ADMIN_EMAIL,
    subject: `🚨 ${wasBlocked ? 'CRITICAL' : riskLevel + ' RISK'} Alert: ${wasBlocked ? 'Account Blocked' : 'Suspicious Activity'} (Score: ${riskScore})`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: ${color.bg}; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">⚠️ ${riskLevel} RISK Security Alert</h1>
          <p style="margin: 5px 0 0 0;">${wasBlocked ? 'ACCOUNT BLOCKED - Suspicious Activity' : 'Suspicious Activity Detected'}</p>
        </div>
        <div style="padding: 20px; border: 1px solid #e5e7eb;">
          ${blockStatus}
          <h2 style="color: #1f2937; margin-top: 0;">Alert Details</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 10px 0; font-weight: bold;">Risk Level:</td><td><span style="background-color: ${color.bg}; color: white; padding: 5px 10px; border-radius: 3px; font-weight: bold;">${riskLevel} RISK</span></td></tr>
            <tr style="background-color: #f9fafb;"><td style="padding: 10px 0; font-weight: bold;">User Email:</td><td>${userEmail}</td></tr>
            <tr><td style="padding: 10px 0; font-weight: bold;">IP Address:</td><td><code>${ipAddress}</code></td></tr>
            <tr style="background-color: #f9fafb;"><td style="padding: 10px 0; font-weight: bold;">Timestamp:</td><td>${timestamp.toLocaleString()}</td></tr>
            <tr><td style="padding: 10px 0; font-weight: bold;">Risk Score:</td><td><span style="background-color: ${color.border}; color: white; padding: 5px 10px; border-radius: 3px;">${riskScore}/100</span></td></tr>
            <tr style="background-color: #f9fafb;"><td style="padding: 10px 0; font-weight: bold;">ML Anomaly Score:</td><td><span style="background-color: #8b5cf6; color: white; padding: 5px 10px; border-radius: 3px;">${mlScore}/100</span></td></tr>
            <tr><td style="padding: 10px 0; font-weight: bold;">Reason:</td><td>${reason}</td></tr>
            ${wasBlocked ? '<tr style="background-color: #fef2f2;"><td style="padding: 10px 0; font-weight: bold;">Block Duration:</td><td><strong>10 minutes</strong></td></tr>' : ''}
          </table>
          <div style="margin-top: 20px; padding: 15px; background-color: ${riskLevel === 'HIGH' ? '#fef2f2' : '#fef3c7'}; border-left: 4px solid ${color.border};">
            <p style="margin: 0; color: ${color.text};"><strong>Action Required:</strong> ${wasBlocked ? 'Account has been automatically blocked. Review immediately.' : 'Please review this activity in your security dashboard.'}</p>
          </div>
          ${riskLevel === 'MEDIUM' ? '<div style="margin-top: 15px; padding: 15px; background-color: #eff6ff; border-left: 4px solid #3b82f6;"><p style="margin: 0; color: #1e40af;"><strong>Note:</strong> This is a medium risk alert. Monitor for escalation.</p></div>' : ''}
        </div>
        <div style="padding: 15px; text-align: center; color: #6b7280; font-size: 12px; border-top: 1px solid #e5e7eb;">
          <p>This is an automated security alert from Smart Security Monitoring System.</p>
          <p>Admin: nagaphaneendrapuranam@gmail.com</p>
        </div>
      </div>
    `
  };

  try {
    await emailTransporter.sendMail(mailOptions);
    console.log(`✅ ${riskLevel} RISK alert email sent to ${ADMIN_EMAIL}`);
    return true;
  } catch (error) {
    console.error('❌ Failed to send email:', error);
    return false;
  }
}

// Middleware
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

function requireAdmin(req, res, next) {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Access denied. Admin only.' });
  }
  next();
}

// Socket.IO
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Routes
app.get('/api/', (req, res) => {
  res.json({ 
    message: 'Security Monitoring API v3.0 - ML Enhanced',
    features: ['ML Anomaly Detection', 'Account Blocking', 'MongoDB Atlas']
  });
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const sanitizedEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: sanitizedEmail });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
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

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const sanitizedEmail = email.toLowerCase().trim();
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
    const currentHour = timestamp.getHours();
    
    const user = await User.findOne({ email: sanitizedEmail });
    const userId = user?._id.toString();

    // NEW: Check 5 attempts in 2 minutes - IMMEDIATE BLOCK
    const shouldBlockFor5Attempts = check5AttemptsIn2Minutes(sanitizedEmail);
    if (shouldBlockFor5Attempts && userId) {
      await blockUser(userId, '5 login attempts within 2 minutes - Auto-blocked');
      await blockIP(ipAddress, '5 attempts in 2 minutes');
      await blockDevice(deviceInfo.fingerprint, '5 attempts in 2 minutes');
      
      await Activity.create({
        userId,
        email: sanitizedEmail,
        status: 'blocked',
        location: ipAddress,
        riskScore: 100,
        mlAnomalyScore: 0,
        reason: '5 login attempts in 2 minutes - Auto-blocked',
        deviceInfo,
        ipAddress,
        alertTriggered: true,
        wasBlocked: true
      });

      sendSecurityAlert(sanitizedEmail, ipAddress, 100, 0, '5 login attempts within 2 minutes - Auto-blocked', timestamp, true, 'HIGH');
      io.emit('security-alert', { email: sanitizedEmail, riskScore: 100, blocked: true, reason: '5 attempts in 2 min' });
      
      return res.status(403).json({ 
        error: 'Account blocked: 5 login attempts within 2 minutes',
        blockedFor: '10 minutes',
        reason: 'Too many rapid attempts detected'
      });
    }

    // Check if blocked
    const blockCheck = await checkIfBlocked(userId, ipAddress, deviceInfo.fingerprint);
    if (blockCheck.blocked) {
      await Activity.create({
        userId,
        email: sanitizedEmail,
        status: 'blocked',
        location: ipAddress,
        riskScore: 100,
        reason: `Login blocked: ${blockCheck.reason}`,
        deviceInfo,
        ipAddress,
        wasBlocked: true
      });

      return res.status(403).json({ 
        error: 'Account blocked due to suspicious activity',
        blockedUntil: blockCheck.until,
        reason: blockCheck.reason
      });
    }

    const hadRecentFailures = loginAttempts.has(sanitizedEmail) && loginAttempts.get(sanitizedEmail).length >= 2;
    
    if (!user) {
      const riskScore = calculateAdvancedRiskScore(sanitizedEmail, null, 'failed', null, false, 0);
      
      await Activity.create({
        email: sanitizedEmail,
        status: 'failed',
        location: ipAddress,
        riskScore,
        reason: 'User not found',
        deviceInfo,
        ipAddress
      });
      
      if (riskScore >= 70) {
        await blockIP(ipAddress, 'Multiple failed login attempts');
        await blockDevice(deviceInfo.fingerprint, 'Multiple failed login attempts');
        sendSecurityAlert(sanitizedEmail, ipAddress, riskScore, 0, 'Failed login - User not found', timestamp, true, 'HIGH');
        io.emit('security-alert', { email: sanitizedEmail, riskScore, blocked: true });
      } else if (riskScore >= 50) {
        // Medium risk - send alert but don't block
        sendSecurityAlert(sanitizedEmail, ipAddress, riskScore, 0, 'Medium risk - Failed login attempt', timestamp, false, 'MEDIUM');
        io.emit('security-alert', { email: sanitizedEmail, riskScore, blocked: false });
      }
      
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    
    if (!validPassword) {
      const mlScore = await mlDetector.detectAnomaly(userId, currentHour, deviceInfo.fingerprint, ipAddress);
      const riskScore = calculateAdvancedRiskScore(sanitizedEmail, userId, 'failed', deviceInfo.fingerprint, false, mlScore);
      
      await Activity.create({
        userId: user._id,
        email: sanitizedEmail,
        status: 'failed',
        location: ipAddress,
        riskScore,
        mlAnomalyScore: mlScore,
        reason: 'Invalid password',
        deviceInfo,
        ipAddress
      });
      
      if (riskScore >= 70) {
        await blockUser(userId, 'Multiple failed password attempts');
        await blockIP(ipAddress, 'Multiple failed password attempts');
        await blockDevice(deviceInfo.fingerprint, 'Multiple failed password attempts');
        
        sendSecurityAlert(sanitizedEmail, ipAddress, riskScore, mlScore, 'Multiple failed password attempts', timestamp, true, 'HIGH');
        io.emit('security-alert', { email: sanitizedEmail, riskScore, mlScore, blocked: true });
      } else if (riskScore >= 50) {
        // Medium risk - send alert but don't block
        sendSecurityAlert(sanitizedEmail, ipAddress, riskScore, mlScore, 'Medium risk - Failed password attempts', timestamp, false, 'MEDIUM');
        io.emit('security-alert', { email: sanitizedEmail, riskScore, mlScore, blocked: false });
      }
      
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Successful login - ML analysis
    const mlScore = await mlDetector.detectAnomaly(userId, currentHour, deviceInfo.fingerprint, ipAddress);
    const riskScore = calculateAdvancedRiskScore(sanitizedEmail, userId, 'success', deviceInfo.fingerprint, hadRecentFailures, mlScore);
    
    const shouldBlock = riskScore >= 80 || mlScore >= 70;
    const alertTriggered = riskScore >= 50; // Send alert for medium risk (50+) and high risk (70+)
    
    if (shouldBlock) {
      await blockUser(userId, 'Suspicious login pattern detected by ML');
      await blockIP(ipAddress, 'Suspicious login pattern');
      await blockDevice(deviceInfo.fingerprint, 'Suspicious login pattern');
      
      await Activity.create({
        userId: user._id,
        email: sanitizedEmail,
        status: 'blocked',
        location: ipAddress,
        riskScore,
        mlAnomalyScore: mlScore,
        reason: 'ML detected suspicious pattern - Account blocked',
        deviceInfo,
        ipAddress,
        alertTriggered: true,
        wasBlocked: true
      });

      sendSecurityAlert(sanitizedEmail, ipAddress, riskScore, mlScore, 'ML detected anomaly - Account blocked', timestamp, true, 'HIGH');
      io.emit('security-alert', { email: sanitizedEmail, riskScore, mlScore, blocked: true });
      
      return res.status(403).json({ 
        error: 'Login blocked due to suspicious activity detected by ML',
        riskScore,
        mlScore,
        blockedFor: '10 minutes'
      });
    }
    
    await Activity.create({
      userId: user._id,
      email: sanitizedEmail,
      status: 'success',
      location: ipAddress,
      riskScore,
      mlAnomalyScore: mlScore,
      reason: riskScore >= 70 ? 'High risk but allowed' : 'Successful login',
      deviceInfo,
      ipAddress,
      alertTriggered
    });

    if (alertTriggered) {
      const riskLevel = riskScore >= 70 ? 'HIGH' : 'MEDIUM';
      sendSecurityAlert(sanitizedEmail, ipAddress, riskScore, mlScore, 'High risk login detected', timestamp, false, riskLevel);
      io.emit('security-alert', { email: sanitizedEmail, riskScore, mlScore, blocked: false });
    }

    if (loginAttempts.has(sanitizedEmail)) {
      loginAttempts.delete(sanitizedEmail);
    }

    await User.findByIdAndUpdate(user._id, {
      lastLoginTime: timestamp,
      typicalLoginHour: currentHour
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
      mlAnomalyScore: mlScore,
      alertTriggered
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Admin routes
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

app.get('/api/activity/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const totalLogins = await Activity.countDocuments({ status: 'success' });
    const failedAttempts = await Activity.countDocuments({ status: 'failed' });
    const blockedAttempts = await Activity.countDocuments({ status: 'blocked' });
    const highRiskLogins = await Activity.countDocuments({ riskScore: { $gte: 70 } });
    const alertsTriggered = await Activity.countDocuments({ alertTriggered: true });
    const suspiciousActivityCount = await Activity.countDocuments({ riskScore: { $gte: 60 } });
    const mlBlockedCount = await Activity.countDocuments({ wasBlocked: true });
    
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const dailyActivity = await Activity.aggregate([
      { $match: { timestamp: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
          success: { $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] } },
          failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
          blocked: { $sum: { $cond: [{ $eq: ['$status', 'blocked'] }, 1, 0] } },
          highRisk: { $sum: { $cond: [{ $gte: ['$riskScore', 70] }, 1, 0] } }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    const riskDistribution = [
      { name: 'Low (0-30)', value: await Activity.countDocuments({ riskScore: { $lte: 30 } }), fill: '#10B981' },
      { name: 'Medium (31-60)', value: await Activity.countDocuments({ riskScore: { $gt: 30, $lte: 60 } }), fill: '#F59E0B' },
      { name: 'High (61-100)', value: await Activity.countDocuments({ riskScore: { $gt: 60 } }), fill: '#EF4444' }
    ];
    
    const recentHighRisk = await Activity.find({ riskScore: { $gte: 70 } })
      .sort({ timestamp: -1 })
      .limit(10)
      .select('email timestamp riskScore mlAnomalyScore reason wasBlocked');
    
    const activeBlocks = {
      users: await User.countDocuments({ isBlocked: true, blockedUntil: { $gt: new Date() } }),
      ips: await BlockedIP.countDocuments({ blockedUntil: { $gt: new Date() } }),
      devices: await BlockedDevice.countDocuments({ blockedUntil: { $gt: new Date() } })
    };
    
    res.json({
      totalLogins,
      failedAttempts,
      blockedAttempts,
      highRiskLogins,
      alertsTriggered,
      suspiciousActivityCount,
      mlBlockedCount,
      dailyActivity,
      riskDistribution,
      recentHighRisk,
      activeBlocks
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

app.get('/api/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = await User.find().select('-password -__v');
    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

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
      { new: true, returnDocument: 'after' }
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

// Unblock user manually (admin only)
app.post('/api/users/:id/unblock', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByIdAndUpdate(
      id,
      { isBlocked: false, blockReason: null, blockedUntil: null },
      { new: true, returnDocument: 'after' }
    ).select('-password -__v');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User unblocked successfully', user });
  } catch (error) {
    console.error('Unblock error:', error);
    res.status(500).json({ error: 'Failed to unblock user' });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📧 Admin email: ${ADMIN_EMAIL}`);
  console.log(`🤖 ML Anomaly Detection: ACTIVE`);
  console.log(`🚫 Auto-blocking: ENABLED (10 min duration)`);
});

module.exports = { io };
