import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getActiveOrg } from '@/lib/org'
import { logger } from '@/lib/logger'
import { withRateLimit } from '@/lib/api-middleware'

async function handleGET(request: NextRequest) {
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

    // Create CSV template with headers + 100 empty rows + 1 example row
    // Fields: firstName, lastName, email (optional), dob (required)
    const headers = [
      'firstName',
      'lastName',
      'email',
      'dob'
    ]

    // Create CSV content
    let csvContent = headers.join(',') + '\n'
    
    // Add example row (marked with EXAMPLE prefix so it won't be created if not removed)
    // Date format: YYYY-MM-DD
    const exampleRow = [
      'EXAMPLE_DELETE_THIS_ROW',
      'Smith',
      'john.smith@example.com',
      '2015-05-15'
    ]
    csvContent += exampleRow.join(',') + '\n'
    
    // Add 100 empty rows
    for (let i = 0; i < 100; i++) {
      csvContent += ','.repeat(headers.length - 1) + '\n'
    }

    // Return CSV file
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="student-upload-template.csv"`,
      },
    })
  } catch (error: any) {
    logger.error('Error generating template', error)
    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      { 
        error: 'Failed to generate template',
        ...(isDevelopment && { details: error?.message })
      },
      { status: 500 }
    )
  }
}

export const GET = withRateLimit(handleGET)

