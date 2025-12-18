import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { withRateLimit } from '@/lib/api-middleware'

async function handleGET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || !session.user.isSuperAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Resolve params if it's a Promise (Next.js 15+)
    const resolvedParams = params instanceof Promise ? await params : params
    const userId = resolvedParams.id
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        image: true,
        phone: true,
        title: true,
        address: true,
        city: true,
        postcode: true,
        giftAidStatus: true,
        giftAidDeclaredAt: true,
        twoFactorEnabled: true,
        isSuperAdmin: true,
        isArchived: true,
        archivedAt: true,
        createdAt: true,
        updatedAt: true,
        UserOrgMembership: {
          select: {
            role: true,
            orgId: true,
            Org: {
              select: {
                id: true,
                name: true,
                slug: true
              }
            }
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get demo org to exclude
    const demoOrg = await prisma.org.findFirst({
      where: { 
        OR: [
          { slug: 'test-islamic-school' },
          { name: { contains: 'Test Islamic School', mode: 'insensitive' } },
          { slug: { contains: 'test', mode: 'insensitive' } }
        ]
      },
      select: { id: true, slug: true }
    })

    // Filter out demo org memberships
    const memberships = user.UserOrgMembership || []
    const filteredMemberships = demoOrg
      ? memberships.filter(m => m.Org?.id !== demoOrg.id && m.Org?.slug !== demoOrg.slug)
      : memberships

    // Get primary membership (first non-demo org membership)
    const primaryMembership = filteredMemberships[0] || null

    return NextResponse.json({
      id: user.id,
      name: user.name || 'Unknown',
      email: user.email,
      emailVerified: user.emailVerified?.toISOString() || null,
      image: user.image || null,
      phone: user.phone || null,
      title: user.title || null,
      address: user.address || null,
      city: user.city || null,
      postcode: user.postcode || null,
      giftAidStatus: user.giftAidStatus || null,
      giftAidDeclaredAt: user.giftAidDeclaredAt?.toISOString() || null,
      twoFactorEnabled: user.twoFactorEnabled,
      role: user.isSuperAdmin ? 'OWNER' : (primaryMembership?.role || null),
      orgName: primaryMembership?.Org?.name || null,
      orgId: primaryMembership?.Org?.id || null,
      isSuperAdmin: user.isSuperAdmin,
      isArchived: user.isArchived,
      archivedAt: user.archivedAt?.toISOString() || null,
      status: user.isArchived ? 'inactive' : 'active',
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
      memberships: filteredMemberships.map(m => ({
        role: m.role,
        orgId: m.orgId,
        orgName: m.Org?.name || null,
        orgSlug: m.Org?.slug || null
      }))
    })
  } catch (error: any) {
    logger.error('Error fetching user', error)
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    )
  }
}

async function handlePUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || !session.user.isSuperAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Resolve params if it's a Promise (Next.js 15+)
    const resolvedParams = params instanceof Promise ? await params : params
    const userId = resolvedParams.id
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    const body = await request.json()
    const { name, email, phone, title, address, city, postcode, giftAidStatus } = body

    // Validate required fields
    if (!name || !email) {
      return NextResponse.json(
        { error: 'Name and email are required' },
        { status: 400 }
      )
    }

    // Check if email is already taken by another user
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: { id: true }
    })

    if (existingUser && existingUser.id !== userId) {
      return NextResponse.json(
        { error: 'This email address is already associated with another account. Please use a different email address.' },
        { status: 400 }
      )
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        name,
        email,
        phone: phone || null,
        title: title || null,
        address: address || null,
        city: city || null,
        postcode: postcode || null,
        giftAidStatus: giftAidStatus || null,
        updatedAt: new Date()
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        title: true,
        address: true,
        city: true,
        postcode: true,
        giftAidStatus: true,
        isSuperAdmin: true,
        isArchived: true,
        createdAt: true,
        updatedAt: true
      }
    })

    return NextResponse.json(updatedUser)
  } catch (error: any) {
    logger.error('Error updating user', error)
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    )
  }
}

export const GET = withRateLimit(handleGET)
export const PUT = withRateLimit(handlePUT)

