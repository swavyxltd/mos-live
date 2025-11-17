// Environment validation
export function validateEnv() {
  const required = [
    'NEXTAUTH_URL',
    'NEXTAUTH_SECRET',
    'APP_BASE_URL',
    'POSTGRES_PRISMA_URL',
    'STRIPE_SECRET_KEY',
    'STRIPE_PRODUCT_ID',
    'STRIPE_PRICE_ID',
    'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'BLOB_READ_WRITE_TOKEN',
    'RESEND_API_KEY',
    'RESEND_FROM',
    'META_APP_ID',
    'META_APP_SECRET',
    'META_GRAPH_VERSION',
    'META_GRAPH_BASE',
    'WHATSAPP_EMBEDDED_REDIRECT_URL',
    'WHATSAPP_VERIFY_TOKEN'
  ]

  const missing = required.filter(key => !process.env[key])
  
  if (missing.length > 0) {
    missing.forEach(key => )
  } else {
  }

  // Optional WhatsApp dev config
  const optionalWhatsapp = [
    'WHATSAPP_DEV_ACCESS_TOKEN',
    'WHATSAPP_DEV_PHONE_NUMBER_ID',
    'WHATSAPP_DEV_WABA_ID'
  ]

  const missingOptional = optionalWhatsapp.filter(key => !process.env[key])
  if (missingOptional.length > 0) {
    ')
  }

  return missing.length === 0
}
