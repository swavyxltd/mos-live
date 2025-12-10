export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { requireRole, requireOrg } from '@/lib/roles'
import { prisma } from '@/lib/prisma'
import { AuditLogAction, AuditLogTargetType } from '@prisma/client'
import { logger } from '@/lib/logger'
import { withRateLimit } from '@/lib/api-middleware'
import { transformStudentData } from '@/lib/student-data-transform'
import crypto from 'crypto'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireRole(['ADMIN', 'OWNER', 'STAFF'])(request)
    if (session instanceof NextResponse) return session

    const orgId = await requireOrg(request)
    if (orgId instanceof NextResponse) return orgId

    const { id } = params

    const student = await prisma.student.findUnique({
      where: { id, orgId },
      include: {
        User: true,
        StudentClass: {
          include: {
            Class: {
              include: {
                User: true
              }
            }
          }
        }
      }
    })

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    // Transform student data using shared utility for consistency
    const transformedStudent = transformStudentData(student)
    
    // Add attendance data if needed (can be calculated separately)
    return NextResponse.json({
      ...transformedStudent,
      attendanceRate: 0, // TODO: Calculate from attendance records
      lastAttendance: new Date().toISOString() // TODO: Get from attendance records
    })
  } catch (error) {
    logger.error('Error fetching student', error)
    return NextResponse.json({ error: 'Failed to fetch student' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireRole(['ADMIN', 'OWNER'])(request)
    if (session instanceof NextResponse) return session

    const orgId = await requireOrg(request)
    if (orgId instanceof NextResponse) return orgId

    const { id } = params
    const updateData = await request.json()

    // Extract the fields we want to update
    const {
      firstName,
      lastName,
      dateOfBirth,
      grade,
      parentName,
      parentEmail,
      parentPhone,
      address,
      emergencyContact,
      allergies,
      medicalNotes,
      status,
      selectedClasses
    } = updateData

    // Get existing student to check if they have a parent
    const existingStudent = await prisma.student.findUnique({
      where: { id, orgId },
      include: { User: true }
    })

    if (!existingStudent) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    // Use transaction to ensure all updates are atomic
    const finalStudent = await prisma.$transaction(async (tx) => {
      // Handle parent update/create if parent info is provided
      let parentUserId = existingStudent.primaryParentId
      
      if (parentName || parentEmail || parentPhone) {
        if (existingStudent.primaryParentId) {
          // Update existing parent
          await tx.user.update({
            where: { id: existingStudent.primaryParentId },
            data: {
              ...(parentName && { name: parentName }),
              ...(parentEmail && { email: parentEmail }),
              ...(parentPhone && { phone: parentPhone })
            }
          })
          parentUserId = existingStudent.primaryParentId
        } else if (parentEmail) {
          // Create new parent if email is provided
          let parentUser = await tx.user.findUnique({
            where: { email: parentEmail.toLowerCase().trim() }
          })

          if (!parentUser) {
            parentUser = await tx.user.create({
              data: {
                id: crypto.randomUUID(),
                email: parentEmail.toLowerCase().trim(),
                name: parentName || '',
                phone: parentPhone || null
              }
            })

            // Add parent to organisation
            await tx.userOrgMembership.upsert({
              where: {
                userId_orgId: {
                  userId: parentUser.id,
                  orgId: orgId
                }
              },
              update: {},
              create: {
                userId: parentUser.id,
                orgId: orgId,
                role: 'PARENT'
              }
            })
          } else {
            // Update existing user
            await tx.user.update({
              where: { id: parentUser.id },
              data: {
                ...(parentName && { name: parentName }),
                ...(parentPhone && { phone: parentPhone })
              }
            })
          }
          parentUserId = parentUser.id
        }
      }

      // Update the student
      await tx.student.update({
        where: { id, orgId },
        data: {
          firstName,
          lastName,
          dob: dateOfBirth ? new Date(dateOfBirth) : null,
          allergies,
          medicalNotes,
          ...(parentUserId && { primaryParentId: parentUserId }),
          updatedAt: new Date()
        }
      })

      // Handle class enrollments if provided
      if (selectedClasses && Array.isArray(selectedClasses)) {
        // Remove existing class enrollments
        await tx.studentClass.deleteMany({
          where: { studentId: id }
        })

        // Add new class enrollments
        if (selectedClasses.length > 0) {
          // Batch create class enrollments
          await tx.studentClass.createMany({
            data: selectedClasses.map((classId: string) => ({
              id: `student-class-${id}-${classId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              studentId: id,
              classId: classId,
              orgId
            })),
            skipDuplicates: true
          })
        }
      }

      // Refetch student with all relations to return complete data
      return await tx.student.findUnique({
        where: { id, orgId },
        include: {
          User: true,
          StudentClass: {
            include: {
              Class: true
            }
          }
        }
      })
    })

    if (!finalStudent) {
      return NextResponse.json({ error: 'Student not found after update' }, { status: 404 })
    }

    // Create audit log
    try {
      await prisma.auditLog.create({
        data: {
          id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          orgId,
          actorUserId: session.user.id,
          action: AuditLogAction.UPDATE,
          targetType: AuditLogTargetType.STUDENT,
          targetId: finalStudent.id,
          data: JSON.stringify({
            studentName: `${finalStudent.firstName} ${finalStudent.lastName}`,
            updatedFields: Object.keys(updateData).filter(key => 
              !['id', 'isArchived', 'archivedAt', 'createdAt', 'updatedAt'].includes(key)
            )
          }),
        },
      })
    } catch (auditError) {
      logger.error('Error creating audit log', auditError)
      // Don't fail the request if audit log fails
    }

    // Transform response to match frontend expectations
    const transformedStudent = {
      id: finalStudent.id,
      firstName: finalStudent.firstName,
      lastName: finalStudent.lastName,
      dateOfBirth: finalStudent.dob ? finalStudent.dob.toISOString().split('T')[0] : null,
      allergies: finalStudent.allergies || null,
      medicalNotes: finalStudent.medicalNotes || null,
      parentName: finalStudent.User?.name || null,
      parentEmail: finalStudent.User?.email || null,
      parentPhone: finalStudent.User?.phone || null,
      classes: finalStudent.StudentClass.map(sc => ({
        id: sc.Class.id,
        name: sc.Class.name
      })),
      User: finalStudent.User,
      StudentClass: finalStudent.StudentClass
    }

    return NextResponse.json(transformedStudent)
  } catch (error) {
    logger.error('Error updating student', error)
    return NextResponse.json({ error: 'Failed to update student' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireRole(['ADMIN', 'OWNER'])(request)
    if (session instanceof NextResponse) return session

    const orgId = await requireOrg(request)
    if (orgId instanceof NextResponse) return orgId

    const { id } = params

    // Get student info before deletion for audit log
    const student = await prisma.student.findUnique({
      where: { id, orgId },
      select: { firstName: true, lastName: true }
    })

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    // Delete the student (this will cascade to related records)
    await prisma.student.delete({
      where: { id, orgId }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        orgId,
        actorUserId: session.user.id,
        action: AuditLogAction.DELETE,
        targetType: AuditLogTargetType.STUDENT,
        targetId: id,
        data: JSON.stringify({
          studentName: `${student.firstName} ${student.lastName}`,
        }),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('Error deleting student', error)
    return NextResponse.json({ error: 'Failed to delete student' }, { status: 500 })
  }
}
