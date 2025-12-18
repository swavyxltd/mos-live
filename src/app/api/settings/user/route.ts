export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { logger } from '@/lib/logger'
import { sanitizeText, isValidEmail, isValidPhone, isValidUKPostcode, MAX_STRING_LENGTHS } from '@/lib/input-validation'
import { withRateLimit } from '@/lib/api-middleware'

async function handlePUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, email, phone, address, city, postcode, title, giftAidStatus, twoFactorEnabled } = body

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

    // Validate and sanitize email format if provided
    let sanitizedEmail: string | undefined
    if (email && email !== user.email) {
      sanitizedEmail = email.toLowerCase().trim()
      if (!isValidEmail(sanitizedEmail)) {
        return NextResponse.json(
          { error: 'Invalid email format' },
          { status: 400 }
        )
      }
      
      // Check if email is already taken by another user
      const existingUser = await prisma.user.findUnique({
        where: { email: sanitizedEmail }
      })
      
      if (existingUser && existingUser.id !== session.user.id) {
        return NextResponse.json(
          { error: 'This email address is already associated with another account. Please use a different email address.' },
          { status: 400 }
        )
      }
    }

    // Update user data (name, email, phone - no password)
    const updateData: any = {}
    
    // Update name if provided (allow empty string to clear name)
    if (name !== undefined) {
      updateData.name = sanitizeText(name, MAX_STRING_LENGTHS.name)
    }
    
    // Update email if provided and different
    if (email !== undefined && email !== user.email) {
      updateData.email = sanitizedEmail
    }
    
    // Update phone if provided (required - cannot be removed, only replaced)
    if (phone !== undefined) {
      const sanitizedPhone = sanitizeText(phone, MAX_STRING_LENGTHS.phone)
      if (!sanitizedPhone || sanitizedPhone.trim() === '') {
        return NextResponse.json(
          { error: 'Phone number is required and cannot be removed' },
          { status: 400 }
        )
      }
      if (!isValidPhone(sanitizedPhone)) {
        return NextResponse.json(
          { error: 'Invalid phone number format. Please enter a valid UK phone number (e.g., +44 7700 900123 or 07700 900123)' },
          { status: 400 }
        )
      }
      updateData.phone = sanitizedPhone
    }
    
    // Update address if provided
    if (address !== undefined) {
      updateData.address = sanitizeText(address, MAX_STRING_LENGTHS.address) || null
    }
    
    // Update city if provided
    if (city !== undefined) {
      updateData.city = sanitizeText(city, MAX_STRING_LENGTHS.name) || null
    }
    
    // Update postcode if provided (validate UK format)
    if (postcode !== undefined) {
      const cleanedPostcode = postcode ? postcode.toUpperCase().trim() : ''
      if (cleanedPostcode && !isValidUKPostcode(cleanedPostcode)) {
        return NextResponse.json(
          { error: 'Invalid postcode format. Please enter a valid UK postcode (e.g., SW1A 1AA)' },
          { status: 400 }
        )
      }
      updateData.postcode = cleanedPostcode ? sanitizeText(cleanedPostcode, 20) : null
    }
    
    // Update title if provided
    if (title !== undefined) {
      updateData.title = sanitizeText(title, 20) || null
    }
    
    // Update gift aid status if provided
    if (giftAidStatus !== undefined) {
      if (giftAidStatus === 'YES' || giftAidStatus === 'NO' || giftAidStatus === 'NOT_SURE' || giftAidStatus === null || giftAidStatus === '') {
        updateData.giftAidStatus = giftAidStatus || null
        if (giftAidStatus === 'YES' || giftAidStatus === 'NO') {
          updateData.giftAidDeclaredAt = new Date()
        }
      }
    }
    
    // Update 2FA status if provided
    if (twoFactorEnabled !== undefined) {
      updateData.twoFactorEnabled = twoFactorEnabled
    }
    
    // Only proceed if there's something to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ 
        success: true, 
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          address: user.address,
          city: (user as any).city,
          postcode: user.postcode,
          title: user.title,
          giftAidStatus: user.giftAidStatus,
          image: user.image,
          isSuperAdmin: user.isSuperAdmin,
          twoFactorEnabled: user.twoFactorEnabled
        }
      })
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        ...updateData,
        updatedAt: new Date()
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        city: true,
        postcode: true,
        title: true,
        giftAidStatus: true,
        giftAidDeclaredAt: true,
        image: true,
        isSuperAdmin: true,
        twoFactorEnabled: true
      }
    })

    return NextResponse.json({ 
      success: true, 
      user: updatedUser 
    })
  } catch (error) {
    logger.error('Error updating user settings', error)
    return NextResponse.json(
      { error: 'Failed to update user settings' },
      { status: 500 }
    )
  }
}

export const PUT = withRateLimit(handlePUT)

async function handleGET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      logger.warn('Unauthorized attempt to fetch user settings', { userId: session?.user?.id })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        city: true,
        postcode: true,
        title: true,
        giftAidStatus: true,
        giftAidDeclaredAt: true,
        image: true,
        isSuperAdmin: true,
        twoFactorEnabled: true
      }
    })

    if (!user) {
      logger.warn('User not found when fetching settings', { userId: session.user.id })
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json(user)
  } catch (error: any) {
    logger.error('Error fetching user settings', error, {
      message: error?.message,
      stack: error?.stack
    })
    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      { 
        error: 'Failed to fetch user settings',
        ...(isDevelopment && { details: error?.message })
      },
      { status: 500 }
    )
  }
}

export const GET = withRateLimit(handleGET)
