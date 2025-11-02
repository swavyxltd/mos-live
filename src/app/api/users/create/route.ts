import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    // Only platform owners can create users
    if (!session?.user?.id || !session.user.isSuperAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized. Only platform owners can create users.' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { email, name, password, phone, isSuperAdmin, orgId, role } = body

    if (!email || !name || !password) {
      return NextResponse.json(
        { error: 'Email, name, and password are required' },
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

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create or update user
    const user = await prisma.user.upsert({
      where: { email },
      update: {
        name,
        password: hashedPassword,
        phone: phone || null,
        isSuperAdmin: isSuperAdmin || false,
        updatedAt: new Date()
      },
      create: {
        email,
        name,
        password: hashedPassword,
        phone: phone || null,
        isSuperAdmin: isSuperAdmin || false,
      }
    })

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
    }

    return NextResponse.json({
      success: true,
      message: 'User created successfully',
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

