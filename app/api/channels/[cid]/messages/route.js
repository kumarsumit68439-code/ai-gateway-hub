import { NextResponse } from 'next/server';
import { admin } from '@/lib/supabase';
import { getUser } from '@/lib/auth';
import { displayName, fail, isMember, isUuid, postMessage } from '@/lib/discord';
import { runHostedBots } from '@/lib/runtime';

export const runtime = 'nodejs';
export const maxDuration = 45;
export const dynamic = 'force-dynamic';

// Send a message to a text channel. Hosted bots answer prefix commands right after.
export async function POST(req, { params }) {
  const user = await getUser(req);
  if (!user) return fail(401, 'Not logged in.');
  if (!isUuid(params.cid)) return fail(400, 'Bad id.');

  const db = admin();
  const { data: channel } = await db.from('channels').select('id,name,type,server_id').eq('id', params.cid).maybeSingle();
  if (!channel || channel.type !== 'text') return fail(404, 'Channel not found.');
  if (!(await isMember(db, channel.server_id, user.id))) return fail(403, 'You are not in this server.');

  let b = {};
  try { b = await req.json(); } catch {}
  const content = String(b.content || '').trim();
  if (content.length < 1 || content.length > 2000) return fail(400, 'Message must be 1-2000 characters.');

  const since = new Date(Date.now() - 10000).toISOString();
  const { count } = await db.from('messages').select('id', { count: 'exact', head: true }).eq('author_id', user.id).gte('created_at', since);
  if ((count || 0) >= 10) return fail(429, 'You are sending messages too fast.');

  const userName = await displayName(db, user);
  await postMessage(db, channel.id, { type: 'user', id: user.id, name: userName }, content);

  const { data: server } = await db.from('servers').select('id,name').eq('id', channel.server_id).maybeSingle();
  try {
    await runHostedBots({ db, server, channel, user, userName, content });
  } catch {}
  return NextResponse.json({ ok: true });
}
