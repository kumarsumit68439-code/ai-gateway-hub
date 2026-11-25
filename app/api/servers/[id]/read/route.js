import { NextResponse } from 'next/server';
import { admin } from '@/lib/supabase';
import { getUser } from '@/lib/auth';
import { fail, isUuid, isMember } from '@/lib/discord';

export const dynamic = 'force-dynamic';

// Mark As Read: every text channel of the server.
export async function POST(req, { params }) {
  const user = await getUser(req);
  if (!user) return fail(401, 'Not logged in.');
  if (!isUuid(params.id)) return fail(400, 'Bad id.');
  const db = admin();
  if (!(await isMember(db, params.id, user.id))) return fail(403, 'You are not in this server.');
  const { data: chs } = await db.from('channels').select('id').eq('server_id', params.id).eq('type', 'text');
  const rows = await Promise.all((chs || []).map(async (c) => {
    const { data: last } = await db.from('messages').select('id').eq('channel_id', c.id).order('id', { ascending: false }).limit(1);
    return { user_id: user.id, channel_id: c.id, last_id: last?.[0]?.id || 0 };
  }));
  if (rows.length) await db.from('channel_reads').upsert(rows);
  return NextResponse.json({ ok: true });
}
