import { test, expect } from '@playwright/test'

test.describe('Staff Portal Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to staff portal
    await page.goto('/?portal=app')
  })

  test('should complete full staff workflow', async ({ page }) => {
    // Sign in as admin
    await page.fill('input[type="email"]', 'admin@demo.com')
    await page.fill('input[type="password"]', 'demo123')
    await page.click('button[type="submit"]')
    
    // Should redirect to dashboard
    await expect(page).toHaveURL(/dashboard/)
    await expect(page.locator('h1')).toContainText('Dashboard')
    
    // Check dashboard stats are visible
    await expect(page.locator('text=Total Students')).toBeVisible()
    await expect(page.locator('text=Active Classes')).toBeVisible()
    await expect(page.locator('text=Staff Members')).toBeVisible()
    
    // Navigate to classes
    await page.click('a[href="/classes"]')
    await expect(page).toHaveURL(/classes/)
    await expect(page.locator('h1')).toContainText('Classes')
    
    // Check if classes are displayed
    await expect(page.locator('text=Quran Class - Level 1')).toBeVisible()
    
    // Navigate to students
    await page.click('a[href="/students"]')
    await expect(page).toHaveURL(/students/)
    await expect(page.locator('h1')).toContainText('Students')
    
    // Check if students are displayed
    await expect(page.locator('text=Hassan Patel')).toBeVisible()
    await expect(page.locator('text=Amina Patel')).toBeVisible()
    
    // Navigate to attendance
    await page.click('a[href="/attendance"]')
    await expect(page).toHaveURL(/attendance/)
    await expect(page.locator('h1')).toContainText('Attendance')
    
    // Navigate to invoices
    await page.click('a[href="/invoices"]')
    await expect(page).toHaveURL(/invoices/)
    await expect(page.locator('h1')).toContainText('Invoices')
    
    // Check if invoices are displayed
    await expect(page.locator('text=£50.00')).toBeVisible()
    
    // Navigate to messages
    await page.click('a[href="/messages"]')
    await expect(page).toHaveURL(/messages/)
    await expect(page.locator('h1')).toContainText('Messages')
    
    // Navigate to calendar
    await page.click('a[href="/calendar"]')
    await expect(page).toHaveURL(/calendar/)
    await expect(page.locator('h1')).toContainText('Calendar')
    
    // Navigate to support
    await page.click('a[href="/support"]')
    await expect(page).toHaveURL(/support/)
    await expect(page.locator('h1')).toContainText('Support')
    
    // Navigate to settings
    await page.click('a[href="/settings"]')
    await expect(page).toHaveURL(/settings/)
    await expect(page.locator('h1')).toContainText('Settings')
  })

  test('should handle attendance marking', async ({ page }) => {
    // Sign in as admin
    await page.fill('input[type="email"]', 'admin@demo.com')
    await page.fill('input[type="password"]', 'demo123')
    await page.click('button[type="submit"]')
    
    // Navigate to attendance
    await page.click('a[href="/attendance"]')
    
    // Should show attendance interface
    await expect(page.locator('text=Select Date')).toBeVisible()
    await expect(page.locator('text=Select Class')).toBeVisible()
  })

  test('should handle invoice generation', async ({ page }) => {
    // Sign in as admin
    await page.fill('input[type="email"]', 'admin@demo.com')
    await page.fill('input[type="password"]', 'demo123')
    await page.click('button[type="submit"]')
    
    // Navigate to invoices
    await page.click('a[href="/invoices"]')
    
    // Should show invoice management interface
    await expect(page.locator('text=Generate Monthly Invoices')).toBeVisible()
  })
})
