import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { AuditLogAction, AuditLogTargetType } from '@prisma/client'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    
    // Only allow super admins (owners)
    if (!session?.user?.id || !session.user.isSuperAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = params

    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        org: { select: { name: true, id: true } },
        primaryParent: {
          select: {
            name: true,
            email: true,
            phone: true
          }
        },
        studentClasses: {
          include: {
            class: {
              select: {
                id: true,
                name: true
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

    // Transform student data
    const transformedStudent = {
      id: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
      dateOfBirth: student.dob ? student.dob.toISOString().split('T')[0] : '',
      age,
      grade: '', // Grade not in schema
      address: '', // Address not in schema
      parentName: student.primaryParent?.name || '',
      parentEmail: student.primaryParent?.email || '',
      parentPhone: student.primaryParent?.phone || '',
      emergencyContact: '', // Emergency contact not in schema
      allergies: student.allergies || 'None',
      medicalNotes: student.medicalNotes || '',
      enrollmentDate: student.createdAt.toISOString().split('T')[0],
      status: student.isArchived ? 'INACTIVE' : 'ACTIVE',
      isArchived: student.isArchived,
      archivedAt: student.archivedAt ? student.archivedAt.toISOString() : null,
      orgId: student.orgId,
      orgName: student.org?.name || 'Unknown',
      createdAt: student.createdAt.toISOString(),
      updatedAt: student.updatedAt.toISOString(),
      classes: student.studentClasses.map(sc => ({
        id: sc.class.id,
        name: sc.class.name
      })),
      attendanceRate: 0, // TODO: Calculate from attendance records
      lastAttendance: new Date().toISOString()
    }

    return NextResponse.json(transformedStudent)
  } catch (error) {
    console.error('Error fetching student:', error)
    return NextResponse.json({ error: 'Failed to fetch student' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    
    // Only allow super admins (owners)
    if (!session?.user?.id || !session.user.isSuperAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = params
    const updateData = await request.json()

    // Extract the fields we want to update
    const {
      firstName,
      lastName,
      dateOfBirth,
      allergies,
      medicalNotes,
      parentName,
      parentEmail,
      parentPhone,
      selectedClasses
    } = updateData

    // Get the student first to get orgId
    const existingStudent = await prisma.student.findUnique({
      where: { id },
      include: {
        primaryParent: true
      }
    })

    if (!existingStudent) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    const orgId = existingStudent.orgId

    // Update parent if provided and parent exists
    if (existingStudent.primaryParentId && (parentName || parentEmail || parentPhone)) {
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
    }

    // Update the student
    const updatedStudent = await prisma.student.update({
      where: { id },
      data: {
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(dateOfBirth && { dob: new Date(dateOfBirth) }),
        ...(allergies !== undefined && { allergies }),
        ...(medicalNotes !== undefined && { medicalNotes }),
        updatedAt: new Date()
      },
      include: {
        org: { select: { name: true } },
        primaryParent: {
          select: {
            name: true,
            email: true,
            phone: true
          }
        },
        studentClasses: {
          include: {
            class: {
              select: {
                id: true,
                name: true
              }
            }
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
    try {
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
              !['id', 'isArchived', 'archivedAt', 'createdAt', 'updatedAt', 'selectedClasses'].includes(key)
            )
          },
        },
      })
    } catch (auditError) {
      console.error('Error creating audit log:', auditError)
      // Don't fail the request if audit log fails
    }

    // Refetch to get latest data including updated classes
    const finalStudent = await prisma.student.findUnique({
      where: { id },
      include: {
        org: { select: { name: true } },
        primaryParent: {
          select: {
            name: true,
            email: true,
            phone: true
          }
        },
        studentClasses: {
          include: {
            class: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    })

    if (!finalStudent) {
      return NextResponse.json({ error: 'Student not found after update' }, { status: 404 })
    }

    // Transform response
    const transformedStudent = {
      id: finalStudent.id,
      firstName: finalStudent.firstName,
      lastName: finalStudent.lastName,
      dateOfBirth: finalStudent.dob ? finalStudent.dob.toISOString().split('T')[0] : '',
      allergies: finalStudent.allergies || 'None',
      medicalNotes: finalStudent.medicalNotes || '',
      parentName: finalStudent.primaryParent?.name || '',
      parentEmail: finalStudent.primaryParent?.email || '',
      parentPhone: finalStudent.primaryParent?.phone || '',
      orgId: finalStudent.orgId,
      orgName: finalStudent.org?.name || 'Unknown',
      classes: finalStudent.studentClasses.map((sc: any) => ({
        id: sc.class.id,
        name: sc.class.name
      }))
    }

    return NextResponse.json(transformedStudent)
  } catch (error: any) {
    console.error('Error updating student:', error)
    return NextResponse.json(
      { error: 'Failed to update student', details: error.message },
      { status: 500 }
    )
  }
}

