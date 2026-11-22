import { NextResponse } from 'next/server';
import { admin } from '@/lib/supabase';
import { getUser } from '@/lib/auth';
import { fail } from '@/lib/discord';

export const dynamic = 'force-dynamic';

// Public preview of an invite (name and member count) for logged-in users.
export async function GET(req, { params }) {
  const user = await getUser(req);
  if (!user) return fail(401, 'Not logged in.');
  const code = String(params.code || '').toLowerCase();
  if (!/^[a-f0-9]{10}$/.test(code)) return fail(404, 'That invite is invalid or expired.');
  const db = admin();
  const { data: server } = await db.from('servers').select('id,name').eq('invite_code', code).maybeSingle();
  if (!server) return fail(404, 'That invite is invalid or expired.');
  const { count } = await db.from('server_members').select('user_id', { count: 'exact', head: true }).eq('server_id', server.id);
  return NextResponse.json({ name: server.name, members: count || 0 });
}
