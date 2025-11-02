#!/bin/bash

# Script to setup owner account via API endpoint
# This works around local database connection issues

echo "🔧 Setting up owner account via API..."

# Get the deployment URL from .env or use the preview URL
DEPLOYMENT_URL=$(grep -E "^NEXTAUTH_URL=" .env 2>/dev/null | cut -d'=' -f2 | tr -d '"' | tr -d "'" | sed 's|/$||')
if [ -z "$DEPLOYMENT_URL" ]; then
  echo "❌ NEXTAUTH_URL not found in .env file"
  echo "Please set it to your Vercel deployment URL"
  exit 1
fi

# Get the setup secret (or use default)
SETUP_SECRET=${SETUP_SECRET:-"setup-secret-key-change-in-production"}

# Get owner email from argument or use default
OWNER_EMAIL=${1:-"swavyxltd@gmail.com"}

echo "📧 Using deployment URL: $DEPLOYMENT_URL"
echo "📧 Owner email: $OWNER_EMAIL"
echo ""

# Make the API call
RESPONSE=$(curl -s -X POST "${DEPLOYMENT_URL}/api/setup/owner" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${SETUP_SECRET}" \
  -d "{\"email\": \"${OWNER_EMAIL}\"}")

if echo "$RESPONSE" | grep -q '"success":true'; then
  echo "✅ Owner account created/updated successfully!"
  echo ""
  echo "📝 Login Instructions:"
  echo "   Email: ${OWNER_EMAIL}"
  echo "   Password: demo123"
  echo "   URL: ${DEPLOYMENT_URL}/auth/signin"
else
  echo "❌ Failed to setup owner account"
  echo "Response: $RESPONSE"
  exit 1
fi
