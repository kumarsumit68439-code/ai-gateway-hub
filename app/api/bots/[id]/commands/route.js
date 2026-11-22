import { NextResponse } from 'next/server';
import { admin } from '@/lib/supabase';
import { getUser } from '@/lib/auth';
import { RESERVED } from '@/lib/bots';
import { fail, isUuid } from '@/lib/discord';

export const dynamic = 'force-dynamic';

async function owned(req, id) {
  const user = await getUser(req);
  if (!user) return { res: fail(401, 'Not logged in.') };
  if (!isUuid(id)) return { res: fail(400, 'Bad id.') };
  const db = admin();
  const { data: bot } = await db.from('bots').select('id').eq('id', id).eq('owner_id', user.id).maybeSingle();
  if (!bot) return { res: fail(404, 'Bot not found.') };
  return { db, bot };
}

// Add or update a custom command (used by bots hosted on this platform).
export async function POST(req, { params }) {
  const o = await owned(req, params.id);
  if (o.res) return o.res;
  let b;
  try { b = await req.json(); } catch { return fail(400, 'Invalid request.'); }
  const name = String(b.name || '').trim().toLowerCase();
  const response = String(b.response || '').trim();
  if (!/^[a-z0-9]{1,20}$/.test(name)) return fail(400, 'Command name: letters and numbers, up to 20 characters.');
  if (RESERVED.includes(name)) return fail(400, 'That name is used by a built-in command.');
  if (response.length < 1 || response.length > 500) return fail(400, 'Response must be 1-500 characters.');

  const { count } = await o.db.from('bot_commands').select('name', { count: 'exact', head: true }).eq('bot_id', o.bot.id);
  const { data: exists } = await o.db.from('bot_commands').select('name').eq('bot_id', o.bot.id).eq('name', name).maybeSingle();
  if (!exists && (count || 0) >= 25) return fail(400, 'You can add up to 25 custom commands.');

  const { error } = await o.db.from('bot_commands').upsert({ bot_id: o.bot.id, name, response });
  if (error) return fail(500, 'Could not save command.');
  return NextResponse.json({ ok: true });
}

export async function DELETE(req, { params }) {
  const o = await owned(req, params.id);
  if (o.res) return o.res;
  const name = String(new URL(req.url).searchParams.get('name') || '').toLowerCase();
  if (!/^[a-z0-9]{1,20}$/.test(name)) return fail(400, 'Invalid command name.');
  await o.db.from('bot_commands').delete().eq('bot_id', o.bot.id).eq('name', name);
  return NextResponse.json({ ok: true });
}
