export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { attemptOffSessionPayment } from '@/lib/stripe'

// This endpoint should be called by a cron job (e.g., Vercel Cron, or external service)
// It charges parents with card payment method on their org's billing day
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret if set
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const today = new Date()
    const currentDay = today.getDate()
    const currentMonth = today.toISOString().slice(0, 7) // YYYY-MM format

    logger.info('Starting monthly parent billing cron', { currentDay, currentMonth })

    // Find all orgs where today is their billing day
    // Use getBillingDay utility to ensure we only get orgs with valid billing days
    const { getBillingDay } = await import('@/lib/billing-day')
    
    const orgs = await prisma.org.findMany({
      where: {
        status: 'ACTIVE',
        acceptsCard: true,
        stripeConnectAccountId: { not: null },
        OR: [
          { billingDay: currentDay },
          { feeDueDay: currentDay } // Fallback for legacy data
        ]
      },
      select: {
        id: true,
        billingDay: true,
        feeDueDay: true,
        name: true
      }
    })

    logger.info('Found orgs to bill (before validation)', { count: orgs.length })

    // Filter to only orgs with valid billing day matching today
    const orgsToBill = orgs.filter(org => {
      const billingDay = getBillingDay(org)
      return billingDay !== null && billingDay === currentDay
    })

    logger.info('Found orgs to bill (after validation)', { count: orgsToBill.length, currentDay })

    let totalCharged = 0
    let totalFailed = 0

    for (const org of orgsToBill) {
      const billingDay = getBillingDay(org)
      // Double-check (should never fail at this point, but defensive)
      if (!billingDay || billingDay !== currentDay) {
        logger.warn(`Skipping org ${org.id} - billing day mismatch`, { 
          orgBillingDay: billingDay, 
          currentDay 
        })
        continue
      }

      try {
        logger.info(`Processing org ${org.id} (${org.name})`, { billingDay })
        
        // Get all students with CARD payment method in this org
        const students = await prisma.student.findMany({
          where: {
            orgId: org.id,
            isArchived: false,
            paymentMethod: 'CARD',
            primaryParentId: { not: null }
          },
          include: {
            studentClasses: {
              include: {
                class: true
              },
            },
            primaryParent: true
          }
        })

        logger.info(`Processing org ${org.id}`, { studentCount: students.length })

        for (const student of students) {
          if (!student.primaryParentId) continue

          // Get parent billing profile
          const billingProfile = await prisma.parentBillingProfile.findUnique({
            where: {
              orgId_parentUserId: {
                orgId: org.id,
                parentUserId: student.primaryParentId
              }
            }
          })

          if (!billingProfile?.autoPayEnabled || !billingProfile.defaultPaymentMethodId) {
            continue
          }

          // Process each class separately
          for (const studentClass of student.studentClasses) {
            const classFee = studentClass.class.monthlyFeeP
            if (!classFee || classFee === 0) continue

            // Check if already charged for this month and class
            const existingRecord = await prisma.monthlyPaymentRecord.findFirst({
              where: {
                orgId: org.id,
                studentId: student.id,
                classId: studentClass.class.id,
                month: currentMonth,
                status: 'PAID'
              }
            })

            if (existingRecord) {
              logger.info(`Skipping already paid: ${student.id} for class ${studentClass.class.id} in ${currentMonth}`)
              continue
            }

            // Create or get pending record for this class
            const paymentRecord = await prisma.monthlyPaymentRecord.upsert({
              where: {
                studentId_classId_month: {
                  studentId: student.id,
                  classId: studentClass.class.id,
                  month: currentMonth
                }
              },
              create: {
                orgId: org.id,
                studentId: student.id,
                classId: studentClass.class.id,
                month: currentMonth,
                amountP: classFee,
                method: 'CARD',
                status: 'PENDING'
              },
              update: {
                status: 'PENDING' // Reset to pending if it was failed
              }
            })

            // Attempt charge for this class
            try {
              // Create a temporary invoice ID for tracking
              const invoiceId = `monthly_${student.id}_${studentClass.class.id}_${currentMonth}`
              
              const paymentIntent = await attemptOffSessionPayment(
                org.id,
                student.primaryParentId,
                invoiceId,
                classFee
              )

              if (paymentIntent && paymentIntent.status === 'succeeded') {
                // Mark as paid
                await prisma.monthlyPaymentRecord.update({
                  where: { id: paymentRecord.id },
                  data: {
                    status: 'PAID',
                    paidAt: new Date(),
                    reference: paymentIntent.id
                  }
                })

                totalCharged++
                logger.info(`Successfully charged ${student.id} for class ${studentClass.class.id}`, { amount: classFee })
              } else {
                // Mark as failed
                await prisma.monthlyPaymentRecord.update({
                  where: { id: paymentRecord.id },
                  data: {
                    status: 'FAILED',
                    notes: paymentIntent?.last_payment_error?.message || 'Payment failed'
                  }
                })

                totalFailed++
                logger.error(`Failed to charge ${student.id} for class ${studentClass.class.id}`, { 
                  error: paymentIntent?.last_payment_error?.message 
                })
              }
            } catch (error: any) {
              // Mark as failed
              await prisma.monthlyPaymentRecord.update({
                where: { id: paymentRecord.id },
                data: {
                  status: 'FAILED',
                  notes: error.message || 'Payment error'
                }
              })

              totalFailed++
              logger.error(`Error charging ${student.id} for class ${studentClass.class.id}`, { error: error.message })
            }
          }
        }
      } catch (error: any) {
        logger.error(`Error processing org ${org.id}`, { error: error.message })
      }
    }

    return NextResponse.json({
      success: true,
      processed: orgs.length,
      charged: totalCharged,
      failed: totalFailed,
      month: currentMonth
    })
  } catch (error: any) {
    logger.error('Error in bill-parents cron', error)
    return NextResponse.json(
      { error: 'Failed to process billing', details: error.message },
      { status: 500 }
    )
  }
}

