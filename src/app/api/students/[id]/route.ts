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
        primaryParent: true,
        studentClasses: {
          include: {
            class: {
              include: {
                teacher: {
                  include: {
                    user: true
                  }
                }
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
    const primaryClass = student.studentClasses[0]?.class || null
    const teacherName = primaryClass?.teacher?.user?.name || 'N/A'

    // Transform student data
    const transformedStudent = {
      id: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
      dateOfBirth: student.dob ? student.dob.toISOString().split('T')[0] : '',
      age,
      grade: student.grade || '',
      address: student.address || '',
      class: primaryClass?.name || 'N/A',
      teacher: teacherName,
      parentName: student.primaryParent?.name || '',
      parentEmail: student.primaryParent?.email || '',
      parentPhone: student.primaryParent?.phone || '',
      emergencyContact: student.emergencyContact || '',
      allergies: student.allergies || 'None',
      medicalNotes: student.medicalNotes || '',
      enrollmentDate: student.enrollmentDate 
        ? student.enrollmentDate.toISOString() 
        : student.createdAt.toISOString(),
      status: student.status || 'ACTIVE',
      isArchived: student.isArchived,
      archivedAt: student.archivedAt ? student.archivedAt.toISOString() : null,
      classes: student.studentClasses.map(sc => ({
        id: sc.class.id,
        name: sc.class.name
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

    // Update the student
    const updatedStudent = await prisma.student.update({
      where: { id, orgId },
      data: {
        firstName,
        lastName,
        dob: dateOfBirth ? new Date(dateOfBirth) : null,
        grade,
        primaryParent: {
          update: {
            name: parentName,
            email: parentEmail,
            phone: parentPhone,
          }
        },
        address,
        emergencyContact,
        allergies,
        medicalNotes,
        status,
        updatedAt: new Date()
      },
      include: {
        primaryParent: true,
        studentClasses: {
          include: {
            class: true
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
        await prisma.studentClass.createMany({
          data: selectedClasses.map((classId: string) => ({
            studentId: id,
            classId,
            orgId
          }))
        })
      }
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        orgId,
        actorUserId: session.user.id,
        action: AuditLogAction.UPDATE,
        targetType: AuditLogTargetType.STUDENT,
        targetId: updatedStudent.id,
        data: {
          studentName: `${updatedStudent.firstName} ${updatedStudent.lastName}`,
          updatedFields: Object.keys(updateData).filter(key => 
            !['id', 'isArchived', 'archivedAt', 'createdAt', 'updatedAt'].includes(key)
          )
        },
      },
    })

    return NextResponse.json(updatedStudent)
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
        orgId,
        actorUserId: session.user.id,
        action: AuditLogAction.DELETE,
        targetType: AuditLogTargetType.STUDENT,
        targetId: id,
        data: {
          studentName: `${student.firstName} ${student.lastName}`,
        },
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting student:', error)
    return NextResponse.json({ error: 'Failed to delete student' }, { status: 500 })
  }
}
