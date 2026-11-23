import { NextResponse } from 'next/server';
import { admin } from '@/lib/supabase';
import { getUser } from '@/lib/auth';
import { botInstalled, canManage, fail, isUuid, postMessage } from '@/lib/discord';

export const dynamic = 'force-dynamic';
const MAX_BOTS = 10;

async function gate(req, sid) {
  const user = await getUser(req);
  if (!user) return { res: fail(401, 'Not logged in.') };
  if (!isUuid(sid)) return { res: fail(400, 'Bad id.') };
  const db = admin();
  const perm = await canManage(db, sid, user.id);
  if (!perm.exists) return { res: fail(404, 'Server not found.') };
  if (!perm.ok) return { res: fail(403, 'You do not have permission to manage bots.') };
  return { db, user };
}

// Add a bot to the server (owner or manager).
export async function POST(req, { params }) {
  const g = await gate(req, params.id);
  if (g.res) return g.res;
  let b = {};
  try { b = await req.json(); } catch {}
  if (!isUuid(b.botId)) return fail(400, 'Invalid bot.');

  const { data: bot } = await g.db.from('bots').select('id,name,avatar_url').eq('id', b.botId).maybeSingle();
  if (!bot) return fail(404, 'Bot not found.');
  if (await botInstalled(g.db, params.id, bot.id)) return NextResponse.json({ ok: true, already: true });
  const { count } = await g.db.from('server_bots').select('bot_id', { count: 'exact', head: true }).eq('server_id', params.id);
  if ((count || 0) >= MAX_BOTS) return fail(400, `A server can have up to ${MAX_BOTS} bots.`);

  await g.db.from('server_bots').insert({ server_id: params.id, bot_id: bot.id, added_by: g.user.id });
  const { data: ch } = await g.db.from('channels').select('id').eq('server_id', params.id).eq('type', 'text').order('position').limit(1);
  if (ch?.length) await postMessage(g.db, ch[0].id, { type: 'bot', id: bot.id, name: bot.name, avatar: bot.avatar_url }, `${bot.name} joined the server. Type the prefix followed by help to see commands.`);
  return NextResponse.json({ ok: true });
}

// Remove a bot from the server.
export async function DELETE(req, { params }) {
  const g = await gate(req, params.id);
  if (g.res) return g.res;
  const botId = new URL(req.url).searchParams.get('botId');
  if (!isUuid(botId)) return fail(400, 'Invalid bot.');
  const { data: chs } = await g.db.from('channels').select('id').eq('server_id', params.id);
  if (chs?.length) await g.db.from('voice_bots').delete().eq('bot_id', botId).in('channel_id', chs.map((c) => c.id));
  await g.db.from('server_bots').delete().eq('server_id', params.id).eq('bot_id', botId);
  return NextResponse.json({ ok: true });
}
