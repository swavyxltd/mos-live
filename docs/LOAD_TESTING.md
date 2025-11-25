# Load Testing Guide

This guide covers load testing strategies for Madrasah OS to ensure your application can handle expected traffic.

## Overview

Load testing helps you:
- Identify performance bottlenecks
- Determine capacity limits
- Verify system stability under load
- Plan for scaling

---

## Quick Load Test

Use the built-in load test script:

```bash
# Basic usage
npm run load-test

# Custom parameters
npm run load-test https://your-app.vercel.app 10 60
# Arguments: [url] [concurrent requests] [duration in seconds]
```

**Example:**
```bash
# Test with 10 concurrent users for 30 seconds
npm run load-test https://app.madrasah.io 10 30
```

---

## Load Testing Tools

### Option 1: Built-in Script (Simple)

**Pros:**
- No additional setup
- Quick results
- Good for basic testing

**Cons:**
- Limited features
- Single machine only

**Usage:**
```bash
npm run load-test [url] [concurrent] [duration]
```

### Option 2: k6 (Recommended)

**Installation:**
```bash
# macOS
brew install k6

# Or download from https://k6.io/docs/getting-started/installation/
```

**Example Script:**
```javascript
// load-test.js
import http from 'k6/http'
import { check, sleep } from 'k6'

export const options = {
  stages: [
    { duration: '30s', target: 10 },  // Ramp up to 10 users
    { duration: '1m', target: 10 },    // Stay at 10 users
    { duration: '30s', target: 20 },  // Ramp up to 20 users
    { duration: '1m', target: 20 },   // Stay at 20 users
    { duration: '30s', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests < 2s
    http_req_failed: ['rate<0.05'],    // Error rate < 5%
  },
}

export default function () {
  // Test health endpoint
  const healthRes = http.get('https://your-app.vercel.app/api/health')
  check(healthRes, {
    'health status is 200': (r) => r.status === 200,
  })

  sleep(1)

  // Test dashboard (would need authentication in real scenario)
  // const dashboardRes = http.get('https://your-app.vercel.app/api/dashboard/stats')
  // check(dashboardRes, {
  //   'dashboard status is 200': (r) => r.status === 200,
  // })

  sleep(1)
}
```

**Run:**
```bash
k6 run load-test.js
```

### Option 3: Apache Bench (ab)

**Installation:**
```bash
# macOS (pre-installed)
# Linux: sudo apt-get install apache2-utils
```

**Usage:**
```bash
# 100 requests, 10 concurrent
ab -n 100 -c 10 https://your-app.vercel.app/api/health
```

### Option 4: Artillery

**Installation:**
```bash
npm install -g artillery
```

**Example Config:**
```yaml
# artillery-config.yml
config:
  target: 'https://your-app.vercel.app'
  phases:
    - duration: 60
      arrivalRate: 5
      name: "Warm up"
    - duration: 120
      arrivalRate: 10
      name: "Ramp up"
    - duration: 300
      arrivalRate: 10
      name: "Sustained load"
scenarios:
  - name: "Health check"
    flow:
      - get:
          url: "/api/health"
```

**Run:**
```bash
artillery run artillery-config.yml
```

---

## What to Test

### Critical Endpoints

1. **Health Check**
   - `/api/health`
   - Should be fast (< 100ms)

2. **Dashboard Stats**
   - `/api/dashboard/stats`
   - May be slower due to database queries

3. **Student List**
   - `/api/students`
   - Test with pagination

4. **Invoice Generation**
   - `/api/invoices/generate-monthly`
   - Test with realistic data volumes

### User Flows

1. **Login Flow**
   - POST `/api/auth/signin`
   - Test with rate limiting

2. **Payment Processing**
   - POST `/api/payments/stripe/pay-now`
   - Test with Stripe test mode

3. **Attendance Marking**
   - POST `/api/attendance/bulk`
   - Test with multiple classes

---

## Load Testing Scenarios

### Scenario 1: Normal Load

**Goal:** Test typical usage

**Configuration:**
- 10-20 concurrent users
- 5-10 requests per second
- Duration: 5-10 minutes

**Expected:**
- Success rate: > 99%
- p95 response time: < 1s
- No errors

### Scenario 2: Peak Load

**Goal:** Test during peak hours

**Configuration:**
- 50-100 concurrent users
- 20-50 requests per second
- Duration: 10-15 minutes

**Expected:**
- Success rate: > 95%
- p95 response time: < 2s
- Minimal errors

### Scenario 3: Stress Test

**Goal:** Find breaking point

**Configuration:**
- Gradually increase load
- Start at 10 users, ramp to 200+
- Monitor until failure

**Expected:**
- Identify max capacity
- Find bottlenecks
- Plan scaling strategy

### Scenario 4: Spike Test

**Goal:** Test sudden traffic spikes

**Configuration:**
- Sudden jump from 10 to 100 users
- Hold for 2 minutes
- Return to normal

**Expected:**
- System recovers gracefully
- No data loss
- Performance returns to normal

---

## Performance Targets

### Response Times

- **Health Check**: < 100ms (p95)
- **API Endpoints**: < 500ms (p95)
- **Dashboard**: < 1s (p95)
- **Database Queries**: < 200ms (p95)

### Success Rates

- **Normal Load**: > 99%
- **Peak Load**: > 95%
- **Stress Test**: Document failure point

### Error Rates

- **Normal Load**: < 0.1%
- **Peak Load**: < 1%
- **Stress Test**: Document threshold

---

## Monitoring During Load Tests

### Vercel Dashboard

Monitor:
- Function execution times
- Error rates
- Request counts
- Memory usage

### Database Metrics

Monitor:
- Connection pool usage
- Query performance
- Slow query logs
- Connection errors

### Application Metrics

Monitor:
- Response times
- Error rates
- Success rates
- Resource usage

---

## Interpreting Results

### Good Results

✅ Success rate > 99%  
✅ p95 response time < 1s  
✅ No memory leaks  
✅ Stable error rate  
✅ Database connections stable

### Warning Signs

⚠️ Success rate 95-99%  
⚠️ p95 response time 1-2s  
⚠️ Increasing response times  
⚠️ Occasional timeouts

### Critical Issues

❌ Success rate < 95%  
❌ p95 response time > 2s  
❌ High error rate  
❌ Database connection failures  
❌ Memory leaks

---

## Optimization Strategies

### If Response Times Are High

1. **Database Optimization**
   - Add indexes
   - Optimize queries
   - Use connection pooling

2. **Caching**
   - Cache API responses
   - Cache database queries
   - Use CDN for static assets

3. **Code Optimization**
   - Optimize loops
   - Reduce database calls
   - Use pagination

### If Error Rates Are High

1. **Rate Limiting**
   - Adjust rate limits
   - Implement backoff
   - Add retry logic

2. **Resource Limits**
   - Increase function memory
   - Scale database
   - Add more instances

3. **Error Handling**
   - Improve error messages
   - Add retry logic
   - Handle edge cases

---

## Load Testing Checklist

### Before Testing

- [ ] Set up monitoring
- [ ] Configure test environment
- [ ] Prepare test data
- [ ] Notify team (if production-like)
- [ ] Set up alerts

### During Testing

- [ ] Monitor error rates
- [ ] Watch response times
- [ ] Check database performance
- [ ] Monitor resource usage
- [ ] Document issues

### After Testing

- [ ] Analyze results
- [ ] Identify bottlenecks
- [ ] Create optimization plan
- [ ] Document findings
- [ ] Plan retest

---

## Continuous Load Testing

### Schedule Regular Tests

- **Weekly**: Normal load test
- **Monthly**: Peak load test
- **Quarterly**: Stress test
- **Before major releases**: Full test suite

### Automated Testing

Set up CI/CD pipeline:
```yaml
# .github/workflows/load-test.yml
name: Load Test
on:
  schedule:
    - cron: '0 2 * * 0'  # Weekly on Sunday
jobs:
  load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run load test
        run: npm run load-test
```

---

## Best Practices

1. **Start Small**: Begin with low load, gradually increase
2. **Test Realistic Scenarios**: Use actual user flows
3. **Monitor Everything**: Watch all metrics
4. **Document Results**: Keep records for comparison
5. **Test Regularly**: Don't wait for issues
6. **Use Production-Like Data**: Realistic test data
7. **Test During Off-Peak**: Avoid impacting users
8. **Have Rollback Plan**: Be ready to stop tests

---

## Tools Comparison

| Tool | Setup | Features | Best For |
|------|-------|----------|----------|
| Built-in Script | Easy | Basic | Quick tests |
| k6 | Medium | Advanced | Comprehensive testing |
| Apache Bench | Easy | Basic | Simple load tests |
| Artillery | Medium | Advanced | Complex scenarios |

---

## Support

- **k6 Docs**: https://k6.io/docs/
- **Artillery Docs**: https://www.artillery.io/docs
- **Vercel Analytics**: Monitor in Vercel Dashboard

---

**Last Updated**: 2025-11-25

