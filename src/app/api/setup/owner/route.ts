import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    // Optional: Add a secret key check for security
    const authHeader = request.headers.get('authorization')
    const expectedSecret = process.env.SETUP_SECRET || 'setup-secret-key-change-in-production'
    
    if (authHeader !== `Bearer ${expectedSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized. Please provide a valid authorization token.' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const ownerEmail = body.email || 'swavyxltd@gmail.com'

    // Test database connection
    await prisma.$connect()

    // Create or update owner user
    const owner = await prisma.user.upsert({
      where: { email: ownerEmail },
      update: {
        isSuperAdmin: true,
        name: ownerEmail.split('@')[0] || 'Owner',
      },
      create: {
        email: ownerEmail,
        name: ownerEmail.split('@')[0] || 'Owner',
        isSuperAdmin: true,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Owner account created/updated successfully',
      owner: {
        id: owner.id,
        email: owner.email,
        name: owner.name,
        isSuperAdmin: owner.isSuperAdmin,
      },
      note: 'Owner account created. Password must be set via password reset or invitation system.',
    })
  } catch (error: any) {
    // Log error server-side only (not to console in production)
    if (process.env.NODE_ENV === 'development') {
      console.error('Setup error:', error)
    }
    return NextResponse.json(
      {
        error: 'Failed to setup owner account',
        details: error.message,
      },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}






