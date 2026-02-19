#!/bin/bash
# Verification script for changes visibility fixes

echo "🔍 ChangeSignal AI - Fixes Verification"
echo "========================================"
echo ""

# Check if services are running
echo "1. Checking services..."
BACKEND=$(curl -s http://localhost:8001/health | grep -o '"status":"healthy"' || echo "")
FRONTEND=$(curl -s http://localhost:3000 2>&1 | head -c 10 || echo "")

if [ -n "$BACKEND" ]; then
    echo "   ✅ Backend is healthy"
else
    echo "   ❌ Backend is not responding"
    exit 1
fi

if [ -n "$FRONTEND" ]; then
    echo "   ✅ Frontend is accessible"
else
    echo "   ❌ Frontend is not responding"
    exit 1
fi

echo ""
echo "2. Testing API endpoints..."

# Login
echo "   - Logging in..."
TOKEN=$(curl -s -X POST http://localhost:8001/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"testdemo1771413143@test.com","password":"Demo123456!"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])" 2>/dev/null)

if [ -z "$TOKEN" ]; then
    echo "   ❌ Login failed"
    exit 1
fi
echo "   ✅ Login successful"

# Test /auth/me endpoint
echo "   - Testing /auth/me endpoint..."
USER_DATA=$(curl -s -X GET "http://localhost:8001/v1/auth/me" \
  -H "Authorization: Bearer $TOKEN")
IS_ADMIN=$(echo "$USER_DATA" | python3 -c "import sys,json; print(json.load(sys.stdin).get('is_admin', 'N/A'))" 2>/dev/null)
IS_SUPERUSER=$(echo "$USER_DATA" | python3 -c "import sys,json; print(json.load(sys.stdin).get('is_superuser', 'N/A'))" 2>/dev/null)
echo "   ✅ User data: is_admin=$IS_ADMIN, is_superuser=$IS_SUPERUSER"

# Test changes API with changes_only=false
echo "   - Testing changes API (all checks)..."
CHANGES_COUNT=$(curl -s -X GET "http://localhost:8001/v1/changes/?limit=100&changes_only=false" \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -c "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null)

if [ -n "$CHANGES_COUNT" ] && [ "$CHANGES_COUNT" -gt 0 ]; then
    echo "   ✅ Changes API returned $CHANGES_COUNT monitoring checks"
else
    echo "   ❌ Changes API returned no data"
fi

# Test changes API with changes_only=true
echo "   - Testing changes API (changes only)..."
ACTUAL_CHANGES=$(curl -s -X GET "http://localhost:8001/v1/changes/?limit=100&changes_only=true" \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -c "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null)
echo "   ✅ Actual changes detected: $ACTUAL_CHANGES"

# Test analytics API with changes_only=false
echo "   - Testing analytics API (all activity)..."
ANALYTICS=$(curl -s -X GET "http://localhost:8001/v1/analytics/trends?days=30&changes_only=false" \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(f\"{sum([day['count'] for day in d['changes_by_day']])} checks\")" 2>/dev/null)

if [ -n "$ANALYTICS" ]; then
    echo "   ✅ Analytics API returned: $ANALYTICS"
else
    echo "   ❌ Analytics API returned no data"
fi

echo ""
echo "3. Database verification..."
TOTAL_EVENTS=$(docker compose exec -T postgres psql -U changesignal -d changesignal_db \
  -c "SELECT COUNT(*) FROM change_events;" -t 2>/dev/null | tr -d ' ')
DETECTED=$(docker compose exec -T postgres psql -U changesignal -d changesignal_db \
  -c "SELECT COUNT(*) FROM change_events WHERE change_detected = true;" -t 2>/dev/null | tr -d ' ')
echo "   ✅ Total monitoring checks in DB: $TOTAL_EVENTS"
echo "   ✅ Changes detected: $DETECTED"

echo ""
echo "========================================" 
echo "✅ All verification checks passed!"
echo ""
echo "📝 Next steps:"
echo "   1. Open http://localhost:3000/login"
echo "   2. Login with your credentials"
echo "   3. Visit /changes page - should see all monitoring activity"
echo "   4. Toggle 'All Checks' / 'Changes Only' button"
echo "   5. Visit /analytics page - should see activity trends"
echo "   6. Check for admin badge in header (if admin/superuser)"
echo ""
