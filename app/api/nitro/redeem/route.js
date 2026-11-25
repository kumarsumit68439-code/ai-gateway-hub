import { NextResponse } from 'next/server';
import { admin } from '@/lib/supabase';
import { getUser } from '@/lib/auth';
import { fail } from '@/lib/discord';
import { PLANS, getNitro } from '@/lib/nitro';

export const dynamic = 'force-dynamic';

// Redeem a gift code.
export async function POST(req) {
  const user = await getUser(req);
  if (!user) return fail(401, 'Not logged in.');
  let b = {};
  try { b = await req.json(); } catch {}
  const code = String(b.code || '').trim().toLowerCase().split('/').pop();
  if (!/^[a-z0-9]{8,24}$/.test(code)) return fail(400, 'That gift code is not valid.');

  const db = admin();
  const { data: gift } = await db.from('nitro_gifts').select('code,plan,months,redeemed_by').eq('code', code).maybeSingle();
  if (!gift) return fail(404, 'That gift code is not valid.');
  if (gift.redeemed_by) return fail(400, 'That gift was already redeemed.');

  const cur = await getNitro(db, user.id);
  if (cur.active && cur.row?.source === 'stripe') return fail(400, 'You already have a Nitro subscription. Share this gift with someone else, or redeem it after your subscription ends.');

  const claimed = await db.from('nitro_gifts').update({ redeemed_by: user.id, redeemed_at: new Date().toISOString() }).eq('code', code).is('redeemed_by', null).select('plan,months').maybeSingle();
  if (!claimed.data) return fail(400, 'That gift was already redeemed.');

  const start = cur.active && cur.row?.current_period_end ? new Date(cur.row.current_period_end) : new Date();
  const end = new Date(start);
  end.setMonth(end.getMonth() + claimed.data.months);
  const plan = cur.active && PLANS[cur.plan].rank > PLANS[claimed.data.plan].rank ? cur.plan : claimed.data.plan;
  await db.from('nitro').upsert({ user_id: user.id, plan, status: 'active', current_period_end: end.toISOString(), source: 'gift', stripe_customer: cur.row?.stripe_customer || null, updated_at: new Date().toISOString() });
  return NextResponse.json({ ok: true, plan, until: end.toISOString() });
}
