export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getActiveOrg } from '@/lib/org'
import { prisma } from '@/lib/prisma'
import { sendApplicationAcceptanceEmail } from '@/lib/mail'
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
      return NextResponse.json({ error: 'No organization found' }, { status: 404 })
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
    if (status === 'ACCEPTED') {
      try {
        // Find or create parent user
        let parentUser = await prisma.user.findUnique({
          where: { email: application.guardianEmail }
        })

        if (!parentUser) {
          // Create new parent user
          parentUser = await prisma.user.create({
            data: {
              name: application.guardianName,
              email: application.guardianEmail,
              phone: application.guardianPhone
            }
          })

          // Add parent to organization
          await prisma.userOrgMembership.create({
            data: {
              userId: parentUser.id,
              orgId: org.id,
              role: 'PARENT'
            }
          })
        }

        const childrenNames: string[] = []
        const createdStudentIds: string[] = []

        // Create student records for each child
        for (const child of application.ApplicationChild) {
          const student = await prisma.student.create({
            data: {
              orgId: org.id,
              firstName: child.firstName,
              lastName: child.lastName,
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

          await prisma.parentInvitation.create({
            data: {
              orgId: org.id,
              studentId: student.id,
              parentEmail: application.guardianEmail.toLowerCase().trim(),
              token,
              expiresAt
            }
          })

          // If a preferred class was specified, try to enroll the student
          if (application.preferredClass) {
            // Find a class with a similar name (this is a simple match, could be improved)
            const matchingClass = await prisma.class.findFirst({
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
              await prisma.studentClass.create({
                data: {
                  orgId: org.id,
                  studentId: student.id,
                  classId: matchingClass.id
                }
              })
            }
          }
        }

        // Send acceptance email to parent
        try {
          const baseUrl = process.env.APP_BASE_URL || process.env.NEXTAUTH_URL || 'https://app.madrasah.io'
          const cleanBaseUrl = baseUrl.trim().replace(/\/+$/, '')
          // Use the first student's invitation token for the signup link
          const firstInvitation = await prisma.parentInvitation.findFirst({
            where: {
              studentId: createdStudentIds[0],
              parentEmail: application.guardianEmail.toLowerCase().trim()
            },
            orderBy: { createdAt: 'desc' }
          })
          
          const signupUrl = firstInvitation 
            ? `${cleanBaseUrl}/auth/parent-setup?token=${firstInvitation.token}`
            : `${cleanBaseUrl}/auth/signin`

          await sendApplicationAcceptanceEmail({
            to: application.guardianEmail,
            orgName: org.name,
            parentName: application.guardianName,
            childrenNames,
            signupUrl
          })
        } catch (emailError) {
          console.error('Failed to send application acceptance email:', emailError)
          // Don't fail the request if email fails, but log it
        }
      } catch (error) {
        console.error('Error creating students from application:', error)
        // Don't fail the request, just log the error
        // The application status was already updated
      }
    }

    return NextResponse.json(updatedApplication)
  } catch (error) {
    console.error('Error updating application:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
