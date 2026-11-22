import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { admin } from '@/lib/supabase';
import { getUser } from '@/lib/auth';
import { hashKey } from '@/lib/keys';
import { newBotToken } from '@/lib/bots';
import { verifyCaptcha } from '@/lib/captcha';
import { fail } from '@/lib/discord';

export const dynamic = 'force-dynamic';
const MAX_BOTS = 5;

// Create a bot. Needs a verified email and a fresh captcha. The token is returned ONCE.
export async function POST(req) {
  const user = await getUser(req);
  if (!user) return fail(401, 'Not logged in.');
  if (!user.email_confirmed_at) return fail(403, 'Verify your email first.');

  let b = {};
  try { b = await req.json(); } catch {}
  const name = String(b.name || '').trim();
  const hosting = b.hosting === 'jilowa' ? 'jilowa' : 'self';
  if (name.length < 2 || name.length > 32) return fail(400, 'Bot name must be 2-32 characters.');

  const c = await verifyCaptcha(b.captcha, req);
  if (!c.ok) return fail(c.status, c.error);

  const db = admin();
  const { count } = await db.from('bots').select('id', { count: 'exact', head: true }).eq('owner_id', user.id);
  if ((count || 0) >= MAX_BOTS) return fail(400, `You can create up to ${MAX_BOTS} bots.`);

  const id = randomUUID();
  const { token, prefix } = newBotToken(id);
  const { error } = await db.from('bots').insert({ id, owner_id: user.id, name, hosting, token_hash: hashKey(token), token_prefix: prefix });
  if (error) return fail(500, 'Could not create bot.');
  return NextResponse.json({ id, name, token });
}
