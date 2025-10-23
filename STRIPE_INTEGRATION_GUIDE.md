# 🔄 Stripe Payment Retry Integration Guide

## 🎯 **Current Status: DEMO vs REAL**

### ❌ **What's Currently Demo Only:**
- Payment retry buttons show UI changes but don't actually charge cards
- No real Stripe API calls are made
- Data is just updated in the frontend state

### ✅ **What's Now Implemented:**
- Real API endpoint at `/api/revenue/retry-payment`
- Frontend calls the real API when retry button is clicked
- Proper error handling and success feedback
- Simulated Stripe responses for testing

## 🚀 **To Make It Fully Real:**

### 1. **Environment Setup**
```bash
# Add to your .env.local file
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
```

### 2. **Database Schema Updates**
You'll need to store Stripe data in your database:

```sql
-- Add to your organizations table
ALTER TABLE organizations ADD COLUMN stripe_customer_id VARCHAR(255);
ALTER TABLE organizations ADD COLUMN stripe_payment_method_id VARCHAR(255);

-- Add to your payments/invoices table  
ALTER TABLE payments ADD COLUMN stripe_payment_intent_id VARCHAR(255);
ALTER TABLE payments ADD COLUMN stripe_charge_id VARCHAR(255);
```

### 3. **Real Stripe Implementation**

Replace the demo code in `/api/revenue/retry-payment/route.ts` with:

```typescript
// Get the organization's Stripe customer ID
const organization = await prisma.organization.findUnique({
  where: { id: organizationId },
  select: { stripe_customer_id: true }
})

if (!organization?.stripe_customer_id) {
  return NextResponse.json({
    success: false,
    error: 'Organization not found or not set up for payments'
  })
}

// Get the organization's saved payment methods
const paymentMethods = await stripe.paymentMethods.list({
  customer: organization.stripe_customer_id,
  type: 'card',
})

if (paymentMethods.data.length === 0) {
  return NextResponse.json({
    success: false,
    error: 'No payment method found for this organization'
  })
}

// Retry the payment intent
const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId, {
  payment_method: paymentMethods.data[0].id, // Use their saved card
})

if (paymentIntent.status === 'succeeded') {
  // Update your database
  await prisma.payment.update({
    where: { stripe_payment_intent_id: paymentIntentId },
    data: { 
      status: 'succeeded',
      amount_collected: paymentIntent.amount,
      collected_at: new Date()
    }
  })
  
  return NextResponse.json({
    success: true,
    paymentIntent: {
      id: paymentIntent.id,
      status: paymentIntent.status,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
    }
  })
}
```

### 4. **Payment Method Setup**

When organizations first sign up, you'll need to:

```typescript
// Create Stripe customer
const customer = await stripe.customers.create({
  email: organization.email,
  name: organization.name,
  metadata: {
    organization_id: organization.id
  }
})

// Save customer ID to database
await prisma.organization.update({
  where: { id: organization.id },
  data: { stripe_customer_id: customer.id }
})
```

### 5. **Webhook Handling**

Set up Stripe webhooks to handle payment events:

```typescript
// /api/webhooks/stripe/route.ts
export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')
  
  const event = stripe.webhooks.constructEvent(
    body,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET!
  )

  switch (event.type) {
    case 'payment_intent.succeeded':
      // Update your database
      break
    case 'payment_intent.payment_failed':
      // Handle failed payment
      break
  }
}
```

## 🔧 **Current Demo Behavior:**

### ✅ **What Works Now:**
- Click "Retry" button → Calls real API endpoint
- API returns simulated Stripe responses
- Frontend updates based on success/failure
- Success: Removes payment from failed list, updates revenue
- Failure: Increments retry count, shows error

### 🎭 **Demo Responses:**
- **Birmingham Quran Academy** (£98): Always succeeds
- **Leeds Islamic School** (£76): Always fails (card declined)
- **Sheffield Islamic Centre** (£45): Always succeeds

## 🚨 **Important Notes:**

1. **No Real Money**: Current implementation is demo-only
2. **Test Mode**: Use Stripe test keys for development
3. **Security**: Never expose secret keys in frontend
4. **Webhooks**: Essential for production payment handling
5. **Error Handling**: Implement proper retry logic and user notifications

## 🎯 **Next Steps for Production:**

1. Set up Stripe account and get API keys
2. Implement customer creation during organization signup
3. Add payment method collection (Stripe Elements)
4. Replace demo API with real Stripe calls
5. Set up webhook endpoints
6. Add proper error handling and logging
7. Test with Stripe test cards
8. Deploy with production Stripe keys

The foundation is now in place - you just need to replace the demo responses with real Stripe API calls! 🚀
