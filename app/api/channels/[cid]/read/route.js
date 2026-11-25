import { NextResponse } from 'next/server';
import { admin } from '@/lib/supabase';
import { getUser } from '@/lib/auth';
import { fail, isUuid, isMember } from '@/lib/discord';

export const dynamic = 'force-dynamic';

// Mark one channel as read.
export async function POST(req, { params }) {
  const user = await getUser(req);
  if (!user) return fail(401, 'Not logged in.');
  if (!isUuid(params.cid)) return fail(400, 'Bad id.');
  const db = admin();
  const { data: ch } = await db.from('channels').select('id,server_id').eq('id', params.cid).maybeSingle();
  if (!ch || !(await isMember(db, ch.server_id, user.id))) return fail(404, 'Channel not found.');
  const { data: last } = await db.from('messages').select('id').eq('channel_id', ch.id).order('id', { ascending: false }).limit(1);
  await db.from('channel_reads').upsert({ user_id: user.id, channel_id: ch.id, last_id: last?.[0]?.id || 0 });
  return NextResponse.json({ ok: true });
}
