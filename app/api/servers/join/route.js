import { NextResponse } from 'next/server';
import { admin } from '@/lib/supabase';
import { getUser } from '@/lib/auth';
import { fail, userCard } from '@/lib/discord';

export const dynamic = 'force-dynamic';

// Join a server with an invite code.
export async function POST(req) {
  const user = await getUser(req);
  if (!user) return fail(401, 'Not logged in.');
  let b = {};
  try { b = await req.json(); } catch {}
  const code = String(b.code || '').trim().toLowerCase();
  if (!/^[a-f0-9]{10}$/.test(code)) return fail(400, 'That invite code is not valid.');

  const db = admin();
  const { data: server } = await db.from('servers').select('id').eq('invite_code', code).maybeSingle();
  if (!server) return fail(404, 'That invite is invalid or expired.');

  const { count } = await db.from('server_members').select('user_id', { count: 'exact', head: true }).eq('server_id', server.id);
  const { data: already } = await db.from('server_members').select('user_id').eq('server_id', server.id).eq('user_id', user.id).maybeSingle();
  if (!already) {
    if ((count || 0) >= 200) return fail(403, 'This server is full.');
    const me = await userCard(db, user);
    await db.from('server_members').insert({ server_id: server.id, user_id: user.id, user_name: me.name, user_avatar: me.avatar, role: 'member' });
  }
  return NextResponse.json({ id: server.id });
}
