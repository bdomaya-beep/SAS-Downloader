import { NextRequest, NextResponse } from 'next/server'

function isAdminAuthenticated(request: NextRequest) {
  return request.cookies.get('admin_authenticated')?.value === 'true'
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const authenticated = isAdminAuthenticated(request)

  if (pathname.startsWith('/admin') && pathname !== '/admin-access' && !authenticated) {
    return NextResponse.redirect(new URL('/admin-access', request.url))
  }

  if (pathname === '/admin-access' && authenticated) {
    return NextResponse.redirect(new URL('/admin', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/admin-access'],
}
