import { test, expect } from '@playwright/test'

test.describe('Complete Application Test Suite', () => {
  test('should run all portal smoke tests', async ({ page }) => {
    // Test all portals load without 500 errors
    const portals = ['app', 'parent', 'auth']
    
    for (const portal of portals) {
      await page.goto(`/?portal=${portal}`)
      
      // Should not show 500 error
      await expect(page.locator('text=500')).not.toBeVisible()
      await expect(page.locator('text=Internal Server Error')).not.toBeVisible()
      
      // Should show appropriate content or redirect
      const url = page.url()
      expect(url).toMatch(/(signin|dashboard|parent\/dashboard)/)
    }
  })

  test('should handle authentication flow', async ({ page }) => {
    // Test signin page
    await page.goto('/?portal=auth')
    await expect(page.locator('text=Sign in to your account')).toBeVisible()
    
    // Test invalid credentials
    await page.fill('input[type="email"]', 'invalid@example.com')
    await page.fill('input[type="password"]', 'wrongpassword')
    await page.click('button[type="submit"]')
    
    // Should show error or stay on signin page
    await expect(page.locator('text=Invalid email or password')).toBeVisible()
  })

  test('should handle role-based access', async ({ page }) => {
    // Test parent trying to access staff portal
    await page.goto('/?portal=app')
    await page.fill('input[type="email"]', 'parent@demo.com')
    await page.fill('input[type="password"]', 'demo123')
    await page.click('button[type="submit"]')
    
    // Should redirect to appropriate portal
    const url = page.url()
    expect(url).toMatch(/(parent\/dashboard|dashboard)/)
  })

  test('should handle navigation between portals', async ({ page }) => {
    // Start at staff portal
    await page.goto('/?portal=app')
    
    // Switch to parent portal
    await page.goto('/?portal=parent')
    expect(page.url()).toContain('parent')
    
    // Switch to auth portal
    await page.goto('/?portal=auth')
    expect(page.url()).toContain('signin')
  })

  test('should handle responsive design', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/?portal=app')
    
    // Should show mobile menu button
    await expect(page.locator('button[aria-label="Menu"]')).toBeVisible()
    
    // Test desktop viewport
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.reload()
    
    // Should show sidebar
    await expect(page.locator('nav')).toBeVisible()
  })

  test('should handle error states gracefully', async ({ page }) => {
    // Test 404 page
    await page.goto('/nonexistent-page')
    
    // Should not show 500 error
    await expect(page.locator('text=500')).not.toBeVisible()
    
    // Test invalid API endpoint
    const response = await page.request.get('/api/invalid-endpoint')
    expect(response.status()).toBe(404)
  })

  test('should handle form submissions', async ({ page }) => {
    // Test signin form
    await page.goto('/?portal=auth')
    
    // Test empty form submission
    await page.click('button[type="submit"]')
    
    // Should show validation errors
    await expect(page.locator('input[type="email"]:invalid')).toBeVisible()
    await expect(page.locator('input[type="password"]:invalid')).toBeVisible()
  })

  test('should handle loading states', async ({ page }) => {
    // Test page loading
    await page.goto('/?portal=app')
    
    // Should show loading state or content
    await expect(page.locator('body')).toBeVisible()
    
    // Should not show loading spinner indefinitely
    await page.waitForLoadState('networkidle')
  })
})
