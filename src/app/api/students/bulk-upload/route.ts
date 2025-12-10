import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getActiveOrg } from '@/lib/org'
import { prisma } from '@/lib/prisma'
import { parse } from 'csv-parse/sync'
import { logger } from '@/lib/logger'
import { withRateLimit } from '@/lib/api-middleware'
import { isValidName, isValidEmailStrict, isValidPhone } from '@/lib/input-validation'

interface CSVRow {
  firstName: string
  lastName: string
  parentEmail: string
  parentPhone?: string
}

interface ValidatedRow extends CSVRow {
  rowNumber: number
  isValid: boolean
  errors: string[]
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

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      )
    }

    // Validate file upload
    const { validateFileUpload, MAX_FILE_SIZE, ALLOWED_CSV_TYPES } = await import('@/lib/input-validation')
    const fileValidation = validateFileUpload(file, ALLOWED_CSV_TYPES, MAX_FILE_SIZE)
    if (!fileValidation.valid) {
      return NextResponse.json(
        { error: fileValidation.error || 'Invalid file' },
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

    // Optimize duplicate checking: Create a Map for O(1) lookup instead of O(n) find
    // Only fetch what we need for duplicate checking (exclude archived)
    const existingStudents = await prisma.student.findMany({
      where: { orgId: org.id, isArchived: false },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        User: {
          select: {
            email: true
          }
        }
      }
    })

    // Create a Map for fast duplicate lookup: key = "firstName|lastName|parentEmail"
    const duplicateMap = new Map<string, { id: string }>()
    existingStudents.forEach(student => {
      const key = `${student.firstName.toLowerCase().trim()}|${student.lastName.toLowerCase().trim()}|${student.User?.email?.toLowerCase().trim() || ''}`
      duplicateMap.set(key, { id: student.id })
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

      // Skip example rows (marked with EXAMPLE prefix)
      if (row.firstName && row.firstName.trim().toUpperCase().startsWith('EXAMPLE')) {
        validated.isValid = false
        validated.errors = ['This is an example row - please delete it before uploading']
        return validated
      }

      // Required fields validation (matching single "Add Student" modal)
      if (!row.firstName || !row.firstName.trim()) {
        errors.push('First name is required')
      } else if (!isValidName(row.firstName.trim())) {
        errors.push('First name must be a valid name (2-50 characters, letters only)')
      }
      
      if (!row.lastName || !row.lastName.trim()) {
        errors.push('Last name is required')
      } else if (!isValidName(row.lastName.trim())) {
        errors.push('Last name must be a valid name (2-50 characters, letters only)')
      }
      
      if (!row.parentEmail || !row.parentEmail.trim()) {
        errors.push('Parent email is required')
      } else if (!isValidEmailStrict(row.parentEmail.trim())) {
        errors.push('Invalid parent email format')
      }

      // parentPhone is optional but validate if provided
      if (row.parentPhone && row.parentPhone.trim() && !isValidPhone(row.parentPhone.trim())) {
        errors.push('Invalid parent phone number format (must be a valid UK phone number)')
      }

      // Check for duplicates using optimized Map lookup (O(1) instead of O(n))
      const duplicateKey = `${(row.firstName || '').toLowerCase().trim()}|${(row.lastName || '').toLowerCase().trim()}|${(row.parentEmail || '').toLowerCase().trim()}`
      const duplicate = duplicateMap.get(duplicateKey)

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
    logger.error('Error processing CSV', error)
    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      { 
        error: 'Failed to process CSV file',
        ...(isDevelopment && { details: error?.message })
      },
      { status: 500 }
    )
  }
}

export const POST = withRateLimit(handlePOST, { upload: true })

