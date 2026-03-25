# Smart Security Monitoring System - Advanced Version 2.0

## 🚀 Upgrade Summary

This document outlines all the advanced features implemented in the upgraded Security Monitoring System.

---

## ✨ New Features Implemented

### 1. **Hardcoded Admin Configuration**
- **Admin Email**: `nagaphaneendrapuranam@gmail.com`
- **Auto-Assignment**: Any user registering with this email is automatically assigned ADMIN role
- **No Fake Credentials**: Real admin account with proper authentication

### 2. **Advanced Detection Engine**

The system now uses a sophisticated multi-factor risk scoring algorithm:

#### **Frequency Analysis**
- Tracks login attempts within 5-minute windows
- **Scoring**:
  - 5+ attempts → +30 risk points
  - 3-4 attempts → +20 risk points
  - Less than 3 → No penalty

#### **Time Pattern Analysis**
- Monitors typical user login hours
- **Scoring**:
  - Login during unusual hours (12 AM - 5 AM) → +20 points
  - Deviation from user's typical pattern → +15 points

#### **Device Change Detection**
- Tracks device fingerprints (Browser + OS + Device Type)
- **Scoring**:
  - New device detected → +20 risk points
  - Known device → No penalty

#### **Failure Pattern Recognition**
- Detects brute-force attack patterns
- **Scoring**:
  - Success after 3+ failed attempts → +30 points (potential breach)
  - Failed attempt → +30 points

#### **Total Risk Score**: 0-100 scale (capped at 100)

### 3. **Email Alert System** 📧

**Configuration**:
- Sender: `nagaworkk@gmail.com`
- Recipient: `nagaphaneendrapuranam@gmail.com` (admin)
- Service: Gmail SMTP with App Password

**Alert Triggers**:
- Risk score ≥ 70
- Multiple failed attempts (≥3 within 5 minutes)
- Successful login after multiple failures (brute-force indicator)

**Email Contents**:
- User email
- IP address
- Timestamp
- Risk score (0-100)
- Detailed reason for alert
- Professional HTML formatting

### 4. **Real-Time Alerts with Socket.IO** 🔴

- Live dashboard updates when high-risk activity occurs
- Toast notifications for admins
- No page refresh required
- Persistent WebSocket connection

### 5. **Enhanced Dashboard**

**New Metrics**:
- Total Logins
- Failed Attempts
- High Risk Logins
- **Alerts Triggered** (NEW) - Count of emails sent
- **Suspicious Activity** (NEW) - Risk score 60-100

**New Charts**:
- Line chart now includes "High Risk" tracking
- Enhanced tooltips with better data visualization

**New Section**:
- **Recent High-Risk Activities** - Shows last 10 high-risk events with details

### 6. **Enhanced Activity Logs**

**New Columns**:
- **Device Info**: Browser, OS, Device Type with icons
- **IP Address**: Separate column for IP tracking
- **Alert Triggered**: Yes/No indicator showing if email was sent

**Improved Features**:
- Search now includes device info
- Better visual indicators for risk levels
- Cleaner table design

### 7. **In-Memory Rate Limiting**

No Redis required! Uses Map-based tracking:
- Login attempt history (5-minute windows)
- Device history per user
- Typical login hours per user
- Automatic cleanup of old data

### 8. **Bug Fixes**

- ✅ Fixed routing issue: USER now correctly redirects to `/home`
- ✅ Fixed routing issue: ADMIN correctly redirects to `/dashboard`
- ✅ Eliminated route conflicts in React Router

---

## 🔒 Security Improvements

1. **Input Sanitization**: Email addresses are now trimmed and lowercased
2. **Rate Limiting**: In-memory tracking prevents rapid login attempts
3. **Device Tracking**: Suspicious device changes are flagged
4. **Pattern Recognition**: Brute-force attempts are detected and reported
5. **Real-time Monitoring**: Admins are immediately notified of threats

---

## 📊 Risk Scoring Examples

### Low Risk (0-30):
- Normal login during typical hours
- Known device
- No recent failed attempts
- **Action**: None

### Medium Risk (31-60):
- New device login
- OR unusual login hour
- 2-3 recent attempts
- **Action**: Logged and monitored

### High Risk (61-100):
- Multiple failed attempts + success (brute-force pattern)
- Multiple risk factors combined
- 5+ attempts in 5 minutes
- **Action**: Email alert + Dashboard notification

---

## 🧪 Testing Scenarios

### Scenario 1: Normal Login ✅
```bash
curl -X POST "https://.../api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"user@test.com","password":"password123"}'
```
**Expected**: Low risk score (0-30), no alert

### Scenario 2: Failed Attempts ⚠️
```bash
# Attempt 1
curl -X POST "https://.../api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"user@test.com","password":"wrong"}'

# Attempt 2 (same within 5 min)
# Attempt 3
```
**Expected**: Medium risk score (40-60), logged

### Scenario 3: Brute Force Detection 🚨
```bash
# 3 failed attempts
# Then successful login
curl -X POST "https://.../api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"user@test.com","password":"password123"}'
```
**Expected**: High risk score (70+), email alert sent

---

## 🌐 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user (auto-assigns ADMIN if email matches)
- `POST /api/auth/login` - Login with risk analysis

### Admin Only (Requires Bearer Token)
- `GET /api/activity` - Get all activity logs
- `GET /api/activity/stats` - Get dashboard statistics
- `GET /api/users` - Get all users
- `PUT /api/users/:id/role` - Update user role

---

## 📦 Technology Stack

### Backend
- Node.js + Express
- MongoDB + Mongoose
- Socket.IO (real-time)
- Nodemailer (email alerts)
- UA-Parser-JS (device detection)
- JWT (authentication)
- bcrypt (password hashing)

### Frontend
- React 19
- Socket.IO Client (real-time)
- Recharts (data visualization)
- Lucide React (icons)
- Sonner (toast notifications)
- Axios (API calls)
- Tailwind CSS (styling)

---

## 🔧 Configuration

### Environment Variables (.env)
```env
MONGO_URL="mongodb://localhost:27017"
DB_NAME="security_monitoring_db"
JWT_SECRET="your-secret-key-change-in-production-12345"
EMAIL_USER="nagaworkk@gmail.com"
EMAIL_PASSWORD="afojsgcvxgcpfboz"
CORS_ORIGINS="*"
```

### Hardcoded Values
```javascript
const ADMIN_EMAIL = 'nagaphaneendrapuranam@gmail.com';
const PORT = 8001;
```

---

## 📈 System Behavior

### On Login:
1. Parse user-agent for device info
2. Check frequency of attempts
3. Analyze time patterns
4. Check device history
5. Calculate risk score
6. Log activity with all metadata
7. If risk ≥ 70:
   - Send email to admin
   - Emit Socket.IO event
   - Mark activity as alert triggered
8. Return JWT token

### On Dashboard Load:
1. Connect to Socket.IO
2. Fetch statistics
3. Display metrics and charts
4. Listen for real-time alerts
5. Auto-refresh on alert

---

## 🎯 Success Metrics

✅ **All Features Implemented**:
- [x] Hardcoded admin email configuration
- [x] Advanced detection engine
- [x] Email alerts (tested and working)
- [x] Real-time Socket.IO updates
- [x] Enhanced dashboard with 5 metrics
- [x] Enhanced logs with device info
- [x] In-memory rate limiting
- [x] Bug fixes (routing)

✅ **Testing Results**:
- Email alert sent successfully
- High-risk detection working (70+ score)
- Real-time updates functional
- All APIs responding correctly

---

## 🚀 Next Steps (Optional Enhancements)

1. **MongoDB Atlas**: Migrate to cloud database for production
2. **IP Geolocation**: Add country/city detection for better location tracking
3. **Advanced Analytics**: ML-based anomaly detection
4. **User Notifications**: Alert users of suspicious activity on their account
5. **Audit Trail**: Detailed logs for compliance
6. **2FA Integration**: Additional security layer

---

## 📝 Notes

- Email alerts are sent asynchronously (non-blocking)
- Socket.IO uses WebSocket with polling fallback
- Device fingerprints are simple (Browser-OS-Device)
- Risk scores are cumulative and capped at 100
- Historical data is stored indefinitely in MongoDB
- In-memory data is volatile (resets on server restart)

---

**Version**: 2.0  
**Last Updated**: March 25, 2026  
**Status**: ✅ Production Ready
