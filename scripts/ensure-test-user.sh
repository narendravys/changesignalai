#!/bin/bash
# Ensures test user regularuser11959@test.com exists so you can test the UI.
# Password will be: Test1234!
# Usage: ./scripts/ensure-test-user.sh

set -e
API_URL="${NEXT_PUBLIC_API_URL:-http://localhost:8001}"
API_VERSION="${NEXT_PUBLIC_API_VERSION:-v1}"
BASE="$API_URL/$API_VERSION"

echo "Using API: $BASE"
echo ""

# Register new org + user (if email already registered, this will fail - then use your existing password)
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/auth/organization/register" \
  -H "Content-Type: application/json" \
  -d '{
    "org_name": "Test Org",
    "org_slug": "test-org",
    "user_email": "regularuser123456@test.com",
    "user_password": "Test1234!",
    "user_full_name": "Regular Test User"
  }')

HTTP_BODY=$(echo "$RESP" | head -n -1)
HTTP_CODE=$(echo "$RESP" | tail -n 1)

if [ "$HTTP_CODE" = "201" ]; then
  echo "Test user created successfully."
  echo ""
  echo "  Email:    regularuser11959@test.com"
  echo "  Password: Test1234!"
  echo ""
  echo "Open http://localhost:3000/login and sign in with the above."
elif [ "$HTTP_CODE" = "400" ]; then
  if echo "$HTTP_BODY" | grep -q "already registered"; then
    echo "User regularuser11959@test.com already exists."
    echo "Use your existing password to log in at http://localhost:3000/login"
  else
    echo "Request failed: $HTTP_BODY"
    exit 1
  fi
else
  echo "Unexpected response ($HTTP_CODE): $HTTP_BODY"
  exit 1
fi
