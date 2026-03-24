import { NextRequest, NextResponse } from 'next/server'
import { getConfigValue, setConfigValue } from '@/lib/database'

const ADMIN_COOKIE_NAME = 'admin_authenticated'
const PASSWORD_CONFIG_KEY = 'admin_password_hash'
const PASSWORD_SALT = 'vitech-sas-downloader'

export async function hashAdminPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(PASSWORD_SALT + password)
  const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function getAdminPasswordHash(): Promise<string | null> {
  return getConfigValue(PASSWORD_CONFIG_KEY)
}

export async function saveAdminPasswordHash(hash: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await setConfigValue(PASSWORD_CONFIG_KEY, hash)
    return { ok: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[admin-auth] saveAdminPasswordHash error:', msg)
    return { ok: false, error: msg }
  }
}

export async function isAdminAuthenticated(request: NextRequest): Promise<boolean> {
  return request.cookies.get(ADMIN_COOKIE_NAME)?.value === 'true'
}

export async function requireAdmin(request: NextRequest): Promise<NextResponse | null> {
  if (await isAdminAuthenticated(request)) return null
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

export function setAdminSession(response: NextResponse): NextResponse {
  response.cookies.set(ADMIN_COOKIE_NAME, 'true', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60,
    path: '/',
  })
  return response
}

export function clearAdminSession(response: NextResponse): NextResponse {
  response.cookies.set(ADMIN_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  })
  return response
}
