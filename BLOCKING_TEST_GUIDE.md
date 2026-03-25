# How to Test the Blocking Feature

## 🎯 Quick Test Guide

The blocking system triggers when **Risk Score ≥ 80** OR **ML Score ≥ 70**.

### Option 1: Use Test Scripts

Run the automated test:
```bash
/app/test_blocking.sh
```

Or run the aggressive test:
```bash
/app/test_aggressive_block.sh
```

### Option 2: Manual Testing via Browser

#### Step-by-Step:

1. **Open the Login Page**:
   ```
   https://access-control-demo-8.preview.emergentagent.com/login
   ```

2. **Create a Test Account**:
   - Click "Sign up"
   - Email: `yourtest@example.com`
   - Password: `test123`
   - Register

3. **Trigger Failed Attempts** (Do this rapidly):
   - Try logging in with **WRONG password** 8-10 times
   - Use passwords like: `wrong1`, `wrong2`, `wrong3`, etc.
   - Do this **quickly** (within 1-2 minutes)

4. **Attempt Successful Login**:
   - Now use the **CORRECT password**: `test123`
   - System should detect: "Multiple failed attempts + success = brute force"

5. **Expected Result**:
   ```
   ❌ Login blocked due to suspicious activity
   Account blocked for 10 minutes
   ```

### Option 3: Test via API (curl)

```bash
# Set variables
API_URL="https://access-control-demo-8.preview.emergentagent.com"
TEST_EMAIL="apitest@example.com"
TEST_PASS="secure123"

# 1. Register
curl -X POST "$API_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASS\"}"

# 2. Failed attempts (run 8 times rapidly)
for i in {1..8}; do
  curl -X POST "$API_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"wrong$i\"}"
  sleep 0.5
done

# 3. Correct password (should block)
curl -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASS\"}"
```

## 📊 What Gets Blocked?

When blocking is triggered, the system blocks **3 things simultaneously**:

1. **User Account** - Can't login even with correct password
2. **IP Address** - Your IP is blocked from any login
3. **Device Fingerprint** - Your browser/device combo is blocked

## ⏱️ Block Duration

- **Duration**: 10 minutes (600 seconds)
- **Auto-Unblock**: Happens automatically after 10 minutes
- **Manual Unblock**: Admin can unblock via API

## 🔍 How to Verify Blocking Works

### 1. Check Admin Dashboard
Login as admin: `admin@test.com` / `admin123`

Look for:
- **ML Blocked** metric (should increase)
- **Active Blocks** panel (shows count of blocked users/IPs/devices)
- Recent High-Risk Activities (shows 🚫 BLOCKED)

### 2. Check Activity Logs
Go to: Dashboard → Activity Logs

Look for:
- Status column showing **🚫 BLOCKED**
- ML Score column (purple badge if ML detected it)
- High risk scores (70-100)

### 3. Check Email Alerts
Email sent to: `nagaphaneendrapuranam@gmail.com`

Subject: **🚨 CRITICAL Alert: Account Blocked**

Contains:
- User email
- IP address
- Risk score
- ML anomaly score
- Block reason

### 4. Test Block Persistence
After seeing the block, try logging in again immediately:
```bash
# Should return same block error
curl -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASS\"}"
```

Expected: `❌ Login blocked` (still blocked)

## 🎓 Understanding Risk Scoring

### Why might blocking NOT trigger?

The system needs **Risk Score ≥ 80** to block. Score is calculated from:

| Factor | Points | Trigger Condition |
|--------|--------|-------------------|
| Failed attempt | +30 | Wrong password |
| Frequency (5+ attempts) | +30 | 5+ attempts in 5 min |
| Frequency (3-4 attempts) | +20 | 3-4 attempts in 5 min |
| Success after failures | +30 | Login after 3+ failures |
| Unusual hour | +20 | Login at 12AM-5AM |
| Time deviation | +15 | Unusual time for user |
| New device | +20 | Unknown device |
| ML anomaly | 0-100 | Pattern detection |

**To trigger block (80+)**, you need combinations like:
- Failed (30) + Frequency 5+ (30) + Success after failures (30) = **90** ✅
- Failed (30) + Frequency 3-4 (20) + New device (20) + Unusual hour (20) = **90** ✅

### Tips for Testing:

1. **Make attempts RAPID** (within 1-2 minutes)
2. **Do 8-10 failed attempts** (not just 3-4)
3. **Use a new account** (ML needs history for ML scoring)
4. **Test at unusual hours** (midnight-5am adds +20)

## 🔓 How to Unblock

### Auto-Unblock (Wait 10 minutes)
Just wait. System automatically removes blocks after 10 minutes.

### Manual Unblock (Admin)
```bash
# Get user ID from dashboard
USER_ID="..."

# Get admin token first
TOKEN=$(curl -s -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"admin123"}' \
  | jq -r '.token')

# Unblock user
curl -X POST "$API_URL/api/users/$USER_ID/unblock" \
  -H "Authorization: Bearer $TOKEN"
```

## 📧 Email Alert Example

When blocking occurs, this email is sent:

```
Subject: 🚨 CRITICAL Alert: Account Blocked (Score: 90)

⚠️ ACCOUNT BLOCKED FOR 10 MINUTES

User Email: test@example.com
IP Address: 123.456.789.0
Risk Score: 90/100
ML Anomaly Score: 25/100
Reason: Multiple failed login attempts + suspicious pattern

Action Required: Review this activity in your dashboard
```

## 🚀 Production Tips

1. **Adjust thresholds** if too sensitive:
   - Edit `/app/backend/server.js`
   - Line: `const shouldBlock = riskScore >= 80 || mlScore >= 70;`
   - Increase 80 to 85-90 for less false positives

2. **Monitor false positives**:
   - Check if legitimate users are being blocked
   - Adjust ML thresholds accordingly

3. **Add CAPTCHA**:
   - After 3 failed attempts, show CAPTCHA
   - Reduces automated attacks

## 📞 Support

If blocking isn't working:
1. Check backend logs: `tail -f /var/log/supervisor/backend.out.log`
2. Verify MongoDB Atlas connection
3. Check risk score calculations in logs
4. Ensure failed attempts are within 5-minute window
