import { test, expect } from '@playwright/test'

test.describe('Smoke Tests @smoke', () => {
  test('should load staff portal pages', async ({ page }) => {
    // Test staff portal pages
    const staffPages = [
      '/dashboard',
      '/classes',
      '/students',
      '/attendance',
      '/fees',
      '/invoices',
      '/messages',
      '/calendar',
      '/support',
      '/settings'
    ]

    for (const path of staffPages) {
      await page.goto(`/?portal=app${path}`)
      
      // Should redirect to signin or show the page
      const url = page.url()
      expect(url).toMatch(/(signin|dashboard|classes|students|attendance|fees|invoices|messages|calendar|support|settings)/)
      
      // Should not show 500 error
      await expect(page.locator('text=500')).not.toBeVisible()
      await expect(page.locator('text=Internal Server Error')).not.toBeVisible()
    }
  })

  test('should load parent portal pages', async ({ page }) => {
    // Test parent portal pages
    const parentPages = [
      '/parent/dashboard',
      '/parent/invoices',
      '/parent/calendar',
      '/parent/support'
    ]

    for (const path of parentPages) {
      await page.goto(`/?portal=parent${path}`)
      
      // Should redirect to signin or show the page
      const url = page.url()
      expect(url).toMatch(/(signin|parent\/dashboard|parent\/invoices|parent\/calendar|parent\/support)/)
      
      // Should not show 500 error
      await expect(page.locator('text=500')).not.toBeVisible()
      await expect(page.locator('text=Internal Server Error')).not.toBeVisible()
    }
  })

  test('should load auth pages', async ({ page }) => {
    await page.goto('/?portal=auth')
    
    // Should redirect to signin
    expect(page.url()).toContain('signin')
    
    // Should show signin form
    await expect(page.locator('text=Sign in to your account')).toBeVisible()
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
  })

  test('should handle portal routing', async ({ page }) => {
    // Test default routing
    await page.goto('/')
    expect(page.url()).toContain('dashboard')
    
    // Test portal parameter
    await page.goto('/?portal=parent')
    expect(page.url()).toContain('parent/dashboard')
    
    await page.goto('/?portal=auth')
    expect(page.url()).toContain('signin')
  })
})
