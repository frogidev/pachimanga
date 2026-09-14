import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

function isPublicPath(pathname: string) {
  return pathname.startsWith('/auth') || pathname === '/offline';
}

function copySessionState(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((cookie) => to.cookies.set(cookie));
  for (const key of ['cache-control', 'expires', 'pragma']) {
    const value = from.headers.get(key);
    if (value) to.headers.set(key, value);
  }
  return to;
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    if (isPublicPath(request.nextUrl.pathname)) return supabaseResponse;
    const redirectTo = request.nextUrl.clone();
    redirectTo.pathname = '/auth';
    redirectTo.search = '';
    redirectTo.searchParams.set('error', 'configuration');
    return NextResponse.redirect(redirectTo);
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options));
        Object.entries(headers).forEach(([header, value]) => supabaseResponse.headers.set(header, value));
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const authenticated = Boolean(data?.claims?.sub);

  if (!authenticated && !isPublicPath(request.nextUrl.pathname)) {
    const redirectTo = request.nextUrl.clone();
    const requestedPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;
    redirectTo.pathname = '/auth';
    redirectTo.search = '';
    if (requestedPath !== '/') redirectTo.searchParams.set('next', requestedPath);
    return copySessionState(supabaseResponse, NextResponse.redirect(redirectTo));
  }

  return supabaseResponse;
}
