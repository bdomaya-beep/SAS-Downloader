import { NextRequest, NextResponse } from 'next/server'
import {
  getAdminPasswordHash,
  hashAdminPassword,
  isAdminAuthenticated,
  saveAdminPasswordHash,
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

    const existingHash = await getAdminPasswordHash()
    if (existingHash && !(await isAdminAuthenticated(request))) {
      return NextResponse.json(
        { error: 'Admin password is already configured' },
        { status: 409 }
      )
    }

    const passwordHash = await hashAdminPassword(password)
    const result = await saveAdminPasswordHash(passwordHash)

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error || 'Failed to save password' },
        { status: 500 }
      )
    }

    return setAdminSession(NextResponse.json({ success: true }))
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[setup] unexpected error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
