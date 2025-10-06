#!/bin/bash

echo "🚀 Deploying Madrasah OS to Production..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Are you in the right directory?"
    exit 1
fi

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "❌ Error: .env.local not found. Please create it with your production environment variables."
    exit 1
fi

# Install dependencies
echo "📦 Installing production dependencies..."
npm ci --legacy-peer-deps

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Run database migrations
echo "🗄️ Running database migrations..."
npx prisma db push

# Seed the database (optional - remove in production)
echo "🌱 Seeding database..."
npm run db:seed

# Build the application
echo "🏗️ Building application..."
npm run build

# Run tests
echo "🧪 Running tests..."
npm run test

# Start the application
echo "🎉 Starting Madrasah OS..."
npm start

echo "✅ Deployment completed successfully!"
echo "🌐 Application is running at: http://localhost:3000"
echo "📊 Staff Portal: http://localhost:3000?portal=app"
echo "👨‍👩‍👧‍👦 Parent Portal: http://localhost:3000?portal=parent"
echo "🔐 Auth Portal: http://localhost:3000?portal=auth"
