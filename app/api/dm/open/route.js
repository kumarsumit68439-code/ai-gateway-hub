import { NextResponse } from 'next/server';
import { admin } from '@/lib/supabase';
import { getUser } from '@/lib/auth';
import { fail, isUuid } from '@/lib/discord';

export const dynamic = 'force-dynamic';

// Open (or create) a conversation with a member you share a server with.
export async function POST(req) {
  const user = await getUser(req);
  if (!user) return fail(401, 'Not logged in.');
  let b = {};
  try { b = await req.json(); } catch {}
  const uid = String(b.uid || '').toLowerCase();
  if (!isUuid(uid) || uid === user.id) return fail(400, 'Invalid member.');

  const db = admin();
  const { data: mine } = await db.from('server_members').select('server_id').eq('user_id', user.id);
  const sids = (mine || []).map((x) => x.server_id);
  const { data: shared } = sids.length ? await db.from('server_members').select('server_id,user_name,user_avatar,allow_dm').eq('user_id', uid).in('server_id', sids) : { data: [] };
  if (!shared?.length) return fail(403, 'You can only message people you share a server with.');

  const { data: existing } = await db.from('dm_threads').select('id').or(`and(user_low.eq.${[user.id, uid].sort()[0]},user_high.eq.${[user.id, uid].sort()[1]})`).maybeSingle();
  if (!existing && !shared.some((x) => x.allow_dm)) return fail(403, 'This member does not accept direct messages.');

  const [low, high] = [user.id, uid].sort();
  let threadId = existing?.id;
  if (!threadId) {
    const { data, error } = await db.from('dm_threads').insert({ user_low: low, user_high: high }).select('id').single();
    if (error) return fail(500, 'Could not open the conversation.');
    threadId = data.id;
  }
  const { data: p } = await db.from('profiles').select('display_name,avatar_url').eq('id', uid).maybeSingle();
  const s = shared[0];
  return NextResponse.json({ threadId, other: { id: uid, name: p?.display_name || s.user_name, avatar: p?.avatar_url || s.user_avatar || null } });
}
