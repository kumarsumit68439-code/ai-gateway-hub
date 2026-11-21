import { createClient } from '@supabase/supabase-js';

let client;

// Browser client. Uses the public anon key; access is limited by RLS.
export function sb() {
  if (!client) {
    client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
  }
  return client;
}
