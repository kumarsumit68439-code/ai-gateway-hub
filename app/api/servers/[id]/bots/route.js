import { NextResponse } from 'next/server';
import { admin } from '@/lib/supabase';
import { getUser } from '@/lib/auth';
import { fail, isUuid, postMessage } from '@/lib/discord';

export const dynamic = 'force-dynamic';
const MAX_BOTS = 10;

async function ownerOf(req, sid) {
  const user = await getUser(req);
  if (!user) return { res: fail(401, 'Not logged in.') };
  if (!isUuid(sid)) return { res: fail(400, 'Bad id.') };
  const db = admin();
  const { data: server } = await db.from('servers').select('id,name,owner_id').eq('id', sid).maybeSingle();
  if (!server) return { res: fail(404, 'Server not found.') };
  if (server.owner_id !== user.id) return { res: fail(403, 'Only the server owner can manage bots.') };
  return { db, user, server };
}

// Owner: add a bot to the server (the invite flow).
export async function POST(req, { params }) {
  const o = await ownerOf(req, params.id);
  if (o.res) return o.res;
  let b = {};
  try { b = await req.json(); } catch {}
  if (!isUuid(b.botId)) return fail(400, 'Invalid bot.');

  const { data: bot } = await o.db.from('bots').select('id,name,avatar_url').eq('id', b.botId).maybeSingle();
  if (!bot) return fail(404, 'Bot not found.');
  const { count } = await o.db.from('server_bots').select('bot_id', { count: 'exact', head: true }).eq('server_id', o.server.id);
  const { data: already } = await o.db.from('server_bots').select('bot_id').eq('server_id', o.server.id).eq('bot_id', bot.id).maybeSingle();
  if (already) return NextResponse.json({ ok: true, already: true });
  if ((count || 0) >= MAX_BOTS) return fail(400, `A server can have up to ${MAX_BOTS} bots.`);

  await o.db.from('server_bots').insert({ server_id: o.server.id, bot_id: bot.id, added_by: o.user.id });
  const { data: ch } = await o.db.from('channels').select('id').eq('server_id', o.server.id).eq('type', 'text').order('position').limit(1);
  if (ch?.length) await postMessage(o.db, ch[0].id, { type: 'bot', id: bot.id, name: bot.name, avatar: bot.avatar_url }, `${bot.name} joined the server. Type the prefix followed by help to see commands.`);
  return NextResponse.json({ ok: true });
}

// Owner: remove a bot from the server.
export async function DELETE(req, { params }) {
  const o = await ownerOf(req, params.id);
  if (o.res) return o.res;
  const botId = new URL(req.url).searchParams.get('botId');
  if (!isUuid(botId)) return fail(400, 'Invalid bot.');
  const { data: chs } = await o.db.from('channels').select('id').eq('server_id', o.server.id);
  if (chs?.length) await o.db.from('voice_bots').delete().eq('bot_id', botId).in('channel_id', chs.map((c) => c.id));
  await o.db.from('server_bots').delete().eq('server_id', o.server.id).eq('bot_id', botId);
  return NextResponse.json({ ok: true });
}
