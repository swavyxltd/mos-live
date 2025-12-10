export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { getActiveOrg } from '@/lib/org'
import { transformStudentData } from '@/lib/student-data-transform'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const org = await getActiveOrg(session.user.id)
    if (!org) {
      return NextResponse.json({ error: 'Organisation not found' }, { status: 404 })
    }

    // Verify user is a PARENT in this organisation
    const { getUserRoleInOrg } = await import('@/lib/org')
    const userRole = await getUserRoleInOrg(session.user.id, org.id)
    
    if (userRole !== 'PARENT') {
      return NextResponse.json({ error: 'Unauthorized - Parent access required' }, { status: 403 })
    }

    // Resolve params if it's a Promise (Next.js 15+)
    const resolvedParams = params instanceof Promise ? await params : params
    const { id } = resolvedParams
    
    if (!id) {
      return NextResponse.json({ error: 'Student ID is required' }, { status: 400 })
    }

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
      return NextResponse.json({ error: 'Unauthorized - You can only access your own children' }, { status: 403 })
    }

    // Transform student data using shared utility for consistency
    const transformedStudent = transformStudentData(student)

    return NextResponse.json(transformedStudent)
  } catch (error) {
    logger.error('Error fetching student', error)
    return NextResponse.json({ error: 'Failed to fetch student' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const org = await getActiveOrg(session.user.id)
    if (!org) {
      return NextResponse.json({ error: 'Organisation not found' }, { status: 404 })
    }

    // Verify user is a PARENT in this organisation
    const { getUserRoleInOrg } = await import('@/lib/org')
    const userRole = await getUserRoleInOrg(session.user.id, org.id)
    
    if (userRole !== 'PARENT') {
      return NextResponse.json({ error: 'Unauthorized - Parent access required' }, { status: 403 })
    }

    // Resolve params if it's a Promise (Next.js 15+)
    const resolvedParams = params instanceof Promise ? await params : params
    const { id } = resolvedParams
    
    if (!id) {
      return NextResponse.json({ error: 'Student ID is required' }, { status: 400 })
    }
    const updateData = await request.json()

    // Import validation functions
    const { isValidName, isValidDateOfBirth, isValidAddressLine } = await import('@/lib/input-validation')
    
    // Extract the fields parents can update
    const {
      firstName,
      lastName,
      dateOfBirth,
      allergies,
      medicalNotes,
      address
    } = updateData

    // Validate first name if provided
    if (firstName && !isValidName(firstName.trim())) {
      return NextResponse.json(
        { error: 'First name must be a valid name (2-50 characters, letters only)' },
        { status: 400 }
      )
    }

    // Validate last name if provided
    if (lastName && !isValidName(lastName.trim())) {
      return NextResponse.json(
        { error: 'Last name must be a valid name (2-50 characters, letters only)' },
        { status: 400 }
      )
    }

    // Validate date of birth if provided
    if (dateOfBirth && !isValidDateOfBirth(dateOfBirth)) {
      return NextResponse.json(
        { error: 'Date of birth must be a valid date (not in the future, age 0-120 years)' },
        { status: 400 }
      )
    }

    // Validate address if provided
    if (address && address.trim() && !isValidAddressLine(address.trim())) {
      return NextResponse.json(
        { error: 'Address must be a valid address (5-100 characters)' },
        { status: 400 }
      )
    }

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
      return NextResponse.json({ error: 'Unauthorized - You can only update your own children' }, { status: 403 })
    }

    // Update the student (parents can only update certain fields)
    // Note: grade and address are not in the schema, so we skip them
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

    // Transform response using shared utility for consistency
    const transformedStudent = transformStudentData(updatedStudent)

    // Dispatch refresh event for dynamic updates
    // This will be handled by the frontend

    return NextResponse.json(transformedStudent)
  } catch (error) {
    logger.error('Error updating student', error)
    return NextResponse.json({ error: 'Failed to update student' }, { status: 500 })
  }
}

