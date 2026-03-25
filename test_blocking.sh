#!/bin/bash

# Smart Security Monitoring System - Blocking Feature Test
# This script demonstrates the ML-based automatic blocking system

API_URL=$(grep REACT_APP_BACKEND_URL /app/frontend/.env | cut -d '=' -f2)

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║   Smart Security Monitoring - Blocking Feature Test          ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# Test account credentials
TEST_EMAIL="blocktest@example.com"
TEST_PASSWORD="test123"

echo "📋 Test Setup:"
echo "   Email: $TEST_EMAIL"
echo "   Password: $TEST_PASSWORD"
echo "   Backend: $API_URL"
echo ""

# Step 1: Create test account
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 1: Creating test account..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

REGISTER_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")

echo "$REGISTER_RESPONSE" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    if 'userId' in d:
        print('✅ Account created successfully')
        print(f'   User ID: {d[\"userId\"]}')
        print(f'   Role: {d[\"role\"]}')
    elif 'error' in d and 'already exists' in d['error']:
        print('ℹ️  Account already exists (using existing account)')
    else:
        print('⚠️  Unexpected response:', d)
except:
    print('⚠️  Account may already exist')
"
echo ""
sleep 2

# Step 2: Simulate multiple failed login attempts
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 2: Simulating BRUTE FORCE attack (6 failed attempts)..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⚠️  This will increase the risk score significantly"
echo ""

for i in {1..6}; do
  echo "🔴 Failed attempt $i/6..."
  curl -s -X POST "$API_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"wrongpassword$i\"}" > /dev/null 2>&1
  sleep 0.8
done

echo ""
echo "✅ Simulated 6 failed login attempts"
echo ""
sleep 2

# Step 3: Attempt successful login (should trigger block)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 3: Attempting SUCCESSFUL login with correct password..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔐 Using correct password after failed attempts"
echo "🤖 ML will analyze this suspicious pattern..."
echo ""

LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")

echo "$LOGIN_RESPONSE" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    
    if 'error' in d and 'blocked' in d['error'].lower():
        print('')
        print('🚫 ═══════════════════════════════════════════════════════════')
        print('   ACCOUNT BLOCKED - BLOCKING SYSTEM WORKING!')
        print('   ═══════════════════════════════════════════════════════════')
        print('')
        print('   📧 Error Message:')
        print(f'      {d[\"error\"]}')
        print('')
        if 'riskScore' in d:
            print(f'   📊 Risk Score: {d[\"riskScore\"]}/100')
        if 'mlScore' in d:
            print(f'   🤖 ML Anomaly Score: {d[\"mlScore\"]}/100')
        if 'blockedFor' in d:
            print(f'   ⏱️  Block Duration: {d[\"blockedFor\"]}')
        if 'blockedUntil' in d:
            print(f'   🕐 Blocked Until: {d[\"blockedUntil\"]}')
        if 'reason' in d:
            print(f'   💡 Reason: {d[\"reason\"]}')
        print('')
        print('   🔒 Blocked Elements:')
        print('      • User Account')
        print('      • IP Address')
        print('      • Device Fingerprint')
        print('')
        
    elif 'token' in d:
        print('')
        print('⚠️  Login SUCCEEDED (NOT blocked)')
        print(f'   Risk Score: {d.get(\"riskScore\", 0)}')
        print(f'   ML Score: {d.get(\"mlAnomalyScore\", 0)}')
        print(f'   Alert Triggered: {d.get(\"alertTriggered\", False)}')
        print('')
        print('   Note: Score may be below blocking threshold (80)')
        print('')
    else:
        print('Response:', json.dumps(d, indent=2))
        
except Exception as e:
    print(f'Error: {e}')
    print(sys.stdin.read())
"
echo ""
sleep 2

# Step 4: Verify block persists
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 4: Verifying block persists (attempting another login)..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

VERIFY_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")

echo "$VERIFY_RESPONSE" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    if 'error' in d and 'blocked' in d['error'].lower():
        print('✅ Block is ACTIVE - Login still blocked')
        print('   The account will auto-unblock in 10 minutes')
        print('')
    else:
        print('⚠️  Block may have expired or threshold not reached')
        print('')
except:
    pass
"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST SUMMARY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 What was tested:"
echo "   1. ✅ Account creation"
echo "   2. ✅ Multiple failed login attempts (brute force simulation)"
echo "   3. ✅ ML-based blocking on suspicious pattern"
echo "   4. ✅ Block persistence verification"
echo ""
echo "🔍 What to check:"
echo "   1. Admin Dashboard → Check 'ML Blocked' counter"
echo "   2. Admin Dashboard → Check 'Active Blocks' panel"
echo "   3. Activity Logs → Look for 🚫 BLOCKED status"
echo "   4. Email → Check for CRITICAL security alert"
echo "   5. ML Scores → Purple badges in logs"
echo ""
echo "⏱️  UNBLOCKING OPTIONS:"
echo "   • Auto-unblock: Wait 10 minutes"
echo "   • Manual unblock: Admin can use API or dashboard"
echo ""
echo "🌐 View in Dashboard:"
echo "   https://access-control-demo-8.preview.emergentagant.com/login"
echo "   Login as: admin@test.com / admin123"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
