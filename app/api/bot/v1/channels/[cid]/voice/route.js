import { NextResponse } from 'next/server';
import { botAuth } from '@/lib/bots';
import { botInstalled, fail, isUuid } from '@/lib/discord';

export const dynamic = 'force-dynamic';

// Voice control for a bot: join, leave, play { url, title }, stop.
export async function POST(req, { params }) {
  const a = await botAuth(req);
  if (!a) return fail(401, 'Invalid bot token.');
  if (!isUuid(params.cid)) return fail(400, 'Bad id.');
  const { db, bot } = a;

  const { data: ch } = await db.from('channels').select('id,type,server_id').eq('id', params.cid).maybeSingle();
  if (!ch || ch.type !== 'voice' || !(await botInstalled(db, ch.server_id, bot.id)))
    return fail(404, 'Voice channel not found or the bot is not in this server.');

  let b = {};
  try { b = await req.json(); } catch {}
  const now = new Date().toISOString();

  if (b.action === 'join') {
    await db.from('voice_bots').upsert({ channel_id: ch.id, bot_id: bot.id });
  } else if (b.action === 'leave') {
    await db.from('voice_music').delete().eq('channel_id', ch.id);
    await db.from('voice_bots').delete().eq('channel_id', ch.id).eq('bot_id', bot.id);
  } else if (b.action === 'play') {
    let u;
    try { u = new URL(String(b.url || '')); } catch { return fail(400, 'Provide a valid https audio or YouTube URL.'); }
    if (u.protocol !== 'https:' || u.toString().length > 500) return fail(400, 'Provide a valid https audio or YouTube URL.');
    await db.from('voice_bots').upsert({ channel_id: ch.id, bot_id: bot.id });
    await db.from('voice_music').upsert({
      channel_id: ch.id,
      url: u.toString(),
      title: String(b.title || u.hostname).slice(0, 80),
      requested_by: bot.name,
      started_at: now,
      updated_at: now,
    });
  } else if (b.action === 'stop') {
    await db.from('voice_music').delete().eq('channel_id', ch.id);
  } else {
    return fail(400, 'Invalid action.');
  }
  return NextResponse.json({ ok: true });
}
