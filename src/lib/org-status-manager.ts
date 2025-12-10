import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'

const prisma = new PrismaClient()

export interface PaymentFailureData {
  orgId: string
  orgName: string
  failureReason: string
  amount: number
  failureDate: Date
}

export class OrganisationStatusManager {
  /**
   * Handle payment failure and potentially suspend/pause organisation
   */
  static async handlePaymentFailure(data: PaymentFailureData) {
    try {
      // Get organisation details
      const org = await prisma.org.findUnique({
        where: { id: data.orgId },
        include: {
          memberships: {
            where: {
              role: { in: ['ADMIN', 'STAFF'] }
            },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            }
          }
        }
      })

      if (!org) {
        throw new Error(`Organisation ${data.orgId} not found`)
      }

      // Increment payment failure count
      const newFailureCount = org.paymentFailureCount + 1
      
      // Determine action based on failure count and current status
      let action: 'none' | 'pause' | 'deactivate' = 'none'
      let reason = ''

      if (org.status === 'ACTIVE') {
        if (newFailureCount >= 3) {
          // 3+ failures: Deactivate account
          action = 'deactivate'
          reason = `Account deactivated due to ${newFailureCount} consecutive payment failures. Last failure: ${data.failureReason}`
        } else if (newFailureCount >= 2) {
          // 2 failures: Pause account
          action = 'pause'
          reason = `Account paused due to ${newFailureCount} consecutive payment failures. Last failure: ${data.failureReason}`
        }
      }

      // Update organisation status
      const updateData: any = {
        paymentFailureCount: newFailureCount,
        lastPaymentDate: null // Clear last payment date on failure
      }

      if (action === 'pause') {
        updateData.status = 'PAUSED'
        updateData.pausedAt = new Date()
        updateData.pausedReason = reason
      } else if (action === 'deactivate') {
        updateData.status = 'DEACTIVATED'
        updateData.deactivatedAt = new Date()
        updateData.deactivatedReason = reason
      }

      const updatedOrg = await prisma.org.update({
        where: { id: data.orgId },
        data: updateData
      })

      // Log the action
      if (action !== 'none') {
        await prisma.auditLog.create({
          data: {
            id: crypto.randomUUID(),
            action: action === 'pause' ? 'ORG_AUTO_PAUSED' : 'ORG_AUTO_DEACTIVATED',
            targetType: 'ORG',
            targetId: data.orgId,
            orgId: data.orgId,
            data: JSON.stringify({
              orgName: data.orgName,
              reason: reason,
              failureCount: newFailureCount,
              lastFailure: {
                reason: data.failureReason,
                amount: data.amount,
                date: data.failureDate
              },
              affectedUsers: org.memberships.map(m => ({
                userId: m.user.id,
                userName: m.user.name,
                userEmail: m.user.email,
                role: m.role
              }))
            }
          }
        })
      }

      return {
        action,
        reason,
        failureCount: newFailureCount,
        affectedUsers: org.memberships.length,
        orgStatus: updatedOrg.status
      }

    } catch (error) {
      throw error
    }
  }

  /**
   * Handle successful payment and reset failure count
   */
  static async handlePaymentSuccess(orgId: string, amount: number) {
    try {
      const updatedOrg = await prisma.org.update({
        where: { id: orgId },
        data: {
          paymentFailureCount: 0,
          lastPaymentDate: new Date(),
          // Don't automatically reactivate - that should be manual
        }
      })

      // Log successful payment
      await prisma.auditLog.create({
        data: {
          id: crypto.randomUUID(),
          action: 'PAYMENT_SUCCESS',
          targetType: 'ORG',
          targetId: orgId,
          orgId: orgId,
          details: {
            amount,
            paymentDate: new Date(),
            failureCountReset: true
          }
        }
      })

      return {
        success: true,
        orgStatus: updatedOrg.status,
        failureCountReset: true
      }

    } catch (error) {
      throw error
    }
  }

  /**
   * Check if organisation should be automatically deactivated based on payment history
   */
  static async checkAutoDeactivateConditions(orgId: string) {
    try {
      const org = await prisma.org.findUnique({
        where: { id: orgId },
        include: {
          payments: {
            where: {
              status: 'FAILED',
              createdAt: {
                gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
              }
            },
            orderBy: { createdAt: 'desc' }
          }
        }
      })

      if (!org || !org.autoSuspendEnabled) {
        return { shouldDeactivate: false, reason: 'Auto-deactivate disabled or org not found' }
      }

      // Check for consecutive failures
      const recentFailures = org.payments.filter(p => p.status === 'FAILED')
      const failureCount = recentFailures.length

      if (failureCount >= 3) {
        return {
          shouldDeactivate: true,
          reason: `3+ payment failures in the last 30 days (${failureCount} total)`,
          failureCount
        }
      }

      return { shouldDeactivate: false, reason: `Only ${failureCount} failures (need 3+)` }

    } catch (error) {
      return { shouldDeactivate: false, reason: 'Error checking conditions' }
    }
  }
}
