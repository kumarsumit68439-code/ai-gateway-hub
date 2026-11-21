import { createClient } from '@supabase/supabase-js';

// Server-only client. Uses the service-role key, which bypasses RLS.
// Never import this file from a client component.
export function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
