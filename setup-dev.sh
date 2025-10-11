#!/bin/bash

echo "🚀 Setting up Madrasah OS for development..."

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "📝 Creating .env.local from template..."
    cat > .env.local << EOF
# Core
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=dev-secret-key-$(openssl rand -hex 32)
APP_BASE_URL=http://localhost:3000

# Database (update with your PostgreSQL connection string)
DATABASE_URL="postgresql://username:password@localhost:5432/madrasah_os?sslmode=require"

# OAuth (add your Google OAuth credentials)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Stripe (add your Stripe credentials)
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PRICE_ID=price_your_metered_price_id
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Supabase (add your Supabase credentials)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Resend (add your Resend API key)
RESEND_API_KEY=re_your_resend_api_key
RESEND_FROM=Madrasah OS <noreply@madrasah.io>

# WhatsApp/Meta (add your Meta app credentials)
META_APP_ID=your_meta_app_id
META_APP_SECRET=your_meta_app_secret
META_GRAPH_VERSION=v18.0
META_GRAPH_BASE=https://graph.facebook.com
WHATSAPP_EMBEDDED_REDIRECT_URL=http://localhost:3000/integrations/whatsapp/callback
WHATSAPP_VERIFY_TOKEN=your_verify_token

# Optional dev WhatsApp
WHATSAPP_DEV_ACCESS_TOKEN=your_dev_access_token
WHATSAPP_DEV_PHONE_NUMBER_ID=your_dev_phone_number_id
WHATSAPP_DEV_WABA_ID=your_dev_waba_id
EOF
    echo "✅ Created .env.local - please update with your actual credentials"
else
    echo "✅ .env.local already exists"
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install --legacy-peer-deps

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Update .env.local with your actual credentials"
echo "2. Set up your PostgreSQL database"
echo "3. Run: npx prisma db push"
echo "4. Run: npm run db:seed"
echo "5. Run: npm run dev"
echo ""
echo "Demo accounts (after seeding):"
echo "- Owner: owner@demo.com (password: demo123)"
echo "- Admin: admin@demo.com (password: demo123)"
echo "- Staff: staff@demo.com (password: demo123)"
echo "- Parent: parent@demo.com (password: demo123)"
