import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getActiveOrg } from '@/lib/org'

export async function GET(request: NextRequest) {
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

    // Create CSV template with headers + 100 empty rows + 1 example row
    const headers = [
      'firstName',
      'lastName',
      'dateOfBirth',
      'gender',
      'parentName',
      'parentEmail',
      'parentPhone',
      'address',
      'allergies',
      'medicalNotes',
      'startMonth'
    ]

    // Create CSV content
    let csvContent = headers.join(',') + '\n'
    
    // Add example row (marked with EXAMPLE prefix so it won't be created if not removed)
    const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM
    const exampleRow = [
      'EXAMPLE_DELETE_THIS_ROW',
      'Smith',
      '2015-05-15',
      'Male',
      'John Smith',
      'john.smith@example.com',
      '+44 20 1234 5678',
      '123 Example Street, London',
      'None',
      '',
      currentMonth
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
    console.error('Error generating template:', error)
    return NextResponse.json(
      { error: 'Failed to generate template' },
      { status: 500 }
    )
  }
}

