import { NextResponse } from 'next/server';
import { admin } from '@/lib/supabase';
import { getUser } from '@/lib/auth';
import { fail } from '@/lib/discord';
import { isAdmin } from '@/lib/admin';
import { ADS_PER_CLAIM, ADS_PER_DAY, DAY_MS, getNitro } from '@/lib/nitro';

export const dynamic = 'force-dynamic';

// Your Nitro time, ad progress, boosts and gift codes.
export async function GET(req) {
  const user = await getUser(req);
  if (!user) return fail(401, 'Not logged in.');
  const db = admin();
  const since = new Date(Date.now() - DAY_MS).toISOString();
  const [n, { data: mine }, { data: gifts }, { data: mems }, unclaimed, today] = await Promise.all([
    getNitro(db, user.id),
    db.from('server_boosts').select('server_id').eq('user_id', user.id),
    db.from('nitro_gifts').select('code,days,redeemed_by,created_at').eq('buyer_id', user.id).order('created_at', { ascending: false }).limit(20),
    db.from('server_members').select('servers(id,name)').eq('user_id', user.id),
    db.from('ad_views').select('id', { count: 'exact', head: true }).eq('user_id', user.id).not('completed_at', 'is', null).is('claimed_at', null),
    db.from('ad_views').select('id', { count: 'exact', head: true }).eq('user_id', user.id).gte('started_at', since),
  ]);
  const servers = (mems || []).map((m) => m.servers).filter(Boolean).map((s) => ({ id: s.id, name: s.name, mine: (mine || []).filter((b) => b.server_id === s.id).length }));
  const watched = unclaimed.count || 0;

  return NextResponse.json({
    nitro: { plan: n.plan, active: n.active, period_end: n.row?.current_period_end || null, source: n.row?.source || null },
    ads: { watched, needed: ADS_PER_CLAIM, today: today.count || 0, limit: ADS_PER_DAY, canClaim: watched >= ADS_PER_CLAIM },
    boosts: { used: (mine || []).length, max: n.rank >= 2 ? 2 : 0, servers },
    gifts: gifts || [],
    admin: isAdmin(user),
  });
}
