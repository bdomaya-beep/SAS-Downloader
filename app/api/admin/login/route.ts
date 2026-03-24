import { NextRequest, NextResponse } from 'next/server'
import {
  getAdminPasswordHash,
  hashAdminPassword,
  setAdminSession,
} from '@/lib/admin-auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { password } = body

    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      )
    }

    const storedHash = await getAdminPasswordHash()
    if (!storedHash) {
      return NextResponse.json(
        { error: 'Admin password not set up yet' },
        { status: 400 }
      )
    }

    const passwordHash = await hashAdminPassword(password)
    if (passwordHash !== storedHash) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
    }

    return setAdminSession(NextResponse.json({ success: true }))
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[login] unexpected error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
