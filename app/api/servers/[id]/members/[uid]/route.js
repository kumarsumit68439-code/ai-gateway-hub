import { NextResponse } from 'next/server';
import { admin } from '@/lib/supabase';
import { getUser } from '@/lib/auth';
import { canManage, fail, isUuid, seenRecently } from '@/lib/discord';

export const dynamic = 'force-dynamic';

// Member profile card (visible to members of the same server).
export async function GET(req, { params }) {
  const user = await getUser(req);
  if (!user) return fail(401, 'Not logged in.');
  if (!isUuid(params.id) || !isUuid(params.uid)) return fail(400, 'Bad id.');
  const db = admin();

  const { data: rows } = await db.from('server_members').select('user_id,user_name,user_avatar,role,joined_at,last_seen_at,allow_dm').eq('server_id', params.id).in('user_id', [user.id, params.uid]);
  if (!rows?.some((r) => r.user_id === user.id)) return fail(403, 'You are not in this server.');
  const m = rows.find((r) => r.user_id === params.uid);
  if (!m) return fail(404, 'Member not found.');

  const [{ data: p }, { data: mr }] = await Promise.all([
    db.from('profiles').select('bio,company,avatar_url,banner_url').eq('id', params.uid).maybeSingle(),
    db.from('member_roles').select('server_roles(id,name,color,position)').eq('server_id', params.id).eq('user_id', params.uid),
  ]);
  const roles = (mr || []).map((x) => x.server_roles).filter(Boolean).sort((a, b) => a.position - b.position);
  return NextResponse.json({
    id: m.user_id,
    name: m.user_name,
    avatar: m.user_avatar || p?.avatar_url || null,
    banner: p?.banner_url || null,
    bio: p?.bio || null,
    company: p?.company || null,
    joined_at: m.joined_at,
    is_owner: m.role === 'owner',
    roles,
    online: m.user_id === user.id || seenRecently(m.last_seen_at),
    last_seen_at: m.last_seen_at,
    allow_dm: m.allow_dm,
  });
}

// Remove a member from the server (owner or manager).
export async function DELETE(req, { params }) {
  const user = await getUser(req);
  if (!user) return fail(401, 'Not logged in.');
  if (!isUuid(params.id) || !isUuid(params.uid)) return fail(400, 'Bad id.');
  const db = admin();
  const perm = await canManage(db, params.id, user.id);
  if (!perm.ok) return fail(403, 'You do not have permission to remove members.');
  if (params.uid === user.id) return fail(400, 'Use Leave server to remove yourself.');

  const { data: target } = await db.from('server_members').select('role').eq('server_id', params.id).eq('user_id', params.uid).maybeSingle();
  if (!target) return fail(404, 'Member not found.');
  if (target.role === 'owner') return fail(403, 'The owner cannot be removed.');
  if (!perm.owner && (await canManage(db, params.id, params.uid)).ok) return fail(403, 'Only the owner can remove another manager.');

  const { data: chs } = await db.from('channels').select('id').eq('server_id', params.id);
  if (chs?.length) await db.from('voice_members').delete().eq('user_id', params.uid).in('channel_id', chs.map((c) => c.id));
  await db.from('server_members').delete().eq('server_id', params.id).eq('user_id', params.uid);
  return NextResponse.json({ ok: true });
}
