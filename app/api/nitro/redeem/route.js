import { NextResponse } from 'next/server';
import { admin } from '@/lib/supabase';
import { getUser } from '@/lib/auth';
import { fail } from '@/lib/discord';
import { grantDays } from '@/lib/nitro';

export const dynamic = 'force-dynamic';

// Redeem a gift code for Nitro days.
export async function POST(req) {
  const user = await getUser(req);
  if (!user) return fail(401, 'Not logged in.');
  let b = {};
  try { b = await req.json(); } catch {}
  const code = String(b.code || '').trim().toLowerCase().split('/').pop();
  if (!/^[a-z0-9]{8,24}$/.test(code)) return fail(400, 'That gift code is not valid.');

  const db = admin();
  const { data: gift } = await db.from('nitro_gifts').select('code,days,redeemed_by').eq('code', code).maybeSingle();
  if (!gift || !gift.days) return fail(404, 'That gift code is not valid.');
  if (gift.redeemed_by) return fail(400, 'That gift was already redeemed.');

  const claimed = await db.from('nitro_gifts').update({ redeemed_by: user.id, redeemed_at: new Date().toISOString() }).eq('code', code).is('redeemed_by', null).select('days').maybeSingle();
  if (!claimed.data) return fail(400, 'That gift was already redeemed.');

  const g = await grantDays(db, user.id, claimed.data.days, 'gift', 30);
  if (!g.ok) {
    await db.from('nitro_gifts').update({ redeemed_by: null, redeemed_at: null }).eq('code', code);
    return fail(400, 'Your Nitro is already very long. Try again later.');
  }
  return NextResponse.json({ ok: true, days: claimed.data.days, until: g.until });
}
