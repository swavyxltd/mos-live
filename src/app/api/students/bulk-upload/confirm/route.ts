import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getActiveOrg } from '@/lib/org'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'
import { sendParentOnboardingEmail } from '@/lib/mail'
import { logger } from '@/lib/logger'
import { withRateLimit } from '@/lib/api-middleware'
import { isValidName, isValidEmailStrict, isValidDateOfBirth } from '@/lib/input-validation'

interface StudentData {
  firstName: string
  lastName: string
  email?: string
  dob: string
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
        { error: 'Organisation not found' },
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
        // Validate student data
        if (!isValidName(studentData.firstName.trim())) {
          results.errors.push({
            rowNumber: studentData.rowNumber,
            error: 'First name must be a valid name (2-50 characters, letters only)'
          })
          continue
        }
        
        if (!isValidName(studentData.lastName.trim())) {
          results.errors.push({
            rowNumber: studentData.rowNumber,
            error: 'Last name must be a valid name (2-50 characters, letters only)'
          })
          continue
        }
        
        // Email is optional but validate if provided
        if (studentData.email && studentData.email.trim()) {
          if (!isValidEmailStrict(studentData.email.trim())) {
            results.errors.push({
              rowNumber: studentData.rowNumber,
              error: 'Email must be a valid email address'
            })
            continue
          }
        }
        
        // DOB is required
        if (!studentData.dob || !studentData.dob.trim()) {
          results.errors.push({
            rowNumber: studentData.rowNumber,
            error: 'Date of birth is required'
          })
          continue
        }
        
        if (!isValidDateOfBirth(studentData.dob.trim())) {
          results.errors.push({
            rowNumber: studentData.rowNumber,
            error: 'Date of birth must be a valid date (not in the future, age 0-120 years)'
          })
          continue
        }

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
            // Update existing student with new data
            const updatedStudent = await tx.student.update({
              where: { id: studentData.existingStudentId },
              data: {
                firstName: studentData.firstName.trim(),
                lastName: studentData.lastName.trim(),
                dob: new Date(studentData.dob.trim())
              }
            })

            // Only create parent user and link if email is provided
            let parentUser = null
            if (studentData.email && studentData.email.trim()) {
              const sanitizedEmail = studentData.email.toLowerCase().trim()
              parentUser = await tx.user.findUnique({
                where: { email: sanitizedEmail }
              })

              if (parentUser) {
                // Email already exists - cannot create duplicate
                // Same email cannot be used again across entire app for any account type
                throw new Error(`This email address (${sanitizedEmail}) is already associated with an account. Please use a different email address or link to the existing account.`)
              }

              // Email doesn't exist - create new user
              try {
                parentUser = await tx.user.create({
                  data: {
                    id: crypto.randomUUID(),
                    email: sanitizedEmail,
                    updatedAt: new Date()
                  }
                })
              } catch (createError: any) {
                // Handle unique constraint violation (race condition)
                if (createError.code === 'P2002') {
                  // User was created between our check and create, fetch it
                  parentUser = await tx.user.findUnique({
                    where: { email: sanitizedEmail }
                  })
                  if (!parentUser) {
                    throw new Error('This email address is already in use. Please use a different email address.')
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

              // Link student to parent
              await tx.student.update({
                where: { id: studentData.existingStudentId },
                data: {
                  primaryParentId: parentUser.id
                }
              })
            }
          }

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
                id: crypto.randomUUID(),
                orgId: org.id,
                studentId: studentData.existingStudentId,
                classId: studentData.classId
              }
            })
          }

          return { student: updatedStudent, parentUser, isUpdate: true }
          } else {
            // Create new student
            // Only create parent user if email is provided
            let parentUser = null
            let invitation = null
            
            if (studentData.email && studentData.email.trim()) {
              const sanitizedEmail = studentData.email.toLowerCase().trim()
              parentUser = await tx.user.findUnique({
                where: { email: sanitizedEmail }
              })

              if (parentUser) {
                // Email already exists - cannot create duplicate
                // Same email cannot be used again across entire app for any account type
                throw new Error(`This email address (${sanitizedEmail}) is already associated with an account. Please use a different email address or link to the existing account.`)
              }

              // Email doesn't exist - create new user
              try {
                parentUser = await tx.user.create({
                  data: {
                    id: crypto.randomUUID(),
                    email: sanitizedEmail,
                    updatedAt: new Date()
                  }
                })
              } catch (createError: any) {
                // Handle unique constraint violation (race condition)
                if (createError.code === 'P2002') {
                  // User was created between our check and create, fetch it
                  parentUser = await tx.user.findUnique({
                    where: { email: sanitizedEmail }
                  })
                  if (!parentUser) {
                    throw new Error('This email address is already in use. Please use a different email address.')
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

            // Create student with DOB
            const student = await tx.student.create({
              data: {
                id: crypto.randomUUID(),
                orgId: org.id,
                firstName: studentData.firstName.trim(),
                lastName: studentData.lastName.trim(),
                dob: new Date(studentData.dob.trim()),
                primaryParentId: parentUser?.id || null,
                claimStatus: parentUser ? 'NOT_CLAIMED' : 'UNVERIFIED',
                updatedAt: new Date()
              }
            })

            // Enroll in class
            await tx.studentClass.create({
              data: {
                id: crypto.randomUUID(),
                orgId: org.id,
                studentId: student.id,
                classId: studentData.classId
              }
            })

            // Create parent invitation only if email is provided
            if (studentData.email && studentData.email.trim() && parentUser) {
              const token = crypto.randomBytes(32).toString('hex')
              const expiresAt = new Date()
              expiresAt.setDate(expiresAt.getDate() + 7) // 7 days

              invitation = await tx.parentInvitation.create({
                data: {
                  id: crypto.randomUUID(),
                  orgId: org.id,
                  studentId: student.id,
                  parentEmail: studentData.email.toLowerCase().trim(),
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
                  id: crypto.randomUUID(),
                  orgId: org.id,
                  studentId: student.id,
                  classId: studentData.classId,
                  month: studentData.startMonth,
                  amountP: classRecord.monthlyFeeP,
                  status: 'PENDING',
                  method: preferredMethod,
                  updatedAt: new Date()
                }
              })

              // Send parent onboarding email
              const setupUrl = `${baseUrl.replace(/\/$/, '')}/auth/parent-setup?token=${token}`
              try {
                await sendParentOnboardingEmail({
                  to: studentData.email,
                  orgName: org.name,
                  studentName: `${studentData.firstName} ${studentData.lastName}`,
                  setupUrl
                })
              } catch (emailError: any) {
                logger.error('Failed to send parent onboarding email', emailError)
                // Don't fail the transaction if email fails
              }
            } else {
              // Create payment record even without email (parent can claim later)
              await tx.monthlyPaymentRecord.create({
                data: {
                  id: crypto.randomUUID(),
                  orgId: org.id,
                  studentId: student.id,
                  classId: studentData.classId,
                  month: studentData.startMonth,
                  amountP: classRecord.monthlyFeeP,
                  status: 'PENDING',
                  method: null,
                  updatedAt: new Date()
                }
              })
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

