export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getActiveOrg } from '@/lib/org'
import { prisma } from '@/lib/prisma'
import { sendApplicationAcceptanceEmail, sendApplicationRejectionEmail } from '@/lib/mail'
import { logger } from '@/lib/logger'
import crypto from 'crypto'

// PATCH /api/applications/[id] - Update application status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const org = await getActiveOrg()
    if (!org) {
      return NextResponse.json({ error: 'No organisation found' }, { status: 404 })
    }

    // Resolve params if it's a Promise (Next.js 15+)
    const resolvedParams = params instanceof Promise ? await params : params
    const applicationId = resolvedParams.id

    if (!applicationId) {
      return NextResponse.json({ error: 'Application ID is required' }, { status: 400 })
    }

    const body = await request.json()
    const { status, adminNotes } = body

    if (!status || !['NEW', 'REVIEWED', 'ACCEPTED', 'REJECTED'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    // Get the application to verify it belongs to the org
    const application = await prisma.application.findFirst({
      where: {
        id: applicationId,
        orgId: org.id
      },
      include: {
        ApplicationChild: true
      }
    })

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    // Update the application
    const updatedApplication = await prisma.application.update({
      where: { id: applicationId },
      data: {
        status,
        adminNotes,
        reviewedAt: new Date(),
        reviewedById: session.user.id,
        updatedAt: new Date()
      },
      include: {
        ApplicationChild: true,
        User: {
          select: {
            name: true,
            email: true
          }
        }
      }
    })

    // If status is ACCEPTED, create student records and send email
    // If status is REJECTED, send rejection email
    let emailSent = false
    if (status === 'REJECTED') {
      // Send rejection email to parent
      try {
        const childrenNames = application.ApplicationChild.map(
          child => `${child.firstName} ${child.lastName}`
        )

        logger.info('Sending application rejection email', {
          to: application.guardianEmail,
          orgName: org.name
        })
        
        const emailResult = await sendApplicationRejectionEmail({
          to: application.guardianEmail,
          orgName: org.name,
          parentName: application.guardianName,
          childrenNames,
          adminNotes: adminNotes || null
        })
        
        emailSent = !!emailResult
        if (emailResult) {
          logger.info('Application rejection email sent successfully', {
            emailId: emailResult.id
          })
        } else {
          logger.warn('Email function returned no result')
        }
      } catch (emailError: any) {
        logger.error('Failed to send application rejection email', emailError, {
          to: application.guardianEmail
        })
        // Don't fail the request if email fails, but log it
      }
    } else if (status === 'ACCEPTED') {
      // Check billing day before creating students
      const { checkBillingDay } = await import('@/lib/payment-check')
      const hasBillingDay = await checkBillingDay()
      if (!hasBillingDay) {
        return NextResponse.json(
          { error: 'Billing day required. Please set a billing day in Settings → Payment Methods before accepting applications.' },
          { status: 400 }
        )
      }

      try {
        // Use transaction to ensure all-or-nothing student creation
        const result = await prisma.$transaction(async (tx) => {
          // Update application with applicationIdForSignup (simple reference)
          await tx.application.update({
            where: { id: application.id },
            data: {
              applicationIdForSignup: application.id // Simple reference to application ID
            }
          })

          // Note: We no longer create parent user here - parent will be created during signup

          // Note: Parent user will be created during signup, not here

          const childrenNames: string[] = []
          const createdStudentIds: string[] = []

          // Create student records for each child
          for (const child of application.ApplicationChild) {
            const student = await tx.student.create({
              data: {
                id: crypto.randomUUID(),
                orgId: org.id,
                firstName: child.firstName.trim(),
                lastName: child.lastName.trim(),
                dob: child.dob ? new Date(child.dob) : undefined,
                // No primaryParentId - will be set when parent signs up
                claimStatus: 'NOT_CLAIMED', // Will be claimed when parent signs up
                updatedAt: new Date()
              }
            })

            childrenNames.push(`${child.firstName} ${child.lastName}`)
            createdStudentIds.push(student.id)

            // If a preferred class was specified, try to enroll the student
            if (application.preferredClass) {
              // Find a class with a similar name (this is a simple match, could be improved)
              const matchingClass = await tx.class.findFirst({
                where: {
                  orgId: org.id,
                  name: {
                    contains: application.preferredClass,
                    mode: 'insensitive'
                  },
                  isArchived: false
                }
              })

              if (matchingClass) {
                await tx.studentClass.create({
                  data: {
                    id: crypto.randomUUID(),
                    orgId: org.id,
                    studentId: student.id,
                    classId: matchingClass.id
                  }
                })
              }
            }
          }

          return { childrenNames, createdStudentIds }
        })

        const { childrenNames, createdStudentIds } = result

        // Send acceptance email to parent
        if (childrenNames.length > 0 && createdStudentIds.length > 0) {
          try {
            const baseUrl = process.env.APP_BASE_URL || process.env.NEXTAUTH_URL || 'https://app.madrasah.io'
            const cleanBaseUrl = baseUrl.trim().replace(/\/+$/, '')
            // Use application ID for signup
            const signupUrl = `${cleanBaseUrl}/parent/signup?applicationId=${application.id}`

            logger.info('Sending application acceptance email', {
              to: application.guardianEmail,
              orgName: org.name
            })
            
            const emailResult = await sendApplicationAcceptanceEmail({
              to: application.guardianEmail,
              orgName: org.name,
              parentName: application.guardianName,
              childrenNames,
              signupUrl
            })
            
            emailSent = !!emailResult
            if (emailResult) {
              logger.info('Application acceptance email sent successfully', {
                emailId: emailResult.id
              })
            } else {
              logger.warn('Email function returned no result')
            }
          } catch (emailError: any) {
            logger.error('Failed to send application acceptance email', emailError, {
              to: application.guardianEmail
            })
            // Don't fail the request if email fails, but log it
          }
        } else {
          logger.warn('Cannot send email: No children or students created', {
            childrenCount: childrenNames.length,
            studentIdsCount: createdStudentIds.length
          })
        }
      } catch (error: any) {
        logger.error('Error creating students from application', error)
        // Don't fail the request, just log the error
        // The application status was already updated
      }
    }

    // Include email status in response if application was accepted or rejected
    const response: any = { ...updatedApplication }
    if (status === 'ACCEPTED' || status === 'REJECTED') {
      response.emailSent = emailSent
      response.emailRecipient = application.guardianEmail
    }
    
    return NextResponse.json(response)
  } catch (error) {
    logger.error('Error updating application', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
