import { NextResponse } from 'next/server';
import { botAuth } from '@/lib/bots';
import { botInstalled, fail, isUuid } from '@/lib/discord';

export const dynamic = 'force-dynamic';

// Who is in which voice channel of a server (so a bot can find the user who called it).
export async function GET(req) {
  const a = await botAuth(req);
  if (!a) return fail(401, 'Invalid bot token.');
  const sid = new URL(req.url).searchParams.get('server_id');
  if (!isUuid(sid) || !(await botInstalled(a.db, sid, a.bot.id))) return fail(404, 'Server not found or the bot is not in it.');

  const { data: chs } = await a.db.from('channels').select('id,name').eq('server_id', sid).eq('type', 'voice');
  if (!chs?.length) return NextResponse.json({ voice_states: [] });
  const since = new Date(Date.now() - 90000).toISOString();
  const { data } = await a.db.from('voice_members').select('channel_id,user_id,user_name').in('channel_id', chs.map((c) => c.id)).gte('updated_at', since);
  return NextResponse.json({ voice_states: data || [], channels: chs });
}
