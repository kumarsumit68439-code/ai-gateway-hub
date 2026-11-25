import { NextResponse } from 'next/server';
import { admin } from '@/lib/supabase';
import { getUser } from '@/lib/auth';
import { fail } from '@/lib/discord';
import { PLANS, getNitro, stripeReady } from '@/lib/nitro';

export const dynamic = 'force-dynamic';

// Your Nitro status, boosts and gift codes.
export async function GET(req) {
  const user = await getUser(req);
  if (!user) return fail(401, 'Not logged in.');
  const db = admin();
  const n = await getNitro(db, user.id);

  const [{ data: mine }, { data: gifts }, { data: mems }] = await Promise.all([
    db.from('server_boosts').select('server_id').eq('user_id', user.id),
    db.from('nitro_gifts').select('code,plan,months,redeemed_by,created_at').eq('buyer_id', user.id).order('created_at', { ascending: false }).limit(20),
    db.from('server_members').select('servers(id,name)').eq('user_id', user.id),
  ]);
  const servers = (mems || []).map((m) => m.servers).filter(Boolean).map((s) => ({ id: s.id, name: s.name, mine: (mine || []).filter((b) => b.server_id === s.id).length }));

  return NextResponse.json({
    ready: stripeReady(),
    plans: PLANS,
    nitro: { plan: n.plan, active: n.active, status: n.row?.status || null, period_end: n.row?.current_period_end || null, source: n.row?.source || null, canManage: !!n.row?.stripe_customer },
    boosts: { used: (mine || []).length, max: n.rank >= 2 ? 2 : 0, servers },
    gifts: gifts || [],
  });
}
