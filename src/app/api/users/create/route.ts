import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { checkPaymentMethod } from '@/lib/payment-check'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { sendStaffInvitation } from '@/lib/mail'
import { logger } from '@/lib/logger'
import { sanitizeText, isValidEmail, isValidPhone, isValidUKPostcode, MAX_STRING_LENGTHS } from '@/lib/input-validation'
import { withRateLimit } from '@/lib/api-middleware'
import { requireRole } from '@/lib/roles'
import { validatePassword } from '@/lib/password-validation'

async function handlePOST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    // Only platform owners or org admins can create users
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify user has permission (super admin or org admin)
    if (!session.user.isSuperAdmin) {
      // For non-super-admin, verify they have ADMIN role in the org they're creating user for
      const body = await request.json()
      const { orgId } = body
      
      if (orgId) {
        const membership = await prisma.userOrgMembership.findUnique({
          where: {
            userId_orgId: {
              userId: session.user.id,
              orgId
            }
          }
        })
        
        if (!membership || membership.role !== 'ADMIN') {
          return NextResponse.json(
            { error: 'Unauthorized - Admin role required' },
            { status: 403 }
          )
        }
      }
    }

    const body = await request.json()
    const { email, name, password, phone, isSuperAdmin, orgId, role, sendInvitation, staffSubrole, permissionKeys } = body

    // Only check payment for non-owner accounts (staff/teachers)
    if (!isSuperAdmin && (role === 'STAFF' || role === 'ADMIN')) {
      const hasPaymentMethod = await checkPaymentMethod()
      if (!hasPaymentMethod) {
        return NextResponse.json(
          { error: 'Payment method required. Please set up a payment method to add teachers.' },
          { status: 402 }
        )
      }
    }

    if (!email || !name) {
      return NextResponse.json(
        { error: 'Email and name are required' },
        { status: 400 }
      )
    }

    // Sanitize and validate inputs
    const sanitizedEmail = email.toLowerCase().trim()
    if (!isValidEmail(sanitizedEmail)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    const sanitizedName = sanitizeText(name, MAX_STRING_LENGTHS.name)
    const sanitizedPhone = phone ? sanitizeText(phone, MAX_STRING_LENGTHS.phone) : null

    if (sanitizedPhone && !isValidPhone(sanitizedPhone)) {
      return NextResponse.json(
        { error: 'Invalid phone number format. Please enter a valid UK phone number (e.g., +44 7700 900123 or 07700 900123)' },
        { status: 400 }
      )
    }

    // If not super admin, orgId and role are required
    if (!isSuperAdmin && (!orgId || !role)) {
      return NextResponse.json(
        { error: 'Organisation and role are required for non-owner accounts' },
        { status: 400 }
      )
    }

    // Check if user wants to send invitation (password not required if sending invitation)
    const shouldSendInvitation = sendInvitation === true || sendInvitation === 'true'
    
    // For non-super-admin accounts, invitation is required (no password setting allowed)
    if (!isSuperAdmin && !shouldSendInvitation) {
      return NextResponse.json(
        { error: 'Invitations are required for all non-owner accounts. Users must set their own passwords.' },
        { status: 400 }
      )
    }

    // Reject password setting for non-owner accounts
    if (!isSuperAdmin && password) {
      return NextResponse.json(
        { error: 'Passwords cannot be set for organisation accounts. Users must set their own passwords via invitation.' },
        { status: 400 }
      )
    }

    // Validate password if provided (for owner accounts)
    if (password) {
      const passwordValidation = await validatePassword(password)
      if (!passwordValidation.isValid) {
        return NextResponse.json(
          { error: passwordValidation.errors.join('. ') },
          { status: 400 }
        )
      }
    }

    // Hash password if provided
    let hashedPassword: string | null = null
    if (password) {
      hashedPassword = await bcrypt.hash(password, 12)
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: sanitizedEmail }
    })

    let user
    if (existingUser) {
      // Update existing user
      user = await prisma.user.update({
        where: { email: sanitizedEmail },
        data: {
          name: sanitizedName,
          ...(hashedPassword && { password: hashedPassword }),
          phone: sanitizedPhone,
          isSuperAdmin: isSuperAdmin || false,
          updatedAt: new Date()
        }
      })
    } else {
      // Create new user (password required for new users)
      if (!hashedPassword && !shouldSendInvitation) {
        return NextResponse.json(
          { error: 'Password is required for new users' },
          { status: 400 }
        )
      }

      try {
        user = await prisma.user.create({
          data: {
            id: crypto.randomUUID(),
            email: sanitizedEmail,
            name: sanitizedName,
            password: hashedPassword || crypto.randomBytes(32).toString('hex'), // Temporary password if sending invitation
            phone: sanitizedPhone,
            isSuperAdmin: isSuperAdmin || false,
            updatedAt: new Date()
          }
        })
      } catch (createError: any) {
        // Handle unique constraint violation (race condition)
        if (createError.code === 'P2002') {
          return NextResponse.json(
            { error: 'This email is already being used. Please use a different one.' },
            { status: 400 }
          )
        }
        throw createError
      }
    }

    // If orgId and role provided, create membership
    if (orgId && role && !isSuperAdmin) {
      // Determine if this is the initial admin (first ADMIN in the org)
      const existingAdmins = await prisma.userOrgMembership.findMany({
        where: {
          orgId,
          role: 'ADMIN',
        },
      })
      const isInitialAdmin = role === 'ADMIN' && existingAdmins.length === 0

      const membership = await prisma.userOrgMembership.upsert({
        where: {
          userId_orgId: {
            userId: user.id,
            orgId
          }
        },
        update: {
          role,
          ...(staffSubrole !== undefined && { staffSubrole }),
          ...(isInitialAdmin && { isInitialAdmin: true }),
        },
        create: {
          id: crypto.randomUUID(),
          userId: user.id,
          orgId,
          role,
          staffSubrole: staffSubrole || null,
          isInitialAdmin,
        }
      })

      // Set permissions if provided
      if (role === 'STAFF' || role === 'ADMIN') {
        const { setStaffPermissions, ensurePermissionsExist } = await import('@/lib/staff-permissions-db')
        const { getStaffPermissionKeys, StaffSubrole } = await import('@/types/staff-roles')
        
        await ensurePermissionsExist()
        
        let finalPermissionKeys = permissionKeys || []
        
        // If ADMIN role, give all permissions
        if (role === 'ADMIN') {
          const { PERMISSION_DEFINITIONS } = await import('@/types/staff-roles')
          finalPermissionKeys = Object.keys(PERMISSION_DEFINITIONS) as any[]
        } else if (!permissionKeys && staffSubrole) {
          // Use preset permissions based on subrole (base permissions)
          finalPermissionKeys = getStaffPermissionKeys(staffSubrole as StaffSubrole)
        } else if (permissionKeys && staffSubrole) {
          // Ensure base permissions are always included
          const basePermissions = getStaffPermissionKeys(staffSubrole as StaffSubrole)
          finalPermissionKeys = [...new Set([...basePermissions, ...permissionKeys])]
        }
        
        if (finalPermissionKeys.length > 0) {
          await setStaffPermissions(membership.id, finalPermissionKeys, staffSubrole)
        }
      }

      // Send invitation email if requested
      if (shouldSendInvitation) {
        try {
          const org = await prisma.org.findUnique({
            where: { id: orgId },
            select: { name: true }
          })

          if (org) {
            // Create invitation token
            const token = crypto.randomBytes(32).toString('hex')
            const expiresAt = new Date()
            expiresAt.setDate(expiresAt.getDate() + 7) // 7 days

            // Create invitation
            await prisma.invitation.create({
              data: {
                orgId,
                email: sanitizedEmail,
                role,
                token,
                expiresAt
              }
            })

            // Send invitation email
            const baseUrl = process.env.APP_BASE_URL || process.env.NEXTAUTH_URL || 'https://app.madrasah.io'
            const cleanBaseUrl = baseUrl.trim().replace(/\/+$/, '')
            const signupUrl = `${cleanBaseUrl}/auth/signup?token=${token}`
            
            await sendStaffInvitation({
              to: sanitizedEmail,
              orgName: org.name,
              role,
              signupUrl
            })
          }
        } catch (emailError: any) {
          logger.error('Failed to send invitation email', emailError)
          // Don't fail user creation if email fails
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: shouldSendInvitation ? 'User created and invitation sent' : 'User created successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isSuperAdmin: user.isSuperAdmin
      }
    })

  } catch (error: any) {
    logger.error('Error creating user', error)
    
    // Handle unique constraint violation
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'This email is already being used. Please use a different one.' },
        { status: 400 }
      )
    }

    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      { 
        error: 'Failed to create user',
        ...(isDevelopment && { details: error?.message })
      },
      { status: 500 }
    )
  }
}

export const POST = withRateLimit(handlePOST)

