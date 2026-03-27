import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const hostname = request.headers.get('host') || '';

  // Extraire le sous-domaine
  // Format: app.localhost:3000 ou app.institut-amana.fr
  const parts = hostname.split('.');

  // Déterminer si c'est le sous-domaine "app"
  const isAppSubdomain = parts[0] === 'app';

  console.log('[Middleware] hostname:', hostname);
  console.log('[Middleware] isAppSubdomain:', isAppSubdomain);
  console.log('[Middleware] pathname:', url.pathname);

  // Si on est sur le sous-domaine "app"
  if (isAppSubdomain) {
    // On rewrite vers /app/[route] pour que Next.js trouve les bonnes pages
    if (!url.pathname.startsWith('/app/')) {
      url.pathname = `/app${url.pathname === '/' ? '/admin/dashboard' : url.pathname}`;
      console.log('[Middleware] Rewriting to:', url.pathname);
      return NextResponse.rewrite(url);
    }
  }

  // Si on n'est pas sur le sous-domaine app mais qu'on essaie d'accéder à /app
  if (!isAppSubdomain && url.pathname.startsWith('/app')) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|images/|icon|favicon|apple-touch|android-chrome).*)',
  ],
};
