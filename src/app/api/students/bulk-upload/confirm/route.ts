import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getActiveOrg } from '@/lib/org'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'
import { sendParentOnboardingEmail } from '@/lib/mail'
import { logger } from '@/lib/logger'
import { withRateLimit } from '@/lib/api-middleware'

interface StudentData {
  firstName: string
  lastName: string
  parentEmail: string
  parentPhone?: string
  startMonth: string
  classId: string
  rowNumber: number
  isDuplicate?: boolean
  existingStudentId?: string
}

async function handlePOST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const org = await getActiveOrg()
    if (!org) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const { students }: { students: StudentData[] } = body

    if (!students || !Array.isArray(students) || students.length === 0) {
      return NextResponse.json(
        { error: 'No students provided' },
        { status: 400 }
      )
    }

    // Validate all students have classId
    const studentsWithoutClass = students.filter(s => !s.classId)
    if (studentsWithoutClass.length > 0) {
      return NextResponse.json(
        { error: `Students in rows ${studentsWithoutClass.map(s => s.rowNumber).join(', ')} do not have a class selected` },
        { status: 400 }
      )
    }

    const results = {
      created: [] as any[],
      updated: [] as any[],
      errors: [] as { rowNumber: number; error: string }[],
      invitationsSent: 0
    }

    const baseUrl = process.env.APP_BASE_URL || process.env.NEXTAUTH_URL || 'https://app.madrasah.io'

    // Optimize: Pre-fetch all classes once instead of querying for each student
    const allClasses = await prisma.class.findMany({
      where: { orgId: org.id, isArchived: false },
      select: {
        id: true,
        monthlyFeeP: true
      }
    })
    const classMap = new Map(allClasses.map(c => [c.id, c]))

    // Process each student
    for (const studentData of students) {
      try {
        // Get class from pre-fetched map instead of querying
        const classRecord = classMap.get(studentData.classId)

        if (!classRecord) {
          results.errors.push({
            rowNumber: studentData.rowNumber,
            error: 'Class not found'
          })
          continue
        }

        if (!classRecord.monthlyFeeP || classRecord.monthlyFeeP <= 0) {
          results.errors.push({
            rowNumber: studentData.rowNumber,
            error: 'Class does not have a monthly fee set'
          })
          continue
        }

        // Use transaction for each student
        const result = await prisma.$transaction(async (tx) => {
          // Handle duplicate (update existing)
          if (studentData.isDuplicate && studentData.existingStudentId) {
            // Update existing student (only firstName and lastName, matching single add modal)
            const updatedStudent = await tx.student.update({
              where: { id: studentData.existingStudentId },
              data: {
                firstName: studentData.firstName.trim(),
                lastName: studentData.lastName.trim()
              }
            })

            // Find or create parent user (only email initially, parent will provide name/phone during signup)
            let parentUser = await tx.user.findUnique({
              where: { email: studentData.parentEmail.toLowerCase().trim() }
            })

            if (!parentUser) {
              parentUser = await tx.user.create({
                data: {
                  email: studentData.parentEmail.toLowerCase().trim(),
                  phone: studentData.parentPhone || undefined // Optional phone if provided
                }
              })

              await tx.userOrgMembership.create({
                data: {
                  userId: parentUser.id,
                  orgId: org.id,
                  role: 'PARENT'
                }
              })
            } else {
              // Update parent phone if provided
              if (studentData.parentPhone) {
                await tx.user.update({
                  where: { id: parentUser.id },
                  data: {
                    phone: studentData.parentPhone
                  }
                })
              }
            }

            // Link student to parent
            await tx.student.update({
              where: { id: studentData.existingStudentId },
              data: {
                primaryParentId: parentUser.id
              }
            })

            // Check if student is already enrolled in class
            const existingEnrollment = await tx.studentClass.findFirst({
              where: {
                studentId: studentData.existingStudentId,
                classId: studentData.classId
              }
            })

            if (!existingEnrollment) {
              await tx.studentClass.create({
                data: {
                  orgId: org.id,
                  studentId: studentData.existingStudentId,
                  classId: studentData.classId
                }
              })
            }

            return { student: updatedStudent, parentUser, isUpdate: true }
          } else {
            // Create new student (matching single "Add Student" modal flow)
            // Find or create parent user (only email initially, parent will provide name/phone during signup)
            let parentUser = await tx.user.findUnique({
              where: { email: studentData.parentEmail.toLowerCase().trim() }
            })

            if (!parentUser) {
              parentUser = await tx.user.create({
                data: {
                  email: studentData.parentEmail.toLowerCase().trim(),
                  phone: studentData.parentPhone || undefined // Optional phone if provided
                }
              })

              await tx.userOrgMembership.create({
                data: {
                  userId: parentUser.id,
                  orgId: org.id,
                  role: 'PARENT'
                }
              })
            } else {
              // Update parent phone if provided
              if (studentData.parentPhone) {
                await tx.user.update({
                  where: { id: parentUser.id },
                  data: {
                    phone: studentData.parentPhone
                  }
                })
              }
            }

            // Create student (only firstName and lastName, matching single add modal)
            const student = await tx.student.create({
              data: {
                orgId: org.id,
                firstName: studentData.firstName.trim(),
                lastName: studentData.lastName.trim(),
                primaryParentId: parentUser.id
              }
            })

            // Enroll in class
            await tx.studentClass.create({
              data: {
                orgId: org.id,
                studentId: student.id,
                classId: studentData.classId
              }
            })

            // Create parent invitation
            const token = crypto.randomBytes(32).toString('hex')
            const expiresAt = new Date()
            expiresAt.setDate(expiresAt.getDate() + 7) // 7 days

            const invitation = await tx.parentInvitation.create({
              data: {
                orgId: org.id,
                studentId: student.id,
                parentEmail: studentData.parentEmail.toLowerCase().trim(),
                token,
                expiresAt
              }
            })

            // Get parent's preferred payment method if parent exists
            let preferredMethod: string | null = null
            if (student.primaryParentId) {
              const billingProfile = await tx.parentBillingProfile.findUnique({
                where: {
                  orgId_parentUserId: {
                    orgId: org.id,
                    parentUserId: student.primaryParentId
                  }
                },
                select: { preferredPaymentMethod: true }
              })
              preferredMethod = billingProfile?.preferredPaymentMethod || null
            }

            // Create payment record for start month
            await tx.monthlyPaymentRecord.create({
              data: {
                orgId: org.id,
                studentId: student.id,
                classId: studentData.classId,
                month: studentData.startMonth,
                amountP: classRecord.monthlyFeeP,
                status: 'PENDING',
                method: preferredMethod
              }
            })

            // Send parent onboarding email
            const setupUrl = `${baseUrl.replace(/\/$/, '')}/auth/parent-setup?token=${token}`
            try {
              await sendParentOnboardingEmail({
                to: studentData.parentEmail,
                orgName: org.name,
                studentName: `${studentData.firstName} ${studentData.lastName}`,
                setupUrl
              })
            } catch (emailError: any) {
              logger.error('Failed to send parent onboarding email', emailError)
              // Don't fail the transaction if email fails
            }

            return { student, parentUser, invitation, isUpdate: false }
          }
        })

        if (result.isUpdate) {
          results.updated.push({
            rowNumber: studentData.rowNumber,
            studentName: `${studentData.firstName} ${studentData.lastName}`
          })
        } else {
          results.created.push({
            rowNumber: studentData.rowNumber,
            studentName: `${studentData.firstName} ${studentData.lastName}`,
            studentId: result.student.id
          })
          results.invitationsSent++
        }
      } catch (error: any) {
        results.errors.push({
          rowNumber: studentData.rowNumber,
          error: error.message || 'Failed to create student'
        })
      }
    }

    return NextResponse.json({
      success: true,
      results,
      summary: {
        total: students.length,
        created: results.created.length,
        updated: results.updated.length,
        errors: results.errors.length,
        invitationsSent: results.invitationsSent
      }
    })
  } catch (error: any) {
    logger.error('Error confirming bulk upload', error)
    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      { 
        error: 'Failed to create students',
        ...(isDevelopment && { details: error?.message })
      },
      { status: 500 }
    )
  }
}

export const POST = withRateLimit(handlePOST, { upload: true })

