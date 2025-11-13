import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/roles'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'
import { getActiveOrg } from '@/lib/org'

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole(['ADMIN', 'OWNER'])(request)
    if (session instanceof NextResponse) return session

    const org = await getActiveOrg(session.user.id)
    if (!org?.id) {
      return NextResponse.json({ error: 'Organisation not found' }, { status: 404 })
    }

    // Get platform billing record
    const billing = await prisma.platformOrgBilling.findUnique({
      where: { orgId: org.id }
    })

    if (!billing?.stripeCustomerId || !billing.stripeSubscriptionId) {
      return NextResponse.json({ 
        error: 'No active subscription found. Please contact support.' 
      }, { status: 400 })
    }

    // Check if subscription is actually past_due, suspended, or paused
    const isOverdue = billing.subscriptionStatus === 'past_due' || org.status === 'SUSPENDED' || org.status === 'PAUSED'
    
    if (!isOverdue && billing.subscriptionStatus === 'active' && org.status === 'ACTIVE') {
      return NextResponse.json({ 
        error: 'Subscription is not overdue. No payment needed.' 
      }, { status: 400 })
    }

    // Get the latest unpaid invoice from Stripe
    const invoices = await stripe.invoices.list({
      customer: billing.stripeCustomerId,
      subscription: billing.stripeSubscriptionId,
      status: 'open',
      limit: 1
    })

    if (invoices.data.length === 0) {
      // Check for past_due invoices
      const pastDueInvoices = await stripe.invoices.list({
        customer: billing.stripeCustomerId,
        subscription: billing.stripeSubscriptionId,
        status: 'open',
        limit: 10
      })

      // Find the most recent unpaid invoice
      const unpaidInvoice = pastDueInvoices.data
        .filter(inv => inv.amount_due > 0)
        .sort((a, b) => b.created - a.created)[0]

      if (!unpaidInvoice) {
        return NextResponse.json({ 
          error: 'No unpaid invoice found. Please contact support.' 
        }, { status: 404 })
      }

      // Pay the invoice using the default payment method
      try {
        const paidInvoice = await stripe.invoices.pay(unpaidInvoice.id, {
          payment_method: billing.defaultPaymentMethodId || undefined
        })

        // Get updated subscription status
        const subscriptionStatus = paidInvoice.subscription 
          ? (await stripe.subscriptions.retrieve(paidInvoice.subscription as string)).status
          : 'active'

        // Update billing record
        await prisma.platformOrgBilling.update({
          where: { orgId: org.id },
          data: {
            subscriptionStatus,
            lastBilledAt: new Date()
          }
        })

      // Update org status if it was suspended or paused
      if (org.status === 'SUSPENDED' || org.status === 'PAUSED') {
        await prisma.org.update({
          where: { id: org.id },
          data: {
            status: 'ACTIVE',
            suspendedAt: null,
            suspendedReason: null,
            pausedAt: null,
            pausedReason: null,
            paymentFailureCount: 0,
            lastPaymentDate: new Date()
          }
        })
      } else {
        // Just update payment date
        await prisma.org.update({
          where: { id: org.id },
          data: {
            lastPaymentDate: new Date(),
            paymentFailureCount: 0
          }
        })
      }

        // Create audit log
        await prisma.auditLog.create({
          data: {
            orgId: org.id,
            actorUserId: session.user.id,
            action: 'PLATFORM_BILLING_OVERDUE_PAID',
            targetType: 'PlatformOrgBilling',
            targetId: billing.id,
            data: JSON.stringify({
              invoiceId: paidInvoice.id,
              amount: paidInvoice.amount_paid,
              subscriptionStatus
            })
          }
        })

        return NextResponse.json({
          success: true,
          message: 'Payment successful! Your account has been reactivated.',
          invoice: {
            id: paidInvoice.id,
            amount: paidInvoice.amount_paid / 100, // Convert to pounds
            status: paidInvoice.status
          }
        })
      } catch (stripeError: any) {
        console.error('Stripe invoice payment error:', stripeError)
        
        // If payment method is required, return client secret for payment intent
        if (stripeError.code === 'payment_method_required' || stripeError.code === 'invoice_payment_intent_requires_action') {
          // Create a payment intent for the invoice
          const paymentIntent = await stripe.paymentIntents.create({
            amount: unpaidInvoice.amount_due,
            currency: 'gbp',
            customer: billing.stripeCustomerId,
            metadata: {
              orgId: org.id,
              invoiceId: unpaidInvoice.id,
              type: 'platform_overdue'
            }
          })

          return NextResponse.json({
            requiresPaymentMethod: true,
            clientSecret: paymentIntent.client_secret,
            amount: unpaidInvoice.amount_due / 100,
            invoiceId: unpaidInvoice.id
          })
        }

        return NextResponse.json({
          error: 'Payment failed',
          details: stripeError.message || 'Unable to process payment. Please try again or contact support.'
        }, { status: 400 })
      }
    }

    // If we have an open invoice, try to pay it
    const invoice = invoices.data[0]
    
    try {
      const paidInvoice = await stripe.invoices.pay(invoice.id, {
        payment_method: billing.defaultPaymentMethodId || undefined
      })

      // Get updated subscription status
      const subscriptionStatus = paidInvoice.subscription 
        ? (await stripe.subscriptions.retrieve(paidInvoice.subscription as string)).status
        : 'active'

      // Update billing record
      await prisma.platformOrgBilling.update({
        where: { orgId: org.id },
        data: {
          subscriptionStatus,
          lastBilledAt: new Date()
        }
      })

      // Update org status if it was suspended
      if (org.status === 'SUSPENDED') {
        await prisma.org.update({
          where: { id: org.id },
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
          where: { id: org.id },
          data: {
            lastPaymentDate: new Date(),
            paymentFailureCount: 0
          }
        })
      }

      // Create audit log
      await prisma.auditLog.create({
        data: {
          orgId: org.id,
          actorUserId: session.user.id,
          action: 'PLATFORM_BILLING_OVERDUE_PAID',
          targetType: 'PlatformOrgBilling',
          targetId: billing.id,
          data: JSON.stringify({
            invoiceId: paidInvoice.id,
            amount: paidInvoice.amount_paid,
            subscriptionStatus
          })
        }
      })

      return NextResponse.json({
        success: true,
        message: 'Payment successful! Your account has been reactivated.',
        invoice: {
          id: paidInvoice.id,
          amount: paidInvoice.amount_paid / 100,
          status: paidInvoice.status
        }
      })
    } catch (stripeError: any) {
      console.error('Stripe invoice payment error:', stripeError)
      
      // If payment method is required, return client secret for payment intent
      if (stripeError.code === 'payment_method_required' || stripeError.code === 'invoice_payment_intent_requires_action') {
        const paymentIntent = await stripe.paymentIntents.create({
          amount: invoice.amount_due,
          currency: 'gbp',
          customer: billing.stripeCustomerId,
          metadata: {
            orgId: org.id,
            invoiceId: invoice.id,
            type: 'platform_overdue'
          }
        })

        return NextResponse.json({
          requiresPaymentMethod: true,
          clientSecret: paymentIntent.client_secret,
          amount: invoice.amount_due / 100,
          invoiceId: invoice.id
        })
      }

      return NextResponse.json({
        error: 'Payment failed',
        details: stripeError.message || 'Unable to process payment. Please try again or contact support.'
      }, { status: 400 })
    }
  } catch (error: any) {
    console.error('Error paying overdue invoice:', error)
    return NextResponse.json(
      { error: 'Failed to process payment', details: error.message },
      { status: 500 }
    )
  }
}

// GET endpoint to check overdue status and amount
export async function GET(request: NextRequest) {
  try {
    const session = await requireRole(['ADMIN', 'OWNER'])(request)
    if (session instanceof NextResponse) return session

    const org = await getActiveOrg(session.user.id)
    if (!org?.id) {
      return NextResponse.json({ error: 'Organisation not found' }, { status: 404 })
    }

    const billing = await prisma.platformOrgBilling.findUnique({
      where: { orgId: org.id }
    })

    if (!billing?.stripeCustomerId || !billing.stripeSubscriptionId) {
      return NextResponse.json({
        hasOverdue: false,
        amount: 0,
        message: 'No active subscription'
      })
    }

    // Get latest unpaid invoice
    const invoices = await stripe.invoices.list({
      customer: billing.stripeCustomerId,
      subscription: billing.stripeSubscriptionId,
      status: 'open',
      limit: 1
    })

    const hasOverdue = billing.subscriptionStatus === 'past_due' || invoices.data.length > 0
    const overdueInvoice = invoices.data[0]
    const amount = overdueInvoice ? overdueInvoice.amount_due / 100 : 0

    return NextResponse.json({
      hasOverdue,
      amount,
      subscriptionStatus: billing.subscriptionStatus,
      lastBilledAt: billing.lastBilledAt?.toISOString(),
      invoiceId: overdueInvoice?.id
    })
  } catch (error: any) {
    console.error('Error checking overdue status:', error)
    return NextResponse.json(
      { error: 'Failed to check overdue status', details: error.message },
      { status: 500 }
    )
  }
}

