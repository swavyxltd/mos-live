#!/bin/bash

echo "🧪 Running Madrasah OS Test Suite..."

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install --legacy-peer-deps
fi

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Run smoke tests
echo "🔥 Running smoke tests..."
npx playwright test tests/smoke.spec.ts --reporter=html

# Run staff portal tests
echo "👨‍💼 Running staff portal tests..."
npx playwright test tests/staff-flow.spec.ts --reporter=html

# Run parent portal tests
echo "👨‍👩‍👧‍👦 Running parent portal tests..."
npx playwright test tests/parent-flow.spec.ts --reporter=html

# Run owner portal tests
echo "👑 Running owner portal tests..."
npx playwright test tests/owner-flow.spec.ts --reporter=html

# Run API endpoint tests
echo "🔌 Running API endpoint tests..."
npx playwright test tests/api-endpoints.spec.ts --reporter=html

# Run comprehensive test suite
echo "🎯 Running comprehensive test suite..."
npx playwright test tests/run-all.spec.ts --reporter=html

echo "✅ All tests completed!"
echo "📊 Test reports generated in playwright-report/"
echo "🌐 Open playwright-report/index.html to view detailed results"
