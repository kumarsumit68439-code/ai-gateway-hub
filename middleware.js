import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// Every page requires login except /login. Checked on the server, so page
// content is never sent to visitors who are not logged in.
export async function middleware(req) {
  let res = NextResponse.next({ request: req });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll(list) {
          list.forEach(({ name, value }) => req.cookies.set(name, value));
          res = NextResponse.next({ request: req });
          list.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
        },
      },
    }
  );

  const { data } = await supabase.auth.getUser();
  const user = data?.user;
  const path = req.nextUrl.pathname;

  if (!user && path !== '/login') {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    return NextResponse.redirect(url);
  }
  if (user && (path === '/login' || path === '/')) {
    const url = req.nextUrl.clone();
    url.pathname = '/dashboard';
    url.search = '';
    return NextResponse.redirect(url);
  }
  return res;
}

// API routes are excluded: the gateway uses its own API keys.
export const config = {
  matcher: ['/((?!api/|_next/|favicon.ico).*)'],
};
