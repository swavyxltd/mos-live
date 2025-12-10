export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getActiveOrg } from '@/lib/org'
import { prisma } from '@/lib/prisma'
import { sendApplicationAcceptanceEmail } from '@/lib/mail'
import { logger } from '@/lib/logger'
import crypto from 'crypto'

// PATCH /api/applications/[id] - Update application status
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const body = await request.json()
    const { status, adminNotes } = body

    if (!status || !['NEW', 'REVIEWED', 'ACCEPTED', 'REJECTED'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    // Get the application to verify it belongs to the org
    const application = await prisma.application.findFirst({
      where: {
        id: params.id,
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
      where: { id: params.id },
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
    let emailSent = false
    if (status === 'ACCEPTED') {
      try {
        // Use transaction to ensure all-or-nothing student creation
        const result = await prisma.$transaction(async (tx) => {
          // Find or create parent user
          let parentUser = await tx.user.findUnique({
            where: { email: application.guardianEmail.toLowerCase().trim() }
          })

          if (!parentUser) {
            // Create new parent user
            try {
              parentUser = await tx.user.create({
                data: {
                  id: crypto.randomUUID(),
                  name: application.guardianName.trim(),
                  email: application.guardianEmail.toLowerCase().trim(),
                  phone: application.guardianPhone?.trim() || null,
                  updatedAt: new Date()
                }
              })
            } catch (createError: any) {
              // Handle unique constraint violation (race condition)
              if (createError.code === 'P2002') {
                // User was created between our check and create, fetch it
                parentUser = await tx.user.findUnique({
                  where: { email: application.guardianEmail.toLowerCase().trim() }
                })
                if (!parentUser) {
                  throw new Error('This email is already being used. Please use a different one.')
                }
              } else {
                throw createError
              }
            }

            // Add parent to organisation
            await tx.userOrgMembership.create({
              data: {
                id: crypto.randomUUID(),
                userId: parentUser.id,
                orgId: org.id,
                role: 'PARENT'
              }
            })
          }

          const childrenNames: string[] = []
          const createdStudentIds: string[] = []
          const invitations: Array<{ studentId: string; token: string }> = []

          // Create student records for each child
          for (const child of application.ApplicationChild) {
            const student = await tx.student.create({
              data: {
                orgId: org.id,
                firstName: child.firstName.trim(),
                lastName: child.lastName.trim(),
                dob: child.dob ? new Date(child.dob) : undefined,
                primaryParentId: parentUser.id
              }
            })

            childrenNames.push(`${child.firstName} ${child.lastName}`)
            createdStudentIds.push(student.id)

            // Create parent invitation for this student
            const token = crypto.randomBytes(32).toString('hex')
            const expiresAt = new Date()
            expiresAt.setDate(expiresAt.getDate() + 30) // 30 days expiry

            await tx.parentInvitation.create({
              data: {
                orgId: org.id,
                studentId: student.id,
                parentEmail: application.guardianEmail.toLowerCase().trim(),
                token,
                expiresAt
              }
            })

            invitations.push({ studentId: student.id, token })

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
                    orgId: org.id,
                    studentId: student.id,
                    classId: matchingClass.id
                  }
                })
              }
            }
          }

          return { childrenNames, createdStudentIds, invitations }
        })

        const { childrenNames, createdStudentIds, invitations } = result

        // Send acceptance email to parent
        if (childrenNames.length > 0 && createdStudentIds.length > 0 && invitations.length > 0) {
          try {
            const baseUrl = process.env.APP_BASE_URL || process.env.NEXTAUTH_URL || 'https://app.madrasah.io'
            const cleanBaseUrl = baseUrl.trim().replace(/\/+$/, '')
            // Use the first student's invitation token from transaction result
            const signupUrl = `${cleanBaseUrl}/auth/parent-setup?token=${invitations[0].token}`

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
          logger.warn('Cannot send email: No children or invitations created', {
            childrenCount: childrenNames.length,
            studentIdsCount: createdStudentIds.length,
            invitationsCount: invitations.length
          })
        }
      } catch (error: any) {
        logger.error('Error creating students from application', error)
        // Don't fail the request, just log the error
        // The application status was already updated
      }
    }

    // Include email status in response if application was accepted
    const response: any = { ...updatedApplication }
    if (status === 'ACCEPTED') {
      response.emailSent = emailSent
      response.emailRecipient = application.guardianEmail
    }
    
    return NextResponse.json(response)
  } catch (error) {
    logger.error('Error updating application', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
