export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import { sendPaymentFailedPlatform } from '@/lib/mail'

export async function POST(request: NextRequest) {
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
    console.error('Webhook signature verification failed:', err.message)
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
      
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object)
        break
      
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object)
        break
      
      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook handler error:', error)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}

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
            lastBilledAt: new Date()
          }
        })
      }

      // Update org status if it was suspended
      const org = await prisma.org.findUnique({
        where: { id: metadata.orgId },
        select: { status: true }
      })

      if (org?.status === 'SUSPENDED') {
        await prisma.org.update({
          where: { id: metadata.orgId },
          data: {
            status: 'ACTIVE',
            suspendedAt: null,
            suspendedReason: null,
            paymentFailureCount: 0,
            lastPaymentDate: new Date()
          }
        })
      } else {
        await prisma.org.update({
          where: { id: metadata.orgId },
          data: {
            lastPaymentDate: new Date(),
            paymentFailureCount: 0
          }
        })
      }

      // Create audit log
      await prisma.auditLog.create({
        data: {
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
      console.error('Error processing platform overdue payment:', error)
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

async function handleInvoicePaymentSucceeded(invoice: any) {
  // Handle platform billing invoice payment
  if (invoice.metadata?.orgId) {
    await prisma.auditLog.create({
      data: {
        orgId: invoice.metadata.orgId,
        action: 'PLATFORM_BILLING_PAID',
        targetType: 'PlatformOrgBilling',
        data: {
          stripeInvoiceId: invoice.id,
          amount: invoice.amount_paid
        }
      }
    })
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
  if (invoice.metadata?.orgId) {
    const org = await prisma.org.findUnique({
      where: { id: invoice.metadata.orgId },
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
    
    if (org?.memberships[0]?.user?.email) {
      // Send notification email
      await sendPaymentFailedPlatform({
        to: org.memberships[0].user.email,
        orgName: org.name,
        updateUrl: `${process.env.APP_BASE_URL}/settings/billing`
      })
    }
    
    // Update subscription status
    await prisma.platformOrgBilling.updateMany({
      where: {
        orgId: invoice.metadata.orgId
      },
      data: {
        subscriptionStatus: 'past_due'
      }
    })
    
    await prisma.auditLog.create({
      data: {
        orgId: invoice.metadata.orgId,
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
