import { NextResponse } from 'next/server';
import { botAuth } from '@/lib/bots';
import { fail, sleep } from '@/lib/discord';

export const runtime = 'nodejs';
export const maxDuration = 30;
export const dynamic = 'force-dynamic';

// Gateway over HTTPS long-polling.
// First call (no ?after): returns the current last_id and no events.
// Next calls: pass ?after=<last_id>; waits up to ?timeout seconds (max 25) for new messages.
export async function GET(req) {
  const a = await botAuth(req);
  if (!a) return fail(401, 'Invalid bot token.');
  const { db, bot } = a;

  const sp = new URL(req.url).searchParams;
  const timeout = Math.min(Math.max(parseInt(sp.get('timeout') || '20', 10) || 20, 1), 25);
  let after = parseInt(sp.get('after') || '', 10);

  const { data: links } = await db.from('server_bots').select('server_id').eq('bot_id', bot.id);
  const sids = (links || []).map((l) => l.server_id);
  const { data: chs } = sids.length ? await db.from('channels').select('id,server_id').in('server_id', sids).eq('type', 'text') : { data: [] };
  if (!chs?.length) {
    await sleep(Math.min(timeout, 5) * 1000);
    return NextResponse.json({ events: [], last_id: Number.isFinite(after) ? after : 0 });
  }
  const serverOf = Object.fromEntries(chs.map((c) => [c.id, c.server_id]));
  const ids = chs.map((c) => c.id);

  if (!Number.isFinite(after)) {
    const { data: last } = await db.from('messages').select('id').in('channel_id', ids).order('id', { ascending: false }).limit(1);
    return NextResponse.json({ events: [], last_id: last?.[0]?.id || 0 });
  }

  const deadline = Date.now() + timeout * 1000;
  for (;;) {
    const { data } = await db
      .from('messages')
      .select('id,channel_id,author_type,author_id,author_name,content,created_at')
      .in('channel_id', ids)
      .gt('id', after)
      .order('id')
      .limit(50);
    if (data?.length) {
      const events = data
        .filter((m) => !(m.author_type === 'bot' && m.author_id === bot.id))
        .map((m) => ({
          type: 'message_create',
          id: m.id,
          channel_id: m.channel_id,
          server_id: serverOf[m.channel_id],
          author: { id: m.author_id, name: m.author_name, bot: m.author_type === 'bot' },
          content: m.content,
          created_at: m.created_at,
        }));
      return NextResponse.json({ events, last_id: data[data.length - 1].id });
    }
    if (Date.now() >= deadline) return NextResponse.json({ events: [], last_id: after });
    await sleep(1000);
  }
}
