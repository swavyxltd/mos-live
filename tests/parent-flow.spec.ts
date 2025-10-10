import { test, expect } from '@playwright/test'

test.describe('Parent Portal Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to parent portal
    await page.goto('/?portal=parent')
  })

  test('should complete full parent workflow', async ({ page }) => {
    // Sign in as parent
    await page.fill('input[type="email"]', 'parent@demo.com')
    await page.fill('input[type="password"]', 'demo123')
    await page.click('button[type="submit"]')
    
    // Should redirect to parent dashboard
    await expect(page).toHaveURL(/parent\/dashboard/)
    await expect(page.locator('h1')).toContainText('Welcome back!')
    
    // Check dashboard stats are visible
    await expect(page.locator('text=Your Children')).toBeVisible()
    await expect(page.locator('text=Enrolled Classes')).toBeVisible()
    
    // Navigate to invoices
    await page.click('a[href="/parent/invoices"]')
    await expect(page).toHaveURL(/parent\/invoices/)
    await expect(page.locator('h1')).toContainText('Invoices')
    
    // Check if invoices are displayed
    await expect(page.locator('text=£50.00')).toBeVisible()
    
    // Navigate to calendar
    await page.click('a[href="/parent/calendar"]')
    await expect(page).toHaveURL(/parent\/calendar/)
    await expect(page.locator('h1')).toContainText('Calendar')
    
    // Navigate to support
    await page.click('a[href="/parent/support"]')
    await expect(page).toHaveURL(/parent\/support/)
    await expect(page.locator('h1')).toContainText('Support')
  })

  test('should handle invoice payment', async ({ page }) => {
    // Sign in as parent
    await page.fill('input[type="email"]', 'parent@demo.com')
    await page.fill('input[type="password"]', 'demo123')
    await page.click('button[type="submit"]')
    
    // Navigate to invoices
    await page.click('a[href="/parent/invoices"]')
    
    // Should show payment interface
    await expect(page.locator('text=Pay Now')).toBeVisible()
  })

  test('should view children information', async ({ page }) => {
    // Sign in as parent
    await page.fill('input[type="email"]', 'parent@demo.com')
    await page.fill('input[type="password"]', 'demo123')
    await page.click('button[type="submit"]')
    
    // Should show children information on dashboard
    await expect(page.locator('text=Hassan Patel')).toBeVisible()
    await expect(page.locator('text=Amina Patel')).toBeVisible()
  })
})
