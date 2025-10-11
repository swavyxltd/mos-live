#!/bin/bash

echo "🎭 Setting up Madrasah OS Demo Mode..."

# Create demo environment
cat > .env.local << EOF
# Demo environment - for testing without real services
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=demo-secret-key-for-development-only
APP_BASE_URL=http://localhost:3000

# Database - use a local PostgreSQL or SQLite for demo
DATABASE_URL="postgresql://demo:demo@localhost:5432/madrasah_demo?sslmode=disable"

# OAuth - demo values (won't work but won't crash)
GOOGLE_CLIENT_ID=demo-google-client-id
GOOGLE_CLIENT_SECRET=demo-google-client-secret

# Stripe - demo values (won't work but won't crash)
STRIPE_SECRET_KEY=sk_test_demo_key
STRIPE_PRICE_ID=price_demo_id
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_demo_key
STRIPE_WEBHOOK_SECRET=whsec_demo_secret

# Supabase - demo values (won't work but won't crash)
SUPABASE_URL=https://demo.supabase.co
SUPABASE_ANON_KEY=demo-anon-key
SUPABASE_SERVICE_ROLE_KEY=demo-service-role-key

# Resend - demo values (won't work but won't crash)
RESEND_API_KEY=re_demo_key
RESEND_FROM=Madrasah OS <noreply@madrasah.io>

# WhatsApp/Meta - demo values (won't work but won't crash)
META_APP_ID=demo_app_id
META_APP_SECRET=demo_app_secret
META_GRAPH_VERSION=v18.0
META_GRAPH_BASE=https://graph.facebook.com
WHATSAPP_EMBEDDED_REDIRECT_URL=http://localhost:3000/integrations/whatsapp/callback
WHATSAPP_VERIFY_TOKEN=demo_verify_token
EOF

echo "✅ Created demo .env.local"

# Install dependencies if not already installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install --legacy-peer-deps
fi

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

echo "🎉 Demo setup complete!"
echo ""
echo "To start the demo:"
echo "1. Set up a PostgreSQL database named 'madrasah_demo'"
echo "2. Run: npx prisma db push"
echo "3. Run: npm run db:seed"
echo "4. Run: npm run dev"
echo ""
echo "Then visit:"
echo "- Staff Portal: http://localhost:3000?portal=app"
echo "- Parent Portal: http://localhost:3000?portal=parent"
echo ""
echo "Demo accounts (after seeding):"
echo "- Owner: owner@demo.com (password: demo123)"
echo "- Admin: admin@demo.com (password: demo123)"
echo "- Staff: staff@demo.com (password: demo123)"
echo "- Parent: parent@demo.com (password: demo123)"
