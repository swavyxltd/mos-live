export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { requireRole, requireOrg } from '@/lib/roles'
import { prisma } from '@/lib/prisma'
import { AuditLogAction, AuditLogTargetType } from '@prisma/client'

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

    // Calculate age
    const age = student.dob 
      ? Math.floor((new Date().getTime() - new Date(student.dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25))
      : 0

    // Get primary class (first one or default)
    const primaryClass = student.StudentClass[0]?.Class || null
    const teacherName = primaryClass?.User?.name || 'N/A'

    // Transform student data
    const transformedStudent = {
      id: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
      dateOfBirth: student.dob ? student.dob.toISOString().split('T')[0] : '',
      age,
      grade: '', // Grade not in schema - using empty string
      address: '', // Address not in schema - using empty string
      class: primaryClass?.name || 'N/A',
      teacher: teacherName,
      parentName: student.User?.name || '',
      parentEmail: student.User?.email || '',
      parentPhone: student.User?.phone || '',
      emergencyContact: '', // Emergency contact not in schema - using empty string
      allergies: student.allergies || 'None',
      medicalNotes: student.medicalNotes || '',
      enrollmentDate: student.createdAt.toISOString(), // Using createdAt as enrollmentDate
      status: 'ACTIVE', // Status not in schema - defaulting to ACTIVE
      isArchived: student.isArchived,
      archivedAt: student.archivedAt ? student.archivedAt.toISOString() : null,
      createdAt: student.createdAt.toISOString(),
      classes: student.StudentClass.map(sc => ({
        id: sc.Class.id,
        name: sc.Class.name
      })),
      attendanceRate: 0, // TODO: Calculate from attendance records
      lastAttendance: new Date().toISOString() // TODO: Get from attendance records
    }

    return NextResponse.json(transformedStudent)
  } catch (error) {
    console.error('Error fetching student:', error)
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

    // Handle parent update/create if parent info is provided
    if (parentName || parentEmail || parentPhone) {
      if (existingStudent.primaryParentId) {
        // Update existing parent
        try {
          await prisma.user.update({
            where: { id: existingStudent.primaryParentId },
            data: {
              ...(parentName && { name: parentName }),
              ...(parentEmail && { email: parentEmail }),
              ...(parentPhone && { phone: parentPhone })
            }
          })
        } catch (parentError) {
          console.error('Error updating parent:', parentError)
          // Don't fail the entire request if parent update fails
        }
      } else if (parentEmail) {
        // Create new parent if email is provided
        try {
          let parentUser = await prisma.user.findUnique({
            where: { email: parentEmail.toLowerCase().trim() }
          })

          if (!parentUser) {
            parentUser = await prisma.user.create({
              data: {
                email: parentEmail.toLowerCase().trim(),
                name: parentName || '',
                phone: parentPhone || null
              }
            })

            // Add parent to organization
            await prisma.userOrgMembership.upsert({
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
            await prisma.user.update({
              where: { id: parentUser.id },
              data: {
                ...(parentName && { name: parentName }),
                ...(parentPhone && { phone: parentPhone })
              }
            })
          }

          // Link student to parent
          await prisma.student.update({
            where: { id },
            data: { primaryParentId: parentUser.id }
          })
        } catch (parentError) {
          console.error('Error creating/updating parent:', parentError)
          // Don't fail the entire request if parent creation fails
        }
      }
    }

    // Update the student
    const updatedStudent = await prisma.student.update({
      where: { id, orgId },
      data: {
        firstName,
        lastName,
        dob: dateOfBirth ? new Date(dateOfBirth) : null,
        allergies,
        medicalNotes,
        updatedAt: new Date()
      },
      include: {
        User: true,
        StudentClass: {
          include: {
            Class: true
          }
        }
      }
    })

    // Handle class enrollments if provided
    if (selectedClasses && Array.isArray(selectedClasses)) {
      // Remove existing class enrollments
      await prisma.studentClass.deleteMany({
        where: { studentId: id }
      })

      // Add new class enrollments
      if (selectedClasses.length > 0) {
        // Use individual creates to ensure IDs are generated
        for (const classId of selectedClasses) {
          await prisma.studentClass.upsert({
            where: {
              studentId_classId: {
                studentId: id,
                classId: classId
              }
            },
            update: {},
            create: {
              id: `student-class-${id}-${classId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              studentId: id,
              classId: classId,
              orgId
            }
          })
        }
      }
    }

    // Refetch student with all relations to return complete data
    const finalStudent = await prisma.student.findUnique({
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
      console.error('Error creating audit log:', auditError)
      // Don't fail the request if audit log fails
    }

    return NextResponse.json(finalStudent)
  } catch (error) {
    console.error('Error updating student:', error)
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
    console.error('Error deleting student:', error)
    return NextResponse.json({ error: 'Failed to delete student' }, { status: 500 })
  }
}
