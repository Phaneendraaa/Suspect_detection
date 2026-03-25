# System Updates - Final Version

## 🎯 Changes Implemented

### 1. ✅ Email Alerts for Medium Risk (NEW)
**Before**: Only HIGH RISK (≥70) triggered emails
**Now**: Both MEDIUM (50-69) and HIGH RISK (≥70) trigger emails

**Email Alert Thresholds:**
- **HIGH RISK (≥70)**: Red alert, account may be blocked
- **MEDIUM RISK (50-69)**: Orange alert, monitoring required

**What triggers each:**
```
Score 0-49:  No alert (normal)
Score 50-69: MEDIUM RISK email alert (no block)
Score 70+:   HIGH RISK email alert (may block)
Score 80+:   CRITICAL - Account blocked
```

### 2. ✅ 5 Attempts in 2 Minutes = Instant Block (NEW)
**New Rule**: If any user makes **5 login attempts within 2 minutes**, they are **immediately blocked**.

**How it works:**
```
Attempt 1-4: Logged, risk increases
Attempt 5:   INSTANT BLOCK (10 minutes)
             • User account blocked
             • IP address blocked
             • Device blocked
             • Email alert sent
             • Risk score: 100
```

**This is INDEPENDENT of password correctness:**
- Even if attempts are with wrong passwords
- Even if user hasn't logged in successfully
- Triggers on 5th attempt regardless of risk score

### 3. ✅ Admin Email Updated
**Updated everywhere to**: `nagaphaneendrapuranam@gmail.com`

**Where updated:**
- ✅ Login page test credentials display
- ✅ Backend hardcoded admin email constant
- ✅ Email alerts recipient
- ✅ Default admin account creation

---

## 📧 Email Alert System Summary

### HIGH RISK Email (≥70)
```
Subject: 🚨 HIGH RISK Alert: Suspicious Activity (Score: XX)
Color: Red
Content:
  - Risk Score
  - ML Anomaly Score
  - User email
  - IP address
  - Timestamp
  - Reason
  - Block status
```

### MEDIUM RISK Email (50-69)
```
Subject: 🚨 MEDIUM RISK Alert: Suspicious Activity (Score: XX)
Color: Orange
Content:
  - Risk Score
  - ML Anomaly Score
  - User email
  - IP address
  - Timestamp
  - Reason
  - Note: Monitor for escalation
```

### CRITICAL Email (Blocked)
```
Subject: 🚨 CRITICAL Alert: Account Blocked (Score: 100)
Color: Dark Red
Content:
  - ⛔ ACCOUNT BLOCKED FOR 10 MINUTES
  - All alert details
  - Block duration
  - Triple-layer block info
```

---

## 🔒 Complete Blocking Rules

### Rule 1: 5 Attempts in 2 Minutes
```
Condition: 5 login attempts within 120 seconds
Action:    INSTANT BLOCK (score = 100)
Duration:  10 minutes
Blocks:    User + IP + Device
Email:     CRITICAL alert
```

### Rule 2: Risk Score ≥ 80
```
Condition: Combined risk score reaches 80+
Action:    BLOCK on next attempt
Duration:  10 minutes
Blocks:    User + IP + Device
Email:     HIGH RISK or CRITICAL alert
```

### Rule 3: ML Anomaly Score ≥ 70
```
Condition: ML detects anomaly score 70+
Action:    BLOCK on that attempt
Duration:  10 minutes
Blocks:    User + IP + Device
Email:     HIGH RISK or CRITICAL alert
```

---

## 🧪 Testing Guide

### Test 1: Medium Risk Alert (No Block)
```bash
# Make 3 failed attempts (risk ~50-60)
for i in {1..3}; do
  curl -X POST "$API_URL/api/auth/login" \
    -d '{"email":"test@example.com","password":"wrong"}'
  sleep 2
done

# Check email: Should receive MEDIUM RISK alert
# Check account: Should NOT be blocked
```

### Test 2: 5 Attempts Block
```bash
# Use the provided test script
/app/test_5_attempts_block.sh

# Or manually make 5 rapid attempts
# Result: BLOCKED on 5th attempt
```

### Test 3: High Risk Alert
```bash
# Make 8-10 rapid failed attempts
# Then successful login
# Result: HIGH RISK alert + possible block
```

---

## 📊 Risk Score Breakdown

| Factor | Points | Notes |
|--------|--------|-------|
| Failed attempt | +30 | Wrong password |
| 5+ attempts in 5 min | +30 | High frequency |
| 3-4 attempts in 5 min | +20 | Medium frequency |
| Success after failures | +30 | Brute force indicator |
| Unusual hour (0-5 AM) | +20 | Suspicious timing |
| Time deviation | +15 | Outside normal pattern |
| New device | +20 | Unknown device |
| New IP | +20 | ML: Unknown IP |
| ML time anomaly | +30 | ML: Unusual time |
| ML device anomaly | +25 | ML: Unknown device |
| ML frequency anomaly | +25 | ML: Rapid logins |

**Total possible**: 100+ (capped at 100)

---

## 🎯 Admin Dashboard Updates

### Metrics Display
All emails are tracked:
- **Alerts Triggered**: Counts both MEDIUM and HIGH RISK emails
- **ML Blocked**: Counts auto-blocked accounts
- **Active Blocks**: Shows current blocked users/IPs/devices

### Activity Logs
Shows all activity with:
- 🚫 BLOCKED status
- ML Score (purple badge)
- Risk Score
- Alert indicators

---

## 📧 Email Configuration

**Sender**: nagaworkk@gmail.com (Gmail SMTP)
**Recipient**: nagaphaneendrapuranam@gmail.com
**Service**: Gmail with App Password
**Status**: ✅ Active and working

---

## 🔓 Unblocking

### Auto-Unblock
All blocks expire after **10 minutes** automatically.

### Manual Unblock (Admin)
```bash
# Get admin token
TOKEN=$(curl -s -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"nagaphaneendrapuranam@gmail.com","password":"admin123"}' \
  | jq -r '.token')

# Unblock user
curl -X POST "$API_URL/api/users/{userId}/unblock" \
  -H "Authorization: Bearer $TOKEN"
```

---

## 📝 Summary of All Features

### Security Features
✅ Role-based authentication (USER/ADMIN)
✅ JWT token authentication
✅ Password hashing (bcrypt)
✅ MongoDB Atlas cloud storage
✅ Real-time Socket.IO alerts
✅ Machine learning anomaly detection
✅ Triple-layer blocking (User/IP/Device)
✅ Email alerts (MEDIUM + HIGH + CRITICAL)
✅ 5-attempts-in-2-minutes instant block
✅ Auto-unblock after 10 minutes
✅ Manual unblock for admins
✅ Device fingerprinting
✅ IP tracking
✅ Behavioral profiling

### Dashboard Features
✅ 6 metric cards with live data
✅ Active blocks panel
✅ Real-time alert notifications
✅ Line chart (7-day activity)
✅ Pie chart (risk distribution)
✅ Recent high-risk activities
✅ ML score indicators

### Activity Logs
✅ Comprehensive logging
✅ Search and sort
✅ Device information
✅ ML anomaly scores
✅ Block status indicators
✅ Risk score badges
✅ Alert indicators

---

## 🚀 Production Status

**System Version**: v3.0 (ML + Blocking + Enhanced Alerts)
**Database**: MongoDB Atlas (Cloud)
**Email Service**: Active
**ML Detection**: Active
**Auto-Blocking**: Enabled
**Status**: ✅ Production Ready

---

## 📞 Quick Reference

**Admin Email**: nagaphaneendrapuranam@gmail.com
**Admin Password**: admin123
**Test User**: user@test.com / password123
**Block Duration**: 10 minutes
**5-Attempt Rule**: 2 minutes window
**Medium Risk**: 50-69 score
**High Risk**: 70-79 score
**Blocking Threshold**: 80+ score or ML 70+

---

**Last Updated**: March 25, 2026
**Version**: 3.0 Final
