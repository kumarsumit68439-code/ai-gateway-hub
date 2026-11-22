import { NextResponse } from 'next/server';
import { botAuth } from '@/lib/bots';
import { fail } from '@/lib/discord';

export const dynamic = 'force-dynamic';

// Who am I? Also a quick token check.
export async function GET(req) {
  const a = await botAuth(req);
  if (!a) return fail(401, 'Invalid bot token.');
  return NextResponse.json({ id: a.bot.id, name: a.bot.name, prefix: a.bot.prefix, avatar_url: a.bot.avatar_url });
}
