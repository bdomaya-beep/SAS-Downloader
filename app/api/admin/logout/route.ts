import { NextRequest, NextResponse } from 'next/server'
import { clearAdminSession } from '@/lib/admin-auth'

export async function POST(_request: NextRequest) {
  return clearAdminSession(NextResponse.json({ success: true }))
}
