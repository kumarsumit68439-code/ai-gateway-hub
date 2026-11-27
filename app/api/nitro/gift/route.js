import { NextResponse } from 'next/server';
import { admin } from '@/lib/supabase';
import { getUser } from '@/lib/auth';
import { fail } from '@/lib/discord';
import { DAY_MS, GIFT_DAYS, getNitro } from '@/lib/nitro';
import crypto from 'node:crypto';

export const dynamic = 'force-dynamic';

// Gift some of your own Nitro days. The days leave your Nitro and go into a code you can share.
export async function POST(req) {
  const user = await getUser(req);
  if (!user) return fail(401, 'Not logged in.');
  let b = {};
  try { b = await req.json(); } catch {}
  const days = Number(b.days);
  if (!GIFT_DAYS.includes(days)) return fail(400, 'Choose 1, 3 or 7 days.');

  const db = admin();
  const n = await getNitro(db, user.id);
  const end = n.row?.current_period_end ? new Date(n.row.current_period_end).getTime() : 0;
  if (!n.active || end - Date.now() < days * DAY_MS) return fail(400, `You need at least ${days} day${days === 1 ? '' : 's'} of Nitro left to gift that much.`);

  const { count } = await db.from('nitro_gifts').select('code', { count: 'exact', head: true }).eq('buyer_id', user.id).is('redeemed_by', null);
  if ((count || 0) >= 5) return fail(400, 'You can hold up to 5 unredeemed gifts.');

  const code = crypto.randomBytes(12).toString('hex').slice(0, 16);
  const { error } = await db.from('nitro_gifts').insert({ code, plan: 'nitro', days, buyer_id: user.id });
  if (error) return fail(500, 'Could not create the gift.');
  await db.from('nitro').update({ current_period_end: new Date(end - days * DAY_MS).toISOString(), updated_at: new Date().toISOString() }).eq('user_id', user.id);
  return NextResponse.json({ ok: true, code });
}
