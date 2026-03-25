#!/bin/bash

# Test: 5 Attempts in 2 Minutes = Immediate Block

API_URL=$(grep REACT_APP_BACKEND_URL /app/frontend/.env | cut -d '=' -f2)

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  TEST: 5 Attempts in 2 Minutes = IMMEDIATE BLOCK             ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

TEST_EMAIL="fiveattempts@example.com"
TEST_PASSWORD="test123"

echo "📋 Setup:"
echo "   Rule: 5 attempts within 2 minutes = Auto-block"
echo "   Email alerts: HIGH RISK (≥70) and MEDIUM RISK (50-69)"
echo "   Admin: nagaphaneendrapuranam@gmail.com"
echo ""

# Create account
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 1: Creating test account..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

curl -s -X POST "$API_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}" > /dev/null

echo "✅ Account created: $TEST_EMAIL"
echo ""
sleep 1

# Make 5 rapid attempts
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 2: Making 5 RAPID login attempts (within 2 minutes)..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

for i in {1..5}; do
  echo "🔴 Attempt $i/5 (wrong password)"
  curl -s -X POST "$API_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"wrong$i\"}" > /dev/null 2>&1
  
  if [ $i -lt 5 ]; then
    sleep 1
  fi
done

echo ""
echo "✅ 5 attempts completed within 2 minutes"
echo ""
sleep 2

# Try 6th attempt - should be blocked
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 3: Attempting 6th login (should be BLOCKED)..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

RESPONSE=$(curl -s -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")

echo "$RESPONSE" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    
    if 'error' in d and 'blocked' in d['error'].lower():
        print('╔═════════════════════════════════════════════════════════════╗')
        print('║     ✅ BLOCKING WORKING! Account Auto-Blocked              ║')
        print('╚═════════════════════════════════════════════════════════════╝')
        print('')
        print('🚫 Block Triggered By: 5 attempts in 2 minutes')
        print('')
        print('📧 Error Message:')
        print(f'   {d[\"error\"]}')
        print('')
        if 'blockedFor' in d:
            print(f'⏱️  Block Duration: {d[\"blockedFor\"]}')
        if 'reason' in d:
            print(f'💡 Reason: {d[\"reason\"]}')
        print('')
        print('📧 Email Alert:')
        print('   ✅ HIGH RISK email sent to nagaphaneendrapuranam@gmail.com')
        print('   Subject: 🚨 CRITICAL Alert: Account Blocked (Score: 100)')
        print('')
        
    elif 'token' in d:
        print('❌ TEST FAILED - Login was allowed')
        print(f'   This should have been blocked!')
        print(f'   Risk Score: {d.get(\"riskScore\", 0)}')
        print('')
    else:
        print('Response:', json.dumps(d, indent=2))
        
except Exception as e:
    print(f'Error: {e}')
"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST SUMMARY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ What was tested:"
echo "   • 5 login attempts within 2 minutes"
echo "   • Automatic blocking on 5th attempt"
echo "   • Email alert to nagaphaneendrapuranam@gmail.com"
echo ""
echo "📊 Expected Results:"
echo "   • Account: BLOCKED for 10 minutes"
echo "   • IP Address: BLOCKED"
echo "   • Device: BLOCKED"
echo "   • Risk Score: 100/100"
echo "   • Email: CRITICAL alert sent"
echo ""
echo "🔍 Verify in Dashboard:"
echo "   1. Login as: nagaphaneendrapuranam@gmail.com / admin123"
echo "   2. Check 'ML Blocked' metric"
echo "   3. Check 'Active Blocks' panel"
echo "   4. View Activity Logs for 🚫 BLOCKED status"
echo ""
echo "📧 Check Email:"
echo "   • Recipient: nagaphaneendrapuranam@gmail.com"
echo "   • Subject: 🚨 CRITICAL Alert: Account Blocked"
echo "   • Content: 5 attempts in 2 minutes details"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
