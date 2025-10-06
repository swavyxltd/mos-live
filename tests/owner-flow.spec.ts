import { test, expect } from '@playwright/test'

test.describe('Owner Portal Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to staff portal (owner access)
    await page.goto('/?portal=app')
  })

  test('should complete owner workflow', async ({ page }) => {
    // Sign in as owner
    await page.fill('input[type="email"]', 'owner@demo.com')
    await page.fill('input[type="password"]', 'demo123')
    await page.click('button[type="submit"]')
    
    // Should redirect to owner overview
    await expect(page).toHaveURL(/owner\/overview/)
    await expect(page.locator('h1')).toContainText('Platform Overview')
    
    // Check platform stats are visible
    await expect(page.locator('text=Total Organizations')).toBeVisible()
    await expect(page.locator('text=Total Students')).toBeVisible()
    await expect(page.locator('text=Revenue (30 days)')).toBeVisible()
    
    // Navigate to organizations
    await page.click('a[href="/owner/orgs"]')
    await expect(page).toHaveURL(/owner\/orgs/)
    await expect(page.locator('h1')).toContainText('Organizations')
    
    // Check if organizations are displayed
    await expect(page.locator('text=Leicester Islamic Centre')).toBeVisible()
    
    // Navigate to dunning
    await page.click('a[href="/owner/dunning"]')
    await expect(page).toHaveURL(/owner\/dunning/)
    await expect(page.locator('h1')).toContainText('Dunning Management')
    
    // Navigate to support
    await page.click('a[href="/owner/support"]')
    await expect(page).toHaveURL(/owner\/support/)
    await expect(page.locator('h1')).toContainText('Support')
    
    // Navigate to settings
    await page.click('a[href="/owner/settings"]')
    await expect(page).toHaveURL(/owner\/settings/)
    await expect(page.locator('h1')).toContainText('Settings')
  })

  test('should view organization details', async ({ page }) => {
    // Sign in as owner
    await page.fill('input[type="email"]', 'owner@demo.com')
    await page.fill('input[type="password"]', 'demo123')
    await page.click('button[type="submit"]')
    
    // Navigate to organizations
    await page.click('a[href="/owner/orgs"]')
    
    // Should show organization details
    await expect(page.locator('text=Leicester Islamic Centre')).toBeVisible()
    await expect(page.locator('text=Ahmed Hassan')).toBeVisible() // Owner name
  })

  test('should handle dunning management', async ({ page }) => {
    // Sign in as owner
    await page.fill('input[type="email"]', 'owner@demo.com')
    await page.fill('input[type="password"]', 'demo123')
    await page.click('button[type="submit"]')
    
    // Navigate to dunning
    await page.click('a[href="/owner/dunning"]')
    
    // Should show dunning interface
    await expect(page.locator('text=Active Failures')).toBeVisible()
    await expect(page.locator('text=Total Amount at Risk')).toBeVisible()
  })
})
