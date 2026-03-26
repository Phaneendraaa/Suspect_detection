# Smart Security Monitoring System

A production-ready security monitoring system with **Machine Learning-based anomaly detection**, **real-time alerts**, and **intelligent auto-blocking** capabilities.

![Version](https://img.shields.io/badge/version-3.0-blue)
![Node](https://img.shields.io/badge/node-18.x-green)
![MongoDB](https://img.shields.io/badge/mongodb-Atlas-green)
![License](https://img.shields.io/badge/license-MIT-blue)

---

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
- [Environment Setup](#-environment-setup)
- [Running Locally](#-running-locally)
- [API Documentation](#-api-documentation)
- [Testing](#-testing)
- [Security Features](#-security-features)
- [Deployment](#-deployment)
- [Troubleshooting](#-troubleshooting)

---

## ✨ Features

### 🔒 Security Features
- **Role-Based Access Control** (USER/ADMIN)
- **JWT Authentication** with secure token management
- **ML-Based Anomaly Detection** using statistical analysis
- **Triple-Layer Blocking**: User account + IP address + Device fingerprint
- **Auto-Unblock**: 10-minute block duration with automatic release
- **5-Attempts Rule**: Immediate block after 5 attempts in 2 minutes
- **Behavioral Profiling**: Learns user patterns and detects deviations

### 📧 Alert System
- **Multi-Level Alerts**:
  - 🟠 MEDIUM RISK (score 50-69): Warning emails
  - 🔴 HIGH RISK (score 70-79): High priority alerts
  - 🔴 CRITICAL (score 80-100): Account blocked + urgent alerts
- **Real-Time Notifications** via Socket.IO
- **Email Alerts** with detailed security insights
- **Admin Dashboard** with live metrics

### 📊 Monitoring & Analytics
- **6 Key Metrics**:
  - Total Logins
  - Failed Attempts
  - High Risk Logins
  - Alerts Triggered
  - Suspicious Activity
  - ML Blocked Accounts
- **Interactive Charts**:
  - 7-day activity trend (Line Chart)
  - Risk distribution (Pie Chart)
- **Activity Logs** with advanced filtering and sorting
- **Device Tracking** with browser, OS, and device info
- **ML Anomaly Scores** displayed alongside risk scores

### 🎯 User Experience
- **Modern Minimal UI** with clean design
- **Responsive Dashboard** optimized for all devices
- **Real-Time Updates** without page refresh
- **Intuitive Navigation** with sidebar for admins
- **Toast Notifications** for instant feedback

---

## 🛠️ Tech Stack

### Backend
- **Node.js** v18.x
- **Express.js** - REST API framework
- **MongoDB Atlas** - Cloud database
- **Mongoose** - MongoDB ODM
- **Socket.IO** - Real-time communication
- **Nodemailer** - Email service (Gmail SMTP)
- **bcrypt** - Password hashing
- **jsonwebtoken** - JWT authentication
- **UA-Parser-JS** - Device detection

### Frontend
- **React** v19
- **React Router** - Client-side routing
- **Socket.IO Client** - Real-time updates
- **Axios** - HTTP client
- **Recharts** - Data visualization
- **Tailwind CSS** - Styling
- **Lucide React** - Icons
- **Sonner** - Toast notifications

### DevOps
- **Supervisor** - Process management
- **Nginx** - Reverse proxy (production)
- **MongoDB Atlas** - Cloud database hosting

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       CLIENT BROWSER                         │
│                  (React + Socket.IO Client)                  │
└───────────────┬─────────────────────────────────────────────┘
                │ HTTP/HTTPS + WebSocket
                ▼
┌─────────────────────────────────────────────────────────────┐
│                     BACKEND SERVER                           │
│              (Node.js + Express + Socket.IO)                 │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Auth System  │  │ ML Detector  │  │ Block Manager│      │
│  │ (JWT/bcrypt) │  │ (Anomaly)    │  │ (Triple-layer)│      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└───────────────┬─────────────────────────────────────────────┘
                │
    ┌───────────┴───────────┐
    ▼                       ▼
┌─────────────┐     ┌──────────────┐
│  MongoDB    │     │  Email SMTP  │
│   Atlas     │     │   (Gmail)    │
│  (Database) │     │   (Alerts)   │
└─────────────┘     └──────────────┘
```

---

## 📦 Prerequisites

Before running this project locally, ensure you have:

- **Node.js** v18.x or higher ([Download](https://nodejs.org/))
- **Yarn** package manager ([Install](https://yarnpkg.com/getting-started/install))
- **MongoDB Atlas** account ([Sign up free](https://www.mongodb.com/cloud/atlas/register))
- **Gmail account** with App Password for email alerts

---

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd <project-directory>
```

### 2. Install Backend Dependencies

```bash
cd backend
yarn install
```

### 3. Install Frontend Dependencies

```bash
cd ../frontend
yarn install
```

---

## ⚙️ Environment Setup

### Backend Configuration

Create `/backend/.env` file:

```env
# MongoDB Atlas Connection
MONGO_URL="mongodb+srv://username:password@cluster.mongodb.net/?appName=YourApp"
DB_NAME="security_monitoring_db"

# JWT Secret (change in production)
JWT_SECRET="your-super-secret-jwt-key-change-this"

# Email Configuration (Gmail)
EMAIL_USER="your-email@gmail.com"
EMAIL_PASSWORD="your-16-char-app-password"

# CORS Settings
CORS_ORIGINS="*"
```

#### 📧 How to Get Gmail App Password:

1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable **2-Step Verification** (if not already enabled)
3. Go to **App Passwords** section
4. Generate new app password for "Mail"
5. Copy the 16-character password
6. Use it in `EMAIL_PASSWORD` field

#### 🗄️ MongoDB Atlas Setup:

1. Create account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register)
2. Create a new cluster (free tier available)
3. Go to **Database Access** → Create database user
4. Go to **Network Access** → Add IP (use `0.0.0.0/0` for development)
5. Click **Connect** → **Connect your application**
6. Copy the connection string
7. Replace `<username>`, `<password>`, and `<dbname>` in connection string

### Frontend Configuration

Create `/frontend/.env` file:

```env
# Backend API URL (use localhost for local development)
REACT_APP_BACKEND_URL="http://localhost:8001"

# Other frontend configs
WDS_SOCKET_PORT=443
ENABLE_HEALTH_CHECK=false
```

---

## 💻 Running Locally

### Option 1: Using Supervisor (Recommended)

This method runs both backend and frontend concurrently with auto-reload:

```bash
# Install supervisor (if not installed)
sudo apt-get install supervisor  # Ubuntu/Debian
# or
brew install supervisor          # macOS

# Start all services
sudo supervisorctl start all

# Check status
sudo supervisorctl status

# View logs
tail -f /var/log/supervisor/backend.out.log
tail -f /var/log/supervisor/frontend.out.log
```

### Option 2: Manual Start (Development)

**Terminal 1 - Backend:**
```bash
cd backend
node server.js
```

**Terminal 2 - Frontend:**
```bash
cd frontend
yarn start
```

### Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8001/api
- **Admin Dashboard**: http://localhost:3000/dashboard

---

## 🔑 Default Credentials

### Admin Account
```
Email: tharunreddy19938@gmail.com
Password: admin123
Role: ADMIN (full access)
```

### Test User Account
```
Email: user@test.com
Password: password123
Role: USER (limited access)
```

---

## 📡 API Documentation

### Authentication Endpoints

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response:**
```json
{
  "message": "User registered successfully",
  "userId": "60f7...",
  "email": "user@example.com",
  "role": "USER"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "60f7...",
    "email": "user@example.com",
    "role": "USER"
  },
  "riskScore": 25,
  "mlAnomalyScore": 0,
  "alertTriggered": false
}
```

### Admin Endpoints (Requires Authentication)

#### Get Activity Logs
```http
GET /api/activity
Authorization: Bearer <token>
```

#### Get Dashboard Statistics
```http
GET /api/activity/stats
Authorization: Bearer <token>
```

**Response:**
```json
{
  "totalLogins": 150,
  "failedAttempts": 23,
  "highRiskLogins": 5,
  "alertsTriggered": 8,
  "suspiciousActivityCount": 12,
  "mlBlockedCount": 3,
  "dailyActivity": [...],
  "riskDistribution": [...],
  "activeBlocks": {
    "users": 2,
    "ips": 3,
    "devices": 2
  }
}
```

#### Get All Users
```http
GET /api/users
Authorization: Bearer <token>
```

#### Update User Role
```http
PUT /api/users/:id/role
Authorization: Bearer <token>
Content-Type: application/json

{
  "role": "ADMIN"
}
```

#### Unblock User (Manual)
```http
POST /api/users/:id/unblock
Authorization: Bearer <token>
```

---

## 🧪 Testing

### Run Automated Tests

#### Test 5-Attempts Blocking
```bash
./test_5_attempts_block.sh
```

**Expected Output:**
- 5 rapid login attempts
- 6th attempt blocked immediately
- Email alert sent
- Risk score: 100

#### Test Medium Risk Alerts
```bash
# Make 3 failed attempts (creates medium risk)
for i in {1..3}; do
  curl -X POST http://localhost:8001/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"wrong"}'
  sleep 2
done
```

### Manual Testing

1. **Register Account**: Create new user via UI
2. **Failed Attempts**: Try wrong password multiple times
3. **Check Dashboard**: Login as admin and view metrics
4. **Verify Email**: Check admin email for alerts

### Test Checklist

- [ ] User registration works
- [ ] Login with correct credentials succeeds
- [ ] Login with wrong password fails
- [ ] 5 rapid attempts trigger block
- [ ] Medium risk (50-69) sends email alert
- [ ] High risk (70+) sends email alert
- [ ] Blocked account cannot login
- [ ] Auto-unblock after 10 minutes works
- [ ] Admin can view all logs
- [ ] Admin can change user roles
- [ ] Real-time alerts appear in dashboard
- [ ] ML anomaly detection shows scores

---

## 🔐 Security Features Explained

### Risk Scoring System

The system calculates risk scores (0-100) based on multiple factors:

| Factor | Points | Trigger |
|--------|--------|---------|
| Failed login | +30 | Wrong password |
| High frequency | +30 | 5+ attempts in 5 min |
| Medium frequency | +20 | 3-4 attempts in 5 min |
| Success after failures | +30 | Login after 3+ failures |
| Unusual hour | +20 | Login 12AM-5AM |
| Time deviation | +15 | Outside normal pattern |
| New device | +20 | Unknown browser/OS |
| ML: Unknown IP | +20 | First time IP |
| ML: Time anomaly | +30 | Unusual time (Z-score) |
| ML: Device anomaly | +25 | Unknown device |
| ML: Frequency spike | +25 | Rapid logins |

### Blocking Rules

**Rule 1: 5 Attempts in 2 Minutes**
- Instant block on 5th attempt
- Risk score set to 100
- Blocks: User + IP + Device

**Rule 2: Risk Score ≥ 80**
- Auto-block on next attempt
- 10-minute duration
- Email alert sent

**Rule 3: ML Anomaly ≥ 70**
- ML detects suspicious pattern
- Immediate block
- Critical alert sent

### Machine Learning Detection

The ML system:
1. **Builds User Profiles** from last 50 logins
2. **Calculates Normal Patterns**:
   - Average login hour
   - Standard deviation
   - Common devices/IPs
3. **Detects Anomalies** using Z-score:
   - Time-based: Login at unusual hour (>2σ)
   - Device-based: Unknown device/IP
   - Frequency-based: Too rapid logins

---

## 🚀 Deployment

### Production Checklist

- [ ] Change `JWT_SECRET` to strong random string
- [ ] Use production MongoDB Atlas cluster
- [ ] Configure email with production SMTP
- [ ] Update CORS origins to specific domains
- [ ] Enable HTTPS/SSL certificates
- [ ] Set up monitoring and logging
- [ ] Configure backup strategy
- [ ] Test all security features
- [ ] Set up admin user properly
- [ ] Remove test accounts

### Environment Variables (Production)

```env
MONGO_URL="mongodb+srv://prod-user:strong-pass@prod.mongodb.net"
JWT_SECRET="use-very-long-random-secret-minimum-32-chars"
EMAIL_USER="alerts@yourdomain.com"
EMAIL_PASSWORD="production-app-password"
CORS_ORIGINS="https://yourdomain.com"
NODE_ENV="production"
```

### Build for Production

**Frontend:**
```bash
cd frontend
yarn build
# Deploy 'build' folder to CDN or static hosting
```

**Backend:**
```bash
cd backend
# Already production-ready, just deploy with PM2 or Docker
pm2 start server.js --name security-monitor
```

---

## 🐛 Troubleshooting

### Common Issues

#### 1. MongoDB Connection Error
```
Error: MongoServerSelectionError
```
**Solution:**
- Check MongoDB Atlas cluster is running
- Verify IP is whitelisted in Network Access
- Confirm credentials are correct
- Test connection string with MongoDB Compass

#### 2. Email Alerts Not Working
```
Error: Invalid login: 534-5.7.14
```
**Solution:**
- Enable 2-Step Verification in Google Account
- Generate new App Password
- Don't use regular Gmail password
- Check EMAIL_USER and EMAIL_PASSWORD in .env

#### 3. Port Already in Use
```
Error: listen EADDRINUSE: address already in use :::8001
```
**Solution:**
```bash
# Find process using port 8001
lsof -i :8001
# Kill the process
kill -9 <PID>
# Or use different port in server.js
```

#### 4. Frontend Not Connecting to Backend
```
Network Error / CORS Error
```
**Solution:**
- Check REACT_APP_BACKEND_URL in frontend/.env
- Ensure backend is running on correct port
- Verify CORS is enabled in backend
- Clear browser cache

#### 5. Blocks Not Working
**Solution:**
- Check MongoDB connection
- Verify BlockedIP and BlockedDevice collections exist
- Test with test script
- Check backend logs for errors

### Debug Commands

```bash
# Check backend logs
tail -f /var/log/supervisor/backend.out.log
tail -f /var/log/supervisor/backend.err.log

# Check if services are running
sudo supervisorctl status

# Restart services
sudo supervisorctl restart backend
sudo supervisorctl restart frontend

# Test API connection
curl http://localhost:8001/api/

# Check MongoDB connection
mongo "mongodb+srv://..."  # if MongoDB Shell installed
```

---

## 📊 Performance Optimization

### Backend
- Uses indexes on email, timestamp fields
- In-memory caching for user profiles
- Efficient MongoDB aggregation pipelines
- Connection pooling with Mongoose

### Frontend
- Code splitting with React.lazy()
- Memoization with React.memo
- Debounced search inputs
- Optimized re-renders

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

---

## 📄 License

This project is licensed under the MIT License.

---

## 👥 Support

For issues, questions, or contributions:
- **Email**: tharunreddy19938@gmail.com
- **Admin Email** (for alerts): tharunreddy19938@gmail.com

---

## 🎯 Roadmap

- [ ] Add 2FA/MFA authentication
- [ ] IP geolocation for precise location tracking
- [ ] Advanced ML models (Isolation Forest)
- [ ] User self-service unblock requests
- [ ] Captcha after multiple failed attempts
- [ ] Audit trail for compliance
- [ ] Mobile app
- [ ] API rate limiting
- [ ] Redis caching for better performance
- [ ] Webhook notifications

---

## 📝 Changelog

### Version 3.0 (Current)
- ✅ ML-based anomaly detection
- ✅ Triple-layer blocking system
- ✅ 5-attempts-in-2-minutes rule
- ✅ Medium + High risk email alerts
- ✅ Real-time Socket.IO updates
- ✅ MongoDB Atlas cloud database
- ✅ Enhanced dashboard with 6 metrics
- ✅ Device tracking and fingerprinting

### Version 2.0
- Advanced detection engine
- Email alert system
- Enhanced dashboard metrics
- Activity logs with device info

### Version 1.0
- Basic authentication system
- Role-based access control
- Simple risk scoring
- Admin dashboard

---

**Built with ❤️ for Security Monitoring**
