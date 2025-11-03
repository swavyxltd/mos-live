import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const token = searchParams.get('token')

    console.log('🔍 Fetching invitation with token:', token ? `${token.substring(0, 8)}...` : 'missing')

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      )
    }

    const invitation = await prisma.invitation.findUnique({
      where: { token },
      include: {
        org: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      }
    })

    console.log('📋 Invitation lookup result:', invitation ? {
      id: invitation.id,
      orgId: invitation.orgId,
      orgName: invitation.org?.name,
      email: invitation.email,
      role: invitation.role,
      expiresAt: invitation.expiresAt,
      acceptedAt: invitation.acceptedAt,
      expired: new Date() > invitation.expiresAt,
      accepted: !!invitation.acceptedAt
    } : 'NOT FOUND')

    if (!invitation) {
      console.error('❌ Invitation not found for token')
      return NextResponse.json(
        { error: 'Invalid invitation token' },
        { status: 404 }
      )
    }

    // Check if invitation has expired
    if (new Date() > invitation.expiresAt) {
      console.error('❌ Invitation expired:', invitation.expiresAt)
      return NextResponse.json(
        { error: 'Invitation has expired' },
        { status: 400 }
      )
    }

    // Check if invitation has already been accepted
    if (invitation.acceptedAt) {
      console.error('❌ Invitation already accepted:', invitation.acceptedAt)
      return NextResponse.json(
        { error: 'Invitation has already been accepted' },
        { status: 400 }
      )
    }

    console.log('✅ Invitation valid, returning data')

    return NextResponse.json({
      invitationId: invitation.id,
      orgId: invitation.orgId,
      orgName: invitation.org.name,
      orgSlug: invitation.org.slug,
      email: invitation.email,
      role: invitation.role
    })
  } catch (error: any) {
    console.error('❌ Error fetching invitation:', error)
    return NextResponse.json(
      { error: 'Failed to fetch invitation', details: error.message },
      { status: 500 }
    )
  }
}

