import { NextRequest, NextResponse } from 'next/server'
import { getOrgBySlug } from '@/lib/org'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const slug = searchParams.get('slug')

    if (!slug) {
      return NextResponse.json(
        { error: 'Organisation slug is required' },
        { status: 400 }
      )
    }

    const org = await getOrgBySlug(slug)

    if (!org) {
      return NextResponse.json(
        { error: 'Organisation not found' },
        { status: 404 }
      )
    }

    // Only return public information
    return NextResponse.json({
      id: org.id,
      name: org.name,
      slug: org.slug
    })
  } catch (error: any) {
    logger.error('Error fetching org by slug', error)
    return NextResponse.json(
      { error: 'Failed to fetch organisation' },
      { status: 500 }
    )
  }
}

