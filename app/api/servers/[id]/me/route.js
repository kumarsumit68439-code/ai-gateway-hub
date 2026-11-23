import { NextResponse } from 'next/server';
import { admin } from '@/lib/supabase';
import { getUser } from '@/lib/auth';
import { fail, isUuid, isMember } from '@/lib/discord';

export const dynamic = 'force-dynamic';

// Per-server profile: nickname and whether members may send you direct messages.
export async function PATCH(req, { params }) {
  const user = await getUser(req);
  if (!user) return fail(401, 'Not logged in.');
  if (!isUuid(params.id)) return fail(400, 'Bad id.');
  const db = admin();
  if (!(await isMember(db, params.id, user.id))) return fail(403, 'You are not in this server.');

  let b = {};
  try { b = await req.json(); } catch {}
  const u = {};
  if (b.nickname !== undefined) {
    let n = String(b.nickname || '').trim();
    if (!n) {
      const { data: p } = await db.from('profiles').select('display_name').eq('id', user.id).maybeSingle();
      n = String(p?.display_name || (user.email || 'user').split('@')[0]);
    }
    if (n.length < 2 || n.length > 32) return fail(400, 'Nickname must be 2-32 characters.');
    u.user_name = n;
  }
  if (b.allow_dm !== undefined) u.allow_dm = !!b.allow_dm;
  if (!Object.keys(u).length) return fail(400, 'Nothing to update.');
  await db.from('server_members').update(u).eq('server_id', params.id).eq('user_id', user.id);
  return NextResponse.json({ ok: true });
}
