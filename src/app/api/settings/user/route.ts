export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, email, phone } = body

    // Get current user
    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Reject password changes - users must use password reset email
    if (body.currentPassword || body.newPassword) {
      return NextResponse.json(
        { error: 'Password changes must be done via password reset email. Use the "Reset Password" button in settings.' },
        { status: 400 }
      )
    }

    // Don't allow email changes - email is tied to authentication
    // If email needs to be changed, it should be done through a separate verification process
    if (email && email !== user.email) {
      return NextResponse.json(
        { error: 'Email cannot be changed from profile settings. Please contact support if you need to change your email.' },
        { status: 400 }
      )
    }

    // Update user data (only profile info, no password, no email)
    const updateData: any = {
      name: name || user.name,
      phone: phone !== undefined ? phone : user.phone
    }
    
    // Only update fields that have values
    if (!name) {
      delete updateData.name
    }
    if (phone === undefined || phone === null) {
      delete updateData.phone
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        image: true,
        isSuperAdmin: true
      }
    })

    return NextResponse.json({ 
      success: true, 
      user: updatedUser 
    })
  } catch (error) {
    console.error('Error updating user settings:', error)
    return NextResponse.json(
      { error: 'Failed to update user settings' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        image: true,
        isSuperAdmin: true
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error('Error fetching user settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user settings' },
      { status: 500 }
    )
  }
}
