import { put, head, del } from '@vercel/blob'

export async function uploadFile(
  bucket: string,
  path: string,
  file: Buffer | File,
  contentType?: string
): Promise<string> {
  try {
    // Vercel Blob uses full paths including bucket prefix
    const fullPath = `${bucket}/${path}`
    const blob = await put(fullPath, file, {
      access: 'public',
      contentType: contentType,
      addRandomSuffix: false
    })
    
    return blob.url
  } catch (error: any) {
    throw new Error(`Upload failed: ${error.message}`)
  }
}

export async function createSignedUrl(
  bucket: string,
  path: string,
  expiresIn: number = 3600
): Promise<string> {
  // Vercel Blob uses public URLs by default
  // We can use head() to verify the file exists and get its URL
  try {
    const fullPath = `${bucket}/${path}`
    const blob = await head(fullPath)
    return blob.url
  } catch (error: any) {
    throw new Error(`File not found: ${bucket}/${path}`)
  }
}

export async function deleteFile(bucket: string, path: string): Promise<void> {
  try {
    const fullPath = `${bucket}/${path}`
    await del(fullPath)
  } catch (error: any) {
    throw new Error(`Failed to delete file: ${error.message}`)
  }
}

export const BUCKETS = {
  INVOICES: 'invoices',
  RECEIPTS: 'receipts',
  REPORTS: 'reports',
  IMPORTS: 'imports'
} as const
