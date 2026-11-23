import { NextResponse } from 'next/server';
import { admin } from '@/lib/supabase';
import { getUser } from '@/lib/auth';
import { fail } from '@/lib/discord';

export const dynamic = 'force-dynamic';

// Heartbeat: marks the user as online in all of their servers.
export async function POST(req) {
  const user = await getUser(req);
  if (!user) return fail(401, 'Not logged in.');
  await admin().from('server_members').update({ last_seen_at: new Date().toISOString() }).eq('user_id', user.id);
  return NextResponse.json({ ok: true });
}
