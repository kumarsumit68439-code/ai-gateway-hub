import { createBrowserClient } from '@supabase/ssr';

let client;

// Browser client. Uses the public anon key; session is kept in cookies so the
// server middleware can verify it. Data access is limited by RLS.
export function sb() {
  if (!client) {
    client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
  }
  return client;
}
