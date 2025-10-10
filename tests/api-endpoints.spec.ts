import { test, expect } from '@playwright/test'

test.describe('API Endpoints', () => {
  test('should handle authentication endpoints', async ({ request }) => {
    // Test signin endpoint
    const response = await request.post('/api/auth/signin', {
      data: {
        email: 'admin@demo.com',
        password: 'demo123'
      }
    })
    
    // Should not return 500 error
    expect(response.status()).not.toBe(500)
  })

  test('should handle file signed URL endpoint', async ({ request }) => {
    // This would require authentication in real scenario
    const response = await request.get('/api/files/signed-url?id=test-file.pdf')
    
    // Should return 401 without auth
    expect(response.status()).toBe(401)
  })

  test('should handle calendar ICS endpoint', async ({ request }) => {
    const response = await request.get('/api/calendar/ics')
    
    // Should return 401 without auth
    expect(response.status()).toBe(401)
  })

  test('should handle webhook endpoints', async ({ request }) => {
    // Test WhatsApp webhook verification
    const response = await request.get('/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=test&hub.challenge=test')
    
    // Should return 403 for invalid token
    expect(response.status()).toBe(403)
  })

  test('should handle cron endpoints', async ({ request }) => {
    const response = await request.post('/api/cron/nightly-usage')
    
    // Should return 401 without proper auth
    expect(response.status()).toBe(401)
  })
})
