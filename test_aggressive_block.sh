#!/bin/bash

# Aggressive Blocking Test - Will definitely trigger the block

API_URL=$(grep REACT_APP_BACKEND_URL /app/frontend/.env | cut -d '=' -f2)

echo "🚨 AGGRESSIVE BLOCKING TEST - Will trigger 100% block"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

TEST_EMAIL="aggressivetest@example.com"
TEST_PASSWORD="secure123"

# Create account
echo "Creating test account..."
curl -s -X POST "$API_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}" > /dev/null

echo "✅ Account created"
echo ""
sleep 1

# Aggressive attack: 10 rapid failed attempts
echo "🔴 Launching AGGRESSIVE ATTACK: 10 rapid failed attempts..."
for i in {1..10}; do
  echo "   Attack $i/10"
  curl -s -X POST "$API_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"wrong$i\"}" > /dev/null 2>&1
  sleep 0.3  # Very rapid attempts
done

echo ""
echo "✅ 10 failed attempts completed"
echo "   Risk Score will be extremely high (90-100)"
echo ""
sleep 2

# Now try correct password - should definitely block
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔐 Attempting login with CORRECT password..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

RESPONSE=$(curl -s -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")

echo "$RESPONSE" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    
    if 'error' in d and 'blocked' in d['error'].lower():
        print('╔═══════════════════════════════════════════════════════════╗')
        print('║     🚫 ACCOUNT BLOCKED - SYSTEM WORKING!                 ║')
        print('╚═══════════════════════════════════════════════════════════╝')
        print('')
        print('📧 Block Message:')
        print(f'   {d[\"error\"]}')
        print('')
        
        if 'riskScore' in d:
            print(f'📊 Risk Score: {d[\"riskScore\"]}/100')
        if 'mlScore' in d:
            print(f'🤖 ML Score: {d[\"mlScore\"]}/100')
        if 'blockedFor' in d:
            print(f'⏱️  Duration: {d[\"blockedFor\"]}')
        print('')
        print('🔒 What was blocked:')
        print('   • User account: $TEST_EMAIL')
        print('   • Your IP address')
        print('   • Your device fingerprint')
        print('')
        print('📧 Email alert sent to: nagaphaneendrapuranam@gmail.com')
        print('')
        
    elif 'token' in d:
        score = d.get('riskScore', 0)
        ml = d.get('mlAnomalyScore', 0)
        print(f'⚠️  Login succeeded but with HIGH RISK!')
        print(f'   Risk Score: {score}')
        print(f'   ML Score: {ml}')
        print(f'   Alert: {d.get(\"alertTriggered\", False)}')
        print('')
        if score >= 70:
            print('   📧 Email alert should be sent')
        print('')
    else:
        print('Response:', json.dumps(d, indent=2))
        
except Exception as e:
    print(f'Error parsing: {e}')
"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 HOW TO VERIFY:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. Check Admin Dashboard:"
echo "   → 'ML Blocked' metric should increase"
echo "   → 'Active Blocks' panel should show blocks"
echo ""
echo "2. Check Activity Logs:"
echo "   → Look for 🚫 BLOCKED status"
echo "   → Check ML Score column (purple badge)"
echo ""
echo "3. Check Email:"
echo "   → CRITICAL alert sent to nagaphaneendrapuranam@gmail.com"
echo ""
echo "4. Try logging in again:"
echo "   → Should remain blocked for 10 minutes"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
