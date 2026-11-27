import { NextResponse } from 'next/server';
import { admin } from '@/lib/supabase';
import { getUser } from '@/lib/auth';
import { verifyCaptcha } from '@/lib/captcha';
import { fail } from '@/lib/discord';
import { ADS_PER_CLAIM, CLAIM_DAYS, MAX_DAYS, grantDays } from '@/lib/nitro';

export const dynamic = 'force-dynamic';

// Claim free Nitro after watching enough ads. Needs our human check.
export async function POST(req) {
  const user = await getUser(req);
  if (!user) return fail(401, 'Not logged in.');
  let b = {};
  try { b = await req.json(); } catch {}

  const c = await verifyCaptcha(b.captcha);
  if (!c.ok) return fail(c.status, c.error);

  const db = admin();
  const { data: views } = await db.from('ad_views').select('id').eq('user_id', user.id).not('completed_at', 'is', null).is('claimed_at', null).order('completed_at').limit(ADS_PER_CLAIM);
  if ((views || []).length < ADS_PER_CLAIM) return fail(400, `Watch ${ADS_PER_CLAIM} ads to claim Nitro.`);

  // Check the cap before using up the ads.
  const probe = await grantDays(db, user.id, 0, 'ads');
  void probe;
  const claimed = await db.from('ad_views').update({ claimed_at: new Date().toISOString() }).in('id', views.map((v) => v.id)).is('claimed_at', null).select('id');
  if ((claimed.data || []).length < ADS_PER_CLAIM) return fail(400, 'Those ads were already used.');

  const g = await grantDays(db, user.id, CLAIM_DAYS, 'ads');
  if (!g.ok) {
    await db.from('ad_views').update({ claimed_at: null }).in('id', claimed.data.map((v) => v.id));
    return fail(400, `You already have the maximum of ${MAX_DAYS} days of Nitro. Use some first.`);
  }
  return NextResponse.json({ ok: true, until: g.until });
}
