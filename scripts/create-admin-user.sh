#!/bin/bash
# Creates an admin user by registering a new organization.
# The first user of each org is created as admin (is_admin + is_superuser).
#
# Usage: ./scripts/create-admin-user.sh

set -e
API_URL="${NEXT_PUBLIC_API_URL:-http://localhost:8001}"
API_VERSION="${NEXT_PUBLIC_API_VERSION:-v1}"
BASE="$API_URL/$API_VERSION"

# Admin user credentials (change if you prefer)
ADMIN_EMAIL="admin@test.com"
ADMIN_PASSWORD="Test1234!"
ORG_NAME="Admin Organization"
ORG_SLUG="admin-org"

echo "Creating admin user..."
echo "  Email:    $ADMIN_EMAIL"
echo "  Password: $ADMIN_PASSWORD"
echo "  Org:      $ORG_NAME"
echo ""

RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/auth/organization/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"org_name\": \"$ORG_NAME\",
    \"org_slug\": \"$ORG_SLUG\",
    \"user_email\": \"$ADMIN_EMAIL\",
    \"user_password\": \"$ADMIN_PASSWORD\",
    \"user_full_name\": \"Admin User\"
  }")

HTTP_BODY=$(echo "$RESP" | head -n -1)
HTTP_CODE=$(echo "$RESP" | tail -n 1)

if [ "$HTTP_CODE" = "201" ]; then
  echo "Admin user created successfully."
  echo ""
  echo "  Login at: http://localhost:3000/login"
  echo "  Email:    $ADMIN_EMAIL"
  echo "  Password: $ADMIN_PASSWORD"
  echo ""
  echo "This user has Admin access (Admin menu in sidebar, user management, etc.)."
elif [ "$HTTP_CODE" = "400" ]; then
  if echo "$HTTP_BODY" | grep -q "already registered"; then
    echo "User $ADMIN_EMAIL already exists."
    echo "Use that account to log in; if it was created via this script, password is: $ADMIN_PASSWORD"
  elif echo "$HTTP_BODY" | grep -q "slug already exists"; then
    echo "Organization slug '$ORG_SLUG' is taken. Edit this script to use a different ORG_SLUG (and email)."
    exit 1
  else
    echo "Request failed: $HTTP_BODY"
    exit 1
  fi
else
  echo "Unexpected response ($HTTP_CODE): $HTTP_BODY"
  exit 1
fi
