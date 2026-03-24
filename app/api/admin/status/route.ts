import { NextRequest, NextResponse } from 'next/server'
import {
  getAdminPasswordHash,
  isAdminAuthenticated,
} from '@/lib/admin-auth'

export async function GET(request: NextRequest) {
  try {
    const passwordHash = await getAdminPasswordHash()

    return NextResponse.json({
      passwordSet: Boolean(passwordHash),
      authenticated: await isAdminAuthenticated(request),
    })
  } catch {
    return NextResponse.json(
      { error: 'Failed to check admin status' },
      { status: 500 }
    )
  }
}
