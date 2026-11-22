import { NextResponse } from 'next/server';
import { botAuth } from '@/lib/bots';
import { botInstalled, fail, isUuid, postMessage } from '@/lib/discord';

export const dynamic = 'force-dynamic';

async function channelFor(a, cid) {
  if (!isUuid(cid)) return null;
  const { data: ch } = await a.db.from('channels').select('id,type,server_id').eq('id', cid).maybeSingle();
  if (!ch || ch.type !== 'text') return null;
  return (await botInstalled(a.db, ch.server_id, a.bot.id)) ? ch : null;
}

// Recent messages of a channel the bot can access.
export async function GET(req, { params }) {
  const a = await botAuth(req);
  if (!a) return fail(401, 'Invalid bot token.');
  const ch = await channelFor(a, params.cid);
  if (!ch) return fail(404, 'Channel not found or the bot is not in this server.');
  const limit = Math.min(Math.max(parseInt(new URL(req.url).searchParams.get('limit') || '50', 10) || 50, 1), 100);
  const { data } = await a.db
    .from('messages')
    .select('id,author_type,author_id,author_name,content,created_at')
    .eq('channel_id', ch.id)
    .order('id', { ascending: false })
    .limit(limit);
  return NextResponse.json({ messages: (data || []).reverse() });
}

// Send a message as the bot.
export async function POST(req, { params }) {
  const a = await botAuth(req);
  if (!a) return fail(401, 'Invalid bot token.');
  const ch = await channelFor(a, params.cid);
  if (!ch) return fail(404, 'Channel not found or the bot is not in this server.');

  let b = {};
  try { b = await req.json(); } catch {}
  const content = String(b.content || '').trim();
  if (content.length < 1 || content.length > 2000) return fail(400, 'Message must be 1-2000 characters.');

  const since = new Date(Date.now() - 10000).toISOString();
  const { count } = await a.db.from('messages').select('id', { count: 'exact', head: true }).eq('author_id', a.bot.id).gte('created_at', since);
  if ((count || 0) >= 15) return fail(429, 'Slow down: too many messages.');

  const m = await postMessage(a.db, ch.id, { type: 'bot', id: a.bot.id, name: a.bot.name, avatar: a.bot.avatar_url }, content);
  return NextResponse.json({ id: m.id });
}
