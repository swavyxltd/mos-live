import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getActiveOrg } from '@/lib/org'
import { prisma } from '@/lib/prisma'
import { parse } from 'csv-parse/sync'

interface CSVRow {
  firstName: string
  lastName: string
  dateOfBirth?: string
  gender?: string
  parentName: string
  parentEmail: string
  parentPhone?: string
  address?: string
  allergies?: string
  medicalNotes?: string
  startMonth?: string
}

interface ValidatedRow extends CSVRow {
  rowNumber: number
  isValid: boolean
  errors: string[]
  isDuplicate?: boolean
  existingStudentId?: string
}

export async function POST(request: NextRequest) {
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

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      )
    }

    // Read file content
    const fileContent = await file.text()

    // Parse CSV
    let rows: any[]
    try {
      rows = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        cast: true,
      })
    } catch (parseError) {
      return NextResponse.json(
        { error: 'Invalid CSV format. Please check your file and try again.' },
        { status: 400 }
      )
    }

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'CSV file is empty' },
        { status: 400 }
      )
    }

    // Get all existing students to check for duplicates
    const existingStudents = await prisma.student.findMany({
      where: { orgId: org.id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        primaryParent: {
          select: {
            email: true
          }
        }
      }
    })

    // Validate each row
    const validatedRows: ValidatedRow[] = rows.map((row, index) => {
      const rowNumber = index + 2 // +2 because CSV is 1-indexed and has header
      const errors: string[] = []
      const validated: ValidatedRow = {
        ...row,
        rowNumber,
        isValid: false,
        errors: []
      }

      // Required fields validation
      if (!row.firstName || !row.firstName.trim()) {
        errors.push('First name is required')
      }
      if (!row.lastName || !row.lastName.trim()) {
        errors.push('Last name is required')
      }
      if (!row.parentName || !row.parentName.trim()) {
        errors.push('Parent name is required')
      }
      if (!row.parentEmail || !row.parentEmail.trim()) {
        errors.push('Parent email is required')
      } else {
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(row.parentEmail.trim())) {
          errors.push('Invalid parent email format')
        }
      }

      // Optional field validation
      if (row.dateOfBirth) {
        const dobRegex = /^\d{4}-\d{2}-\d{2}$/
        if (!dobRegex.test(row.dateOfBirth)) {
          errors.push('Date of birth must be in YYYY-MM-DD format')
        }
      }

      if (row.startMonth) {
        const monthRegex = /^\d{4}-\d{2}$/
        if (!monthRegex.test(row.startMonth)) {
          errors.push('Start month must be in YYYY-MM format')
        }
      }

      if (row.gender && !['Male', 'Female', 'male', 'female', 'M', 'F', 'm', 'f'].includes(row.gender)) {
        errors.push('Gender must be Male, Female, M, or F')
      }

      // Check for duplicates (by firstName + lastName + parentEmail)
      const duplicate = existingStudents.find(s => 
        s.firstName.toLowerCase().trim() === (row.firstName || '').toLowerCase().trim() &&
        s.lastName.toLowerCase().trim() === (row.lastName || '').toLowerCase().trim() &&
        s.primaryParent?.email?.toLowerCase().trim() === (row.parentEmail || '').toLowerCase().trim()
      )

      if (duplicate) {
        validated.isDuplicate = true
        validated.existingStudentId = duplicate.id
        // Don't add duplicate as error - it's allowed for manual update
      }

      validated.errors = errors
      validated.isValid = errors.length === 0

      return validated
    })

    // Return validated rows for review
    return NextResponse.json({
      success: true,
      rows: validatedRows,
      totalRows: validatedRows.length,
      validRows: validatedRows.filter(r => r.isValid && !r.isDuplicate).length,
      invalidRows: validatedRows.filter(r => !r.isValid).length,
      duplicateRows: validatedRows.filter(r => r.isDuplicate).length
    })
  } catch (error: any) {
    console.error('Error processing CSV:', error)
    return NextResponse.json(
      { error: 'Failed to process CSV file', details: error.message },
      { status: 500 }
    )
  }
}

