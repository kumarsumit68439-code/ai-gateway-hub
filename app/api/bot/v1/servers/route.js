import { NextResponse } from 'next/server';
import { botAuth } from '@/lib/bots';
import { fail } from '@/lib/discord';

export const dynamic = 'force-dynamic';

// Servers this bot has been added to, with their channels.
export async function GET(req) {
  const a = await botAuth(req);
  if (!a) return fail(401, 'Invalid bot token.');
  const { data } = await a.db
    .from('server_bots')
    .select('servers(id,name,channels(id,name,type))')
    .eq('bot_id', a.bot.id);
  return NextResponse.json({ servers: (data || []).map((x) => x.servers).filter(Boolean) });
}
