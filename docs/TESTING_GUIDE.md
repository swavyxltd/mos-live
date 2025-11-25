# Testing Guide

This guide covers testing strategies and procedures for Madrasah OS.

## Table of Contents
1. [Test Types](#test-types)
2. [Running Tests](#running-tests)
3. [Manual Testing Checklist](#manual-testing-checklist)
4. [End-to-End Testing](#end-to-end-testing)
5. [API Testing](#api-testing)
6. [Performance Testing](#performance-testing)

---

## Test Types

### Unit Tests
Test individual functions and components in isolation.

**Location**: `__tests__/` or `*.test.ts`

**Example**:
```typescript
// __tests__/lib/utils.test.ts
import { formatCurrency } from '@/lib/utils'

describe('formatCurrency', () => {
  it('formats GBP correctly', () => {
    expect(formatCurrency(5000, 'GBP')).toBe('£50.00')
  })
})
```

### Integration Tests
Test how different parts work together.

**Example**: Test API route with database interaction.

### End-to-End Tests
Test complete user flows using Playwright.

**Location**: `tests/` (Playwright tests)

---

## Running Tests

### Playwright Tests

```bash
# Run all tests
npm test

# Run with UI
npm run test:ui

# Run smoke tests only
npm run test:clickall

# Run specific test file
npx playwright test tests/student-management.spec.ts

# Run in headed mode
npx playwright test --headed
```

### Test Configuration

Playwright config: `playwright.config.ts`

---

## Manual Testing Checklist

### Authentication & Authorization

- [ ] **Login**
  - [ ] Valid credentials work
  - [ ] Invalid credentials show error
  - [ ] Account lockout after 5 failed attempts
  - [ ] 2FA flow works (if enabled)
  - [ ] Session persists after page refresh
  - [ ] Logout works

- [ ] **Password Reset**
  - [ ] Reset email is sent
  - [ ] Reset link works
  - [ ] New password is accepted
  - [ ] Old password no longer works

- [ ] **Role-Based Access**
  - [ ] Owner can access owner portal
  - [ ] Admin can access admin features
  - [ ] Staff can access staff features
  - [ ] Parent can only access parent portal
  - [ ] Unauthorized access is blocked

### Student Management

- [ ] **Create Student**
  - [ ] Form validation works
  - [ ] Student is created successfully
  - [ ] Parent account is created/linked
  - [ ] Student appears in class list

- [ ] **Edit Student**
  - [ ] Changes are saved
  - [ ] Changes reflect immediately
  - [ ] Validation prevents invalid data

- [ ] **Archive Student**
  - [ ] Student is archived
  - [ ] Archived student doesn't appear in active list
  - [ ] Can restore archived student

- [ ] **CSV Import**
  - [ ] Valid CSV imports successfully
  - [ ] Invalid CSV shows errors
  - [ ] Duplicate emails are handled
  - [ ] Import summary is shown

### Class Management

- [ ] **Create Class**
  - [ ] Class is created
  - [ ] Schedule is saved correctly
  - [ ] Teacher assignment works

- [ ] **Edit Class**
  - [ ] Changes are saved
  - [ ] Schedule updates work

- [ ] **Enroll Students**
  - [ ] Students can be enrolled
  - [ ] Enrollment appears in class
  - [ ] Duplicate enrollment is prevented

### Attendance

- [ ] **Mark Attendance**
  - [ ] Bulk attendance works
  - [ ] Individual status changes work
  - [ ] Attendance is saved
  - [ ] Attendance rate updates

- [ ] **View Attendance**
  - [ ] Attendance history displays
  - [ ] Filters work (date, class, student)
  - [ ] Export works

### Invoices & Payments

- [ ] **Generate Invoices**
  - [ ] Monthly invoices generate correctly
  - [ ] Amounts are correct
  - [ ] Due dates are set

- [ ] **View Invoices**
  - [ ] Invoice list displays
  - [ ] Filters work
  - [ ] Invoice details are correct

- [ ] **Card Payment**
  - [ ] Stripe Elements loads
  - [ ] Payment succeeds
  - [ ] Invoice status updates
  - [ ] Payment record is created
  - [ ] Email confirmation is sent

- [ ] **Cash Payment**
  - [ ] Cash payment can be recorded
  - [ ] Invoice status updates
  - [ ] Payment record is created

- [ ] **Autopay**
  - [ ] Autopay can be enabled
  - [ ] Payment method is saved
  - [ ] Autopay processes correctly

### Applications

- [ ] **Submit Application**
  - [ ] Form validation works
  - [ ] Application is submitted
  - [ ] Confirmation email is sent

- [ ] **Review Application**
  - [ ] Application details display
  - [ ] Status can be updated
  - [ ] Admin notes can be added

- [ ] **Accept Application**
  - [ ] Student is created
  - [ ] Parent account is created
  - [ ] Welcome email is sent
  - [ ] Dashboard updates

### Messages

- [ ] **Send Message**
  - [ ] Email messages are sent
  - [ ] WhatsApp messages are sent (if configured)
  - [ ] Message history is saved
  - [ ] Delivery status is tracked

### Calendar

- [ ] **View Calendar**
  - [ ] Events display correctly
  - [ ] Filters work
  - [ ] ICS export works

### Support

- [ ] **Create Ticket**
  - [ ] Ticket is created
  - [ ] Confirmation is shown
  - [ ] Email notification is sent

- [ ] **View Tickets**
  - [ ] Ticket list displays
  - [ ] Filters work
  - [ ] Ticket details are correct

---

## End-to-End Testing

### Critical User Flows

#### Flow 1: Student Enrollment
1. Admin logs in
2. Creates new student
3. Assigns to class
4. Verifies student appears in class list

#### Flow 2: Payment Processing
1. Parent logs in
2. Views invoice
3. Enters payment details
4. Completes payment
5. Verifies invoice is marked paid

#### Flow 3: Application to Enrollment
1. Parent submits application
2. Admin reviews application
3. Admin accepts application
4. Student is created
5. Parent receives welcome email

#### Flow 4: Attendance Tracking
1. Staff marks attendance
2. Attendance is saved
3. Dashboard updates with new rate
4. Parent can view attendance

### Playwright Test Examples

```typescript
// tests/student-enrollment.spec.ts
import { test, expect } from '@playwright/test'

test('student enrollment flow', async ({ page }) => {
  // Login
  await page.goto('/?portal=app')
  await page.fill('[name="email"]', 'admin@demo.com')
  await page.fill('[name="password"]', 'demo123')
  await page.click('button[type="submit"]')

  // Navigate to students
  await page.click('text=Students')
  await page.click('text=Add Student')

  // Fill form
  await page.fill('[name="firstName"]', 'Test')
  await page.fill('[name="lastName"]', 'Student')
  // ... fill other fields

  // Submit
  await page.click('button[type="submit"]')

  // Verify
  await expect(page.locator('text=Test Student')).toBeVisible()
})
```

---

## API Testing

### Using curl

```bash
# Test authentication
curl -X POST http://localhost:3000/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@demo.com","password":"demo123"}'

# Test API endpoint (with session cookie)
curl -X GET http://localhost:3000/api/students \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"
```

### Using Postman/Insomnia

1. Import API collection
2. Set environment variables
3. Run test suite

### API Test Checklist

- [ ] All endpoints return correct status codes
- [ ] Authentication is required for protected endpoints
- [ ] Rate limiting works
- [ ] Error responses are formatted correctly
- [ ] Validation errors are clear

---

## Performance Testing

### Load Testing

Use tools like:
- **k6**: Load testing tool
- **Apache Bench (ab)**: Simple load testing
- **Artillery**: Modern load testing

**Example k6 script**:
```javascript
import http from 'k6/http'
import { check } from 'k6'

export const options = {
  vus: 10, // 10 virtual users
  duration: '30s',
}

export default function () {
  const res = http.get('https://your-app.vercel.app/api/students')
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  })
}
```

### Performance Checklist

- [ ] Page load time < 2 seconds
- [ ] API response time < 500ms (p95)
- [ ] Database queries are optimized
- [ ] Images are optimized
- [ ] Bundle size is reasonable

---

## Browser Testing

Test on:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

---

## Accessibility Testing

- [ ] Keyboard navigation works
- [ ] Screen reader compatible
- [ ] Color contrast meets WCAG AA
- [ ] Focus indicators are visible
- [ ] Forms have proper labels

**Tools**:
- WAVE browser extension
- axe DevTools
- Lighthouse accessibility audit

---

## Security Testing

- [ ] SQL injection prevention
- [ ] XSS prevention
- [ ] CSRF protection
- [ ] Authentication bypass attempts fail
- [ ] Rate limiting works
- [ ] Sensitive data is not exposed

---

## Test Data Management

### Using Demo Data

```bash
# Set up demo data
npm run setup:all-demo

# Reset demo data
tsx scripts/reset-demo-data.ts
```

### Test Accounts

- Owner: `owner@demo.com` / `demo123`
- Admin: `admin@demo.com` / `demo123`
- Staff: `staff@demo.com` / `demo123`
- Parent: `parent@demo.com` / `demo123`

---

## Continuous Testing

### Pre-Commit Hooks

Add to `.husky/pre-commit`:
```bash
npm run lint
npm run test
```

### CI/CD Testing

Add to GitHub Actions or Vercel:
```yaml
- name: Run tests
  run: npm test

- name: Run lint
  run: npm run lint
```

---

## Reporting Issues

When reporting test failures:
1. Include test name and error message
2. Include steps to reproduce
3. Include browser/environment info
4. Include screenshots if UI test

---

**Last Updated**: 2025-11-25

