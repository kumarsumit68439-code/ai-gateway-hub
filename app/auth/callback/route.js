import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// Google (and other OAuth) redirect lands here with ?code=...
// We exchange the code for a session, set cookies, then send the user to /dashboard.
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') || '/dashboard';

  if (code) {
    const response = NextResponse.redirect(`${origin}${next}`);
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll(list) {
            list.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return response;
  }

  // Something went wrong — back to login with a hint
  return NextResponse.redirect(`${origin}/login?error=auth`);
}
