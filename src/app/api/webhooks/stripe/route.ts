export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import { sendPaymentFailedPlatform } from '@/lib/mail'
import { logger } from '@/lib/logger'
import crypto from 'crypto'

async function handlePOST(request: NextRequest) {
  const body = await request.text()
  const signature = headers().get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }

  let event: any

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err: any) {
    logger.error('Webhook signature verification failed', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object)
        break
      
      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object)
        break
      
      case 'setup_intent.succeeded':
        await handleSetupIntentSucceeded(event.data.object)
        break
      
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object)
        break
      
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object)
        break
      
      case 'invoice.created':
        await handleInvoiceCreated(event.data.object)
        break
      
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object)
        break
      
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object)
        break
      
      default:
        logger.info('Unhandled webhook event type', { eventType: event.type })
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    logger.error('Webhook handler error', error)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}

// GET handler for endpoint verification (returns status)
async function handleGET(request: NextRequest) {
  return NextResponse.json({
    status: 'active',
    endpoint: '/api/webhooks/stripe',
    method: 'POST',
    description: 'Stripe webhook endpoint for handling billing events',
    events: [
      'customer.subscription.created',
      'customer.subscription.updated',
      'customer.subscription.deleted',
      'invoice.created',
      'invoice.payment_succeeded',
      'invoice.payment_failed',
      'setup_intent.succeeded',
      'payment_intent.succeeded',
      'payment_intent.payment_failed'
    ],
    note: 'This endpoint only accepts POST requests from Stripe. Use Stripe Dashboard to test webhooks.'
  })
}

export const POST = handlePOST // Webhooks don't need rate limiting, they're verified by signature
export const GET = handleGET // For endpoint verification

async function handlePaymentIntentSucceeded(paymentIntent: any) {
  const { metadata } = paymentIntent
  
  // Handle platform overdue payment
  if (metadata.type === 'platform_overdue' && metadata.orgId && metadata.invoiceId) {
    try {
      // Pay the invoice using the payment method from the payment intent
      const invoice = await stripe.invoices.retrieve(metadata.invoiceId)
      
      // If invoice is not paid yet, pay it using the payment intent's payment method
      if (invoice.status !== 'paid') {
        await stripe.invoices.pay(metadata.invoiceId, {
          payment_method: paymentIntent.payment_method
        })
      }

      // Get updated subscription status
      const subscription = invoice.subscription 
        ? await stripe.subscriptions.retrieve(invoice.subscription as string)
        : null
      
      const subscriptionStatus = subscription?.status || 'active'

      // Update billing record
      const billing = await prisma.platformOrgBilling.findUnique({
        where: { orgId: metadata.orgId }
      })

      if (billing) {
        await prisma.platformOrgBilling.update({
          where: { id: billing.id },
          data: {
            subscriptionStatus,
            lastBilledAt: new Date(),
            updatedAt: new Date()
          }
        })
      }

      // Update org status if it was deactivated or paused
      const org = await prisma.org.findUnique({
        where: { id: metadata.orgId },
        select: { status: true }
      })

      if (org?.status === 'DEACTIVATED' || org?.status === 'PAUSED') {
        await prisma.org.update({
          where: { id: metadata.orgId },
          data: {
            status: 'ACTIVE',
            deactivatedAt: null,
            deactivatedReason: null,
            pausedAt: null,
            pausedReason: null,
            paymentFailureCount: 0,
            lastPaymentDate: new Date(),
            updatedAt: new Date()
          }
        })
      } else {
        await prisma.org.update({
          where: { id: metadata.orgId },
          data: {
            lastPaymentDate: new Date(),
            paymentFailureCount: 0,
            updatedAt: new Date()
          }
        })
      }

      // Create audit log
      await prisma.auditLog.create({
        data: {
          id: crypto.randomUUID(),
          orgId: metadata.orgId,
          action: 'PLATFORM_BILLING_OVERDUE_PAID',
          targetType: 'PlatformOrgBilling',
          targetId: billing?.id,
          data: JSON.stringify({
            paymentIntentId: paymentIntent.id,
            invoiceId: metadata.invoiceId,
            amount: paymentIntent.amount,
            subscriptionStatus
          })
        }
      })
    } catch (error: any) {
      logger.error('Error processing platform overdue payment', error)
    }
    return
  }
  
  // Handle parent invoice payment
  if (metadata.orgId && metadata.parentUserId && metadata.invoiceId) {
    // Update payment record
    await prisma.payment.updateMany({
      where: {
        providerId: paymentIntent.id,
        orgId: metadata.orgId
      },
      data: {
        status: 'SUCCEEDED'
      }
    })
    
    // Update invoice
    await prisma.invoice.updateMany({
      where: {
        id: metadata.invoiceId,
        orgId: metadata.orgId
      },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        paidMethod: 'CARD'
      }
    })
    
    // Log the action
    await prisma.auditLog.create({
      data: {
        id: crypto.randomUUID(),
        orgId: metadata.orgId,
        action: 'PAYMENT_SUCCEEDED',
        targetType: 'Payment',
        data: {
          paymentIntentId: paymentIntent.id,
          amount: paymentIntent.amount,
          invoiceId: metadata.invoiceId
        }
      }
    })
  }
}

async function handlePaymentIntentFailed(paymentIntent: any) {
  const { metadata } = paymentIntent
  
  if (metadata.orgId && metadata.parentUserId && metadata.invoiceId) {
    // Update payment record
    await prisma.payment.updateMany({
      where: {
        providerId: paymentIntent.id,
        orgId: metadata.orgId
      },
      data: {
        status: 'FAILED'
      }
    })
    
    // Log the action
    await prisma.auditLog.create({
      data: {
        id: crypto.randomUUID(),
        orgId: metadata.orgId,
        action: 'PAYMENT_FAILED',
        targetType: 'Payment',
        data: {
          paymentIntentId: paymentIntent.id,
          amount: paymentIntent.amount,
          invoiceId: metadata.invoiceId,
          failureReason: paymentIntent.last_payment_error?.message
        }
      }
    })
  }
}

async function handleSetupIntentSucceeded(setupIntent: any) {
  const { metadata } = setupIntent
  
  // Handle platform billing (org setup)
  if (metadata.orgId && metadata.type === 'platform') {
    // Attach payment method to customer
    await stripe.paymentMethods.attach(setupIntent.payment_method, {
      customer: setupIntent.customer
    })
    
    // Set as default payment method
    await stripe.customers.update(setupIntent.customer, {
      invoice_settings: {
        default_payment_method: setupIntent.payment_method
      }
    })
    
    // Update platform billing record
    await prisma.platformOrgBilling.updateMany({
      where: {
        orgId: metadata.orgId,
        stripeCustomerId: setupIntent.customer
      },
      data: {
        defaultPaymentMethodId: setupIntent.payment_method
      }
    })
    
    // Create subscription if not exists (with trial)
    const billing = await prisma.platformOrgBilling.findUnique({
      where: { orgId: metadata.orgId }
    })
    
    if (billing && !billing.stripeSubscriptionId) {
      // Get active student count
      const studentCount = await prisma.student.count({
        where: {
          orgId: metadata.orgId,
          isArchived: false
        }
      })
      
      // Import createPlatformSubscription
      const { createPlatformSubscription } = await import('@/lib/stripe')
      await createPlatformSubscription(metadata.orgId, studentCount)
    }
    
    // Log the action
    await prisma.auditLog.create({
      data: {
        id: crypto.randomUUID(),
        orgId: metadata.orgId,
        action: 'PLATFORM_PAYMENT_METHOD_SAVED',
        targetType: 'PlatformOrgBilling',
        data: {
          setupIntentId: setupIntent.id,
          paymentMethodId: setupIntent.payment_method
        }
      }
    })
  }
  
  // Handle parent billing
  if (metadata.orgId && metadata.parentUserId) {
    // Update parent billing profile with default payment method
    await prisma.parentBillingProfile.updateMany({
      where: {
        orgId: metadata.orgId,
        parentUserId: metadata.parentUserId
      },
      data: {
        defaultPaymentMethodId: setupIntent.payment_method
      }
    })
    
    // Log the action
    await prisma.auditLog.create({
      data: {
        id: crypto.randomUUID(),
        orgId: metadata.orgId,
        action: 'PAYMENT_METHOD_SAVED',
        targetType: 'ParentBillingProfile',
        data: {
          setupIntentId: setupIntent.id,
          paymentMethodId: setupIntent.payment_method
        }
      }
    })
  }
}

// Helper function to get orgId from invoice (checks metadata or subscription)
async function getOrgIdFromInvoice(invoice: any): Promise<string | null> {
  // First check invoice metadata
  if (invoice.metadata?.orgId) {
    return invoice.metadata.orgId
  }
  
  // If no metadata, check subscription metadata
  if (invoice.subscription) {
    try {
      const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string)
      if (subscription.metadata?.orgId && subscription.metadata?.type === 'platform') {
        // Update invoice metadata for future reference
        await stripe.invoices.update(invoice.id, {
          metadata: {
            orgId: subscription.metadata.orgId,
            type: 'platform'
          }
        })
        return subscription.metadata.orgId
      }
    } catch (error: any) {
      logger.error('Error retrieving subscription for invoice', { invoiceId: invoice.id, error: error.message })
    }
  }
  
  return null
}

async function handleInvoiceCreated(invoice: any) {
  // When an invoice is created from a subscription, ensure it has the orgId metadata
  if (invoice.subscription && !invoice.metadata?.orgId) {
    try {
      const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string)
      if (subscription.metadata?.orgId && subscription.metadata?.type === 'platform') {
        // Set invoice metadata from subscription metadata
        await stripe.invoices.update(invoice.id, {
          metadata: {
            orgId: subscription.metadata.orgId,
            type: 'platform'
          }
        })
        
        logger.info('Set invoice metadata from subscription', {
          invoiceId: invoice.id,
          orgId: subscription.metadata.orgId
        })
      }
    } catch (error: any) {
      logger.error('Error setting invoice metadata', { invoiceId: invoice.id, error: error.message })
    }
  }
}

async function handleInvoicePaymentSucceeded(invoice: any) {
  // Handle platform billing invoice payment
  const orgId = await getOrgIdFromInvoice(invoice)
  
  if (orgId) {
    const org = await prisma.org.findUnique({
      where: { id: orgId },
      include: {
        memberships: {
          where: { role: 'ADMIN' },
          include: {
            user: {
              select: { email: true, name: true }
            }
          },
          take: 1
        }
      }
    })
    
    // Reset retry tracking when payment succeeds
    await prisma.platformOrgBilling.updateMany({
      where: {
        orgId: orgId
      },
      data: {
        subscriptionStatus: 'active',
        firstPaymentFailureDate: null,
        paymentRetryCount: 0,
        lastPaymentRetryDate: null,
        warningEmailSent: false,
        lastBilledAt: new Date()
      }
    })
    
    await prisma.auditLog.create({
      data: {
        id: crypto.randomUUID(),
        orgId: orgId,
        action: 'PLATFORM_BILLING_PAID',
        targetType: 'PlatformOrgBilling',
        data: {
          stripeInvoiceId: invoice.id,
          amount: invoice.amount_paid
        }
      }
    })
    
    // Send billing success email
    if (org?.memberships[0]?.user?.email) {
      try {
        const { sendBillingSuccessEmail } = await import('@/lib/mail')
        const billing = await prisma.platformOrgBilling.findUnique({
          where: { orgId: orgId }
        })
        const studentCount = billing?.lastBilledStudentCount || 0
        const invoiceUrl = invoice.hosted_invoice_url || undefined
        
        await sendBillingSuccessEmail({
          to: org.memberships[0].user.email,
          orgName: org.name,
          amount: invoice.amount_paid,
          studentCount,
          invoiceUrl
        })
      } catch (emailError: any) {
        logger.error('Failed to send billing success email', emailError)
        // Don't fail the webhook if email fails
      }
    }
  }
}

async function handleSubscriptionUpdated(subscription: any) {
  const { metadata } = subscription
  
  if (metadata?.orgId && metadata.type === 'platform') {
    // Update subscription status in database
    await prisma.platformOrgBilling.updateMany({
      where: {
        orgId: metadata.orgId,
        stripeSubscriptionId: subscription.id
      },
      data: {
        subscriptionStatus: subscription.status
      }
    })
    
    await prisma.auditLog.create({
      data: {
        id: crypto.randomUUID(),
        orgId: metadata.orgId,
        action: 'PLATFORM_SUBSCRIPTION_UPDATED',
        targetType: 'PlatformOrgBilling',
        data: {
          subscriptionId: subscription.id,
          status: subscription.status
        }
      }
    })
  }
}

async function handleSubscriptionDeleted(subscription: any) {
  const { metadata } = subscription
  
  if (metadata?.orgId && metadata.type === 'platform') {
    // Update subscription status
    await prisma.platformOrgBilling.updateMany({
      where: {
        orgId: metadata.orgId,
        stripeSubscriptionId: subscription.id
      },
      data: {
        subscriptionStatus: 'canceled',
        stripeSubscriptionId: null,
        stripeSubscriptionItemId: null
      }
    })
    
    await prisma.auditLog.create({
      data: {
        id: crypto.randomUUID(),
        orgId: metadata.orgId,
        action: 'PLATFORM_SUBSCRIPTION_CANCELED',
        targetType: 'PlatformOrgBilling',
        data: {
          subscriptionId: subscription.id
        }
      }
    })
  }
}

async function handleInvoicePaymentFailed(invoice: any) {
  // Handle platform billing invoice payment failure
  const orgId = await getOrgIdFromInvoice(invoice)
  
  if (orgId) {
    const billing = await prisma.platformOrgBilling.findUnique({
      where: { orgId: orgId }
    })
    
    const org = await prisma.org.findUnique({
      where: { id: orgId },
      include: {
        memberships: {
          where: { role: 'OWNER' },
          include: {
            user: {
              select: { email: true, name: true }
            }
          }
        }
      }
    })
    
    // Track first payment failure date (only set if not already set)
    const updateData: any = {
      subscriptionStatus: 'past_due'
    }
    
    if (!billing?.firstPaymentFailureDate) {
      updateData.firstPaymentFailureDate = new Date()
      updateData.paymentRetryCount = 0
      updateData.warningEmailSent = false
    }
    
    await prisma.platformOrgBilling.updateMany({
      where: {
        orgId: orgId
      },
      data: updateData
    })
    
    // Always send email on payment failure (not just first time)
    if (org?.memberships[0]?.user?.email) {
      try {
        const { sendPaymentFailedPlatform } = await import('@/lib/mail')
        await sendPaymentFailedPlatform({
          to: org.memberships[0].user.email,
          orgName: org.name,
          updateUrl: `${process.env.APP_BASE_URL || process.env.NEXTAUTH_URL || 'https://app.madrasah.io'}/settings?tab=subscription`,
          amount: invoice.amount_due,
          failureReason: invoice.last_payment_error?.message || 'Payment could not be processed'
        })
      } catch (emailError: any) {
        logger.error('Failed to send payment failed email', emailError)
        // Don't fail the webhook if email fails
      }
    }
    
    await prisma.auditLog.create({
      data: {
        id: crypto.randomUUID(),
        orgId: orgId,
        action: 'PLATFORM_BILLING_FAILED',
        targetType: 'PlatformOrgBilling',
        data: {
          stripeInvoiceId: invoice.id,
          amount: invoice.amount_due,
          failureReason: invoice.last_payment_error?.message
        }
      }
    })
  }
}
