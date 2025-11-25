#!/usr/bin/env tsx
/**
 * Simple Load Testing Script
 * Tests API endpoints under load
 * 
 * Usage: npm run load-test [url] [concurrent] [duration]
 * Example: npm run load-test https://your-app.vercel.app 10 30
 */

const url = process.argv[2] || process.env.PRODUCTION_URL || 'http://localhost:3000'
const concurrent = parseInt(process.argv[3] || '5', 10)
const durationSeconds = parseInt(process.argv[4] || '30', 10)

interface TestResult {
  success: boolean
  statusCode: number
  responseTime: number
  error?: string
}

async function makeRequest(endpoint: string): Promise<TestResult> {
  const startTime = Date.now()
  try {
    const response = await fetch(`${url}${endpoint}`, {
      method: 'GET',
      headers: {
        'User-Agent': 'Madrasah-OS-LoadTest/1.0',
      },
    })
    const responseTime = Date.now() - startTime
    
    return {
      success: response.ok,
      statusCode: response.status,
      responseTime,
    }
  } catch (error: unknown) {
    const responseTime = Date.now() - startTime
    const message = error instanceof Error ? error.message : 'Unknown error'
    return {
      success: false,
      statusCode: 0,
      responseTime,
      error: message,
    }
  }
}

async function runLoadTest() {
  console.log('🚀 Starting Load Test\n')
  console.log(`Target: ${url}`)
  console.log(`Concurrent requests: ${concurrent}`)
  console.log(`Duration: ${durationSeconds} seconds\n`)
  console.log('='.repeat(50) + '\n')

  const endpoints = [
    '/api/health',
    '/api/dashboard/stats',
  ]

  const results: TestResult[] = []
  const startTime = Date.now()
  const endTime = startTime + (durationSeconds * 1000)

  // Run load test
  const promises: Promise<void>[] = []

  for (let i = 0; i < concurrent; i++) {
    promises.push(
      (async () => {
        while (Date.now() < endTime) {
          for (const endpoint of endpoints) {
            const result = await makeRequest(endpoint)
            results.push(result)
            // Small delay to avoid overwhelming
            await new Promise(resolve => setTimeout(resolve, 100))
          }
        }
      })()
    )
  }

  await Promise.all(promises)

  // Analyze results
  const totalRequests = results.length
  const successfulRequests = results.filter(r => r.success).length
  const failedRequests = totalRequests - successfulRequests
  const successRate = (successfulRequests / totalRequests) * 100

  const responseTimes = results.map(r => r.responseTime)
  const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
  const minResponseTime = Math.min(...responseTimes)
  const maxResponseTime = Math.max(...responseTimes)
  
  // Calculate percentiles
  const sortedTimes = [...responseTimes].sort((a, b) => a - b)
  const p50 = sortedTimes[Math.floor(sortedTimes.length * 0.5)]
  const p95 = sortedTimes[Math.floor(sortedTimes.length * 0.95)]
  const p99 = sortedTimes[Math.floor(sortedTimes.length * 0.99)]

  const statusCodes = results.reduce((acc, r) => {
    acc[r.statusCode] = (acc[r.statusCode] || 0) + 1
    return acc
  }, {} as Record<number, number>)

  // Print results
  console.log('📊 Load Test Results\n')
  console.log('='.repeat(50))
  console.log(`Total Requests: ${totalRequests}`)
  console.log(`Successful: ${successfulRequests} (${successRate.toFixed(2)}%)`)
  console.log(`Failed: ${failedRequests} (${(100 - successRate).toFixed(2)}%)`)
  console.log()
  console.log('Response Times:')
  console.log(`  Average: ${avgResponseTime.toFixed(2)}ms`)
  console.log(`  Min: ${minResponseTime}ms`)
  console.log(`  Max: ${maxResponseTime}ms`)
  console.log(`  p50: ${p50}ms`)
  console.log(`  p95: ${p95}ms`)
  console.log(`  p99: ${p99}ms`)
  console.log()
  console.log('Status Codes:')
  Object.entries(statusCodes).forEach(([code, count]) => {
    console.log(`  ${code}: ${count}`)
  })
  console.log()

  // Recommendations
  console.log('💡 Recommendations:')
  if (successRate < 95) {
    console.log('  ⚠️  Success rate is below 95% - investigate failures')
  }
  if (p95 > 2000) {
    console.log('  ⚠️  p95 response time is above 2s - optimize slow endpoints')
  }
  if (p99 > 5000) {
    console.log('  ⚠️  p99 response time is above 5s - investigate slow requests')
  }
  if (avgResponseTime < 500 && successRate >= 95) {
    console.log('  ✅ Performance looks good!')
  }

  console.log()
  console.log('='.repeat(50))

  // Exit with error if failure rate is too high
  if (successRate < 90) {
    console.log('\n❌ Load test failed - too many errors')
    process.exit(1)
  } else if (successRate < 95) {
    console.log('\n⚠️  Load test passed with warnings')
    process.exit(0)
  } else {
    console.log('\n✅ Load test passed!')
    process.exit(0)
  }
}

runLoadTest().catch((error) => {
  console.error('Unexpected error:', error)
  process.exit(1)
})

