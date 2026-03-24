import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { updateApp, deleteApp, incrementDownloads } from '@/lib/database'

type RouteContext = { params: Promise<{ id: string }> }

export async function PUT(request: NextRequest, context: RouteContext) {
  const unauth = await requireAdmin(request)
  if (unauth) return unauth

  try {
    const { id } = await context.params
    const body = await request.json()

    const updated = await updateApp(id, {
      name: body.name,
      version: body.version,
      description: body.description,
      file_name: body.file_name,
      ...(body.download_url && { download_url: body.download_url }),
      changelog: body.changelog || '',
    })

    if (!updated) {
      return NextResponse.json({ error: 'App not found' }, { status: 404 })
    }

    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: 'Failed to update app' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const unauth = await requireAdmin(request)
  if (unauth) return unauth

  try {
    const { id } = await context.params
    const success = await deleteApp(id)

    if (!success) {
      return NextResponse.json({ error: 'App not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete app' }, { status: 500 })
  }
}

export async function POST(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    await incrementDownloads(id)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json(
      { error: 'Failed to update download count' },
      { status: 500 }
    )
  }
}
