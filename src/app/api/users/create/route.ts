import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { sendStaffInvitation } from '@/lib/mail'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    // Only platform owners or org admins can create users
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { email, name, password, phone, isSuperAdmin, orgId, role, sendInvitation } = body

    if (!email || !name) {
      return NextResponse.json(
        { error: 'Email and name are required' },
        { status: 400 }
      )
    }

    // If not super admin, orgId and role are required
    if (!isSuperAdmin && (!orgId || !role)) {
      return NextResponse.json(
        { error: 'Organization and role are required for non-owner accounts' },
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
        { error: 'Passwords cannot be set for organization accounts. Users must set their own passwords via invitation.' },
        { status: 400 }
      )
    }

    // Hash password if provided
    let hashedPassword: string | null = null
    if (password) {
      hashedPassword = await bcrypt.hash(password, 12)
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    })

    let user
    if (existingUser) {
      // Update existing user
      user = await prisma.user.update({
        where: { email: email.toLowerCase() },
        data: {
          name,
          ...(hashedPassword && { password: hashedPassword }),
          phone: phone || null,
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

      user = await prisma.user.create({
        data: {
          email: email.toLowerCase(),
          name,
          password: hashedPassword || crypto.randomBytes(32).toString('hex'), // Temporary password if sending invitation
          phone: phone || null,
          isSuperAdmin: isSuperAdmin || false,
        }
      })
    }

    // If orgId and role provided, create membership
    if (orgId && role && !isSuperAdmin) {
      await prisma.userOrgMembership.upsert({
        where: {
          userId_orgId: {
            userId: user.id,
            orgId
          }
        },
        update: {
          role
        },
        create: {
          userId: user.id,
          orgId,
          role
        }
      })

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
                email: email.toLowerCase(),
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
              to: email.toLowerCase(),
              orgName: org.name,
              role,
              signupUrl
            })
          }
        } catch (emailError) {
          console.error('Failed to send invitation email:', emailError)
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
    console.error('Error creating user:', error)
    
    // Handle unique constraint violation
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create user', details: error.message },
      { status: 500 }
    )
  }
}

