import { NextRequest, NextResponse } from 'next/server'
import { getAppById, incrementDownloads } from '@/lib/database'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, ctx: RouteContext) {
  try {
    const { id } = await ctx.params
    const app = await getAppById(id)

    if (!app) {
      return NextResponse.json({ error: 'App not found' }, { status: 404 })
    }

    if (!app.download_url) {
      return NextResponse.json(
        { error: 'Download URL is missing for this app' },
        { status: 400 }
      )
    }

    await incrementDownloads(id)

    const redirectUrl = app.download_url.startsWith('/')
      ? new URL(app.download_url, request.nextUrl.origin).toString()
      : app.download_url

    return NextResponse.redirect(redirectUrl)
  } catch {
    return NextResponse.json({ error: 'Download failed' }, { status: 500 })
  }
}
