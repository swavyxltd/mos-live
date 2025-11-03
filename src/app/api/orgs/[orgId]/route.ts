import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { orgId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    // Only allow super admins to delete organizations
    if (!session?.user?.id || !session.user.isSuperAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized. Only platform owners can delete organizations.' },
        { status: 401 }
      )
    }

    const { orgId } = params

    if (!orgId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      )
    }

    // Get org info before deletion for logging
    const org = await prisma.org.findUnique({
      where: { id: orgId },
      select: {
        id: true,
        name: true,
        slug: true
      }
    })

    if (!org) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    console.log(`🗑️  Deleting organization: ${org.name} (${org.slug})`)

    // Delete the organization
    // Prisma will cascade delete all related records (students, classes, invoices, etc.)
    await prisma.org.delete({
      where: { id: orgId }
    })

    console.log(`✅ Organization ${org.name} deleted successfully`)

    return NextResponse.json({
      success: true,
      message: `Organization "${org.name}" has been deleted`
    })

  } catch (error: any) {
    console.error('Error deleting organization:', error)
    
    // Handle foreign key constraint errors
    if (error.code === 'P2003') {
      return NextResponse.json(
        { error: 'Cannot delete organization due to existing relationships' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to delete organization', details: error.message },
      { status: 500 }
    )
  }
}

