import { createClient } from '@supabase/supabase-js'

export const supabase = (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY)
  ? createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    )
  : (null as unknown as ReturnType<typeof createClient>)

export const supabaseAdmin = (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
  ? createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
  : (null as unknown as ReturnType<typeof createClient>)

export async function uploadFile(
  bucket: string,
  path: string,
  file: Buffer | File,
  contentType?: string
): Promise<string> {
  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .upload(path, file, {
      contentType,
      upsert: true
    })
  
  if (error) {
    throw new Error(`Upload failed: ${error.message}`)
  }
  
  return data.path
}

export async function createSignedUrl(
  bucket: string,
  path: string,
  expiresIn: number = 3600
): Promise<string> {
  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn)
  
  if (error) {
    throw new Error(`Failed to create signed URL: ${error.message}`)
  }
  
  return data.signedUrl
}

export async function deleteFile(bucket: string, path: string): Promise<void> {
  const { error } = await supabaseAdmin.storage
    .from(bucket)
    .remove([path])
  
  if (error) {
    throw new Error(`Failed to delete file: ${error.message}`)
  }
}

export const BUCKETS = {
  INVOICES: 'invoices',
  RECEIPTS: 'receipts',
  REPORTS: 'reports',
  IMPORTS: 'imports'
} as const
