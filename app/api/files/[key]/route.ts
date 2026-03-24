import { NextRequest, NextResponse } from 'next/server'
import { retrieveFile } from '@/lib/database'

type RouteContext = { params: Promise<{ key: string }> }

export async function GET(_request: NextRequest, ctx: RouteContext) {
  try {
    const { key } = await ctx.params
    const decodedKey = decodeURIComponent(key)
    const file = await retrieveFile(decodedKey)

    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    const fileName = decodedKey.replace(/^[0-9a-f-]+-/, '')
    return new NextResponse(new Uint8Array(file.data), {
      headers: {
        'Content-Type': file.contentType,
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Failed to retrieve file' }, { status: 500 })
  }
}
