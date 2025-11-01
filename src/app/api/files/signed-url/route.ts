export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireOrg } from '@/lib/roles'
import { createSignedUrl } from '@/lib/storage'

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth(request)
    if (session instanceof NextResponse) return session
    
    const orgId = await requireOrg(request)
    if (orgId instanceof NextResponse) return orgId
    
    const { searchParams } = new URL(request.url)
    const fileId = searchParams.get('id')
    const bucket = searchParams.get('bucket') || 'invoices'
    const expiresIn = parseInt(searchParams.get('expiresIn') || '3600')
    
    if (!fileId) {
      return NextResponse.json({ error: 'File ID is required' }, { status: 400 })
    }
    
    // Verify the file belongs to the organization
    const filePath = `${orgId}/${fileId}`
    
    // Create signed URL
    const signedUrl = await createSignedUrl(bucket, filePath, expiresIn)
    
    return NextResponse.json({
      signedUrl,
      expiresIn
    })
  } catch (error) {
    console.error('Signed URL error:', error)
    return NextResponse.json(
      { error: 'Failed to create signed URL' },
      { status: 500 }
    )
  }
}
