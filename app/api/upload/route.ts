import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { storeFile } from '@/lib/database'

export async function POST(request: NextRequest) {
  const unauth = await requireAdmin(request)
  if (unauth) return unauth

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const fileKey = `${crypto.randomUUID()}-${file.name}`
    const buffer = await file.arrayBuffer()
    await storeFile(fileKey, buffer, file.type || 'application/octet-stream')

    const fileUrl = `/api/files/${encodeURIComponent(fileKey)}`
    return NextResponse.json({ url: fileUrl, fileName: file.name })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[upload]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
