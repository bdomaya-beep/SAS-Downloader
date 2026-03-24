import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { getAllApps, createApp } from '@/lib/database'

export async function GET(_request: NextRequest) {
  try {
    const apps = await getAllApps()
    return NextResponse.json(apps)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch apps' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const unauth = await requireAdmin(request)
  if (unauth) return unauth

  try {
    const body = await request.json()

    if (!body.name || !body.version || !body.description || !body.file_name) {
      return NextResponse.json(
        { error: 'Missing required fields: name, version, description, file_name' },
        { status: 400 }
      )
    }

    const app = await createApp({
      name: body.name,
      version: body.version,
      description: body.description,
      file_name: body.file_name,
      download_url: body.download_url || '',
      changelog: body.changelog || '',
    })

    return NextResponse.json(app, { status: 201 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[apps POST]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
