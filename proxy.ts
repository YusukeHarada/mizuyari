import { NextResponse, type NextRequest } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/signup');

  const sessionCookie = request.cookies.get('__session')?.value;

  if (!sessionCookie) {
    if (isAuthRoute) return NextResponse.next();
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    await adminAuth().verifySessionCookie(sessionCookie, true);
    if (isAuthRoute) return NextResponse.redirect(new URL('/', request.url));
    return NextResponse.next();
  } catch {
    // セッション無効 → ログインへ
    const response = isAuthRoute
      ? NextResponse.next()
      : NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('__session');
    return response;
  }
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|icons|sw.js).*)'],
};
