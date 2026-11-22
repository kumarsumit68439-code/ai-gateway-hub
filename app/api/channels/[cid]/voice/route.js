import { NextResponse } from 'next/server';
import { admin } from '@/lib/supabase';
import { getUser } from '@/lib/auth';
import { displayName, fail, isMember, isUuid } from '@/lib/discord';

export const dynamic = 'force-dynamic';

// Voice presence for a voice channel: join, leave, ping (heartbeat) and stop (music).
export async function POST(req, { params }) {
  const user = await getUser(req);
  if (!user) return fail(401, 'Not logged in.');
  if (!isUuid(params.cid)) return fail(400, 'Bad id.');

  const db = admin();
  const { data: channel } = await db.from('channels').select('id,type,server_id').eq('id', params.cid).maybeSingle();
  if (!channel || channel.type !== 'voice') return fail(404, 'Voice channel not found.');
  if (!(await isMember(db, channel.server_id, user.id))) return fail(403, 'You are not in this server.');

  let b = {};
  try { b = await req.json(); } catch {}
  const action = b.action;
  const now = new Date().toISOString();

  if (action === 'join') {
    const { data: chs } = await db.from('channels').select('id').eq('server_id', channel.server_id).eq('type', 'voice');
    await db.from('voice_members').delete().eq('user_id', user.id).in('channel_id', (chs || []).map((c) => c.id));
    await db.from('voice_members').delete().eq('channel_id', channel.id).lt('updated_at', new Date(Date.now() - 120000).toISOString());
    await db.from('voice_members').insert({ channel_id: channel.id, user_id: user.id, user_name: await displayName(db, user), updated_at: now });
  } else if (action === 'ping') {
    await db.from('voice_members').update({ updated_at: now }).eq('channel_id', channel.id).eq('user_id', user.id);
  } else if (action === 'leave') {
    await db.from('voice_members').delete().eq('channel_id', channel.id).eq('user_id', user.id);
  } else if (action === 'stop') {
    await db.from('voice_music').delete().eq('channel_id', channel.id);
  } else {
    return fail(400, 'Invalid action.');
  }
  return NextResponse.json({ ok: true });
}
