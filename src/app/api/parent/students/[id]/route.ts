export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { getActiveOrg } from '@/lib/org'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const org = await getActiveOrg(session.user.id)
    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    const { id } = params

    // Verify the student belongs to the parent
    const student = await prisma.student.findUnique({
      where: { id, orgId: org.id },
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

    // Verify the parent owns this student
    if (student.primaryParentId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
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
      grade: student.grade || '',
      address: student.address || '',
      class: primaryClass?.name || 'N/A',
      teacher: teacherName,
      parentName: student.User?.name || '',
      parentEmail: student.User?.email || '',
      parentPhone: student.User?.phone || '',
      emergencyContact: student.emergencyContact || '',
      allergies: student.allergies || 'None',
      medicalNotes: student.medicalNotes || '',
      enrollmentDate: student.createdAt.toISOString(),
      status: 'ACTIVE',
      isArchived: student.isArchived,
      classes: student.StudentClass.map(sc => ({
        id: sc.Class.id,
        name: sc.Class.name
      }))
    }

    return NextResponse.json(transformedStudent)
  } catch (error) {
    logger.error('Error fetching student', error)
    return NextResponse.json({ error: 'Failed to fetch student' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const org = await getActiveOrg(session.user.id)
    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    const { id } = params
    const updateData = await request.json()

    // Extract the fields parents can update
    const {
      firstName,
      lastName,
      dateOfBirth,
      allergies,
      medicalNotes,
      emergencyContact,
      address
    } = updateData

    // Get existing student to verify ownership
    const existingStudent = await prisma.student.findUnique({
      where: { id, orgId: org.id },
      include: { User: true }
    })

    if (!existingStudent) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    // Verify the parent owns this student
    if (existingStudent.primaryParentId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Update the student (parents can only update certain fields)
    // Note: grade, address, and emergencyContact are not in the schema, so we skip them
    const updatedStudent = await prisma.student.update({
      where: { id, orgId: org.id },
      data: {
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(dateOfBirth && { dob: new Date(dateOfBirth) }),
        ...(allergies !== undefined && { allergies }),
        ...(medicalNotes !== undefined && { medicalNotes }),
        updatedAt: new Date()
      },
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

    // Calculate age
    const age = updatedStudent.dob 
      ? Math.floor((new Date().getTime() - new Date(updatedStudent.dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25))
      : 0

    // Get primary class
    const primaryClass = updatedStudent.StudentClass[0]?.Class || null
    const teacherName = primaryClass?.User?.name || 'N/A'

    // Transform response to match frontend expectations
    const transformedStudent = {
      id: updatedStudent.id,
      firstName: updatedStudent.firstName,
      lastName: updatedStudent.lastName,
      dateOfBirth: updatedStudent.dob ? updatedStudent.dob.toISOString().split('T')[0] : null,
      age,
      grade: updatedStudent.grade || '',
      address: updatedStudent.address || '',
      class: primaryClass?.name || 'N/A',
      teacher: teacherName,
      parentName: updatedStudent.User?.name || null,
      parentEmail: updatedStudent.User?.email || null,
      parentPhone: updatedStudent.User?.phone || null,
      emergencyContact: updatedStudent.emergencyContact || '',
      allergies: updatedStudent.allergies || null,
      medicalNotes: updatedStudent.medicalNotes || null,
      classes: updatedStudent.StudentClass.map(sc => ({
        id: sc.Class.id,
        name: sc.Class.name
      }))
    }

    // Dispatch refresh event for dynamic updates
    // This will be handled by the frontend

    return NextResponse.json(transformedStudent)
  } catch (error) {
    logger.error('Error updating student', error)
    return NextResponse.json({ error: 'Failed to update student' }, { status: 500 })
  }
}

