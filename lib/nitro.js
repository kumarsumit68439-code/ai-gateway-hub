// Nitro is free: watch ads, claim days. No payments anywhere.
export const PLANS = {
  basic: { name: 'Nitro Basic', rank: 1 },
  nitro: { name: 'Nitro', rank: 2 },
};
export const BOOST_LEVELS = [2, 7, 14];
export const levelOf = (n) => BOOST_LEVELS.filter((t) => n >= t).length;
export const isGifUrl = (u) => { try { return /\.gif$/i.test(new URL(u).pathname); } catch { return false; } };
export const DAY_MS = 86400000;
export const ADS_PER_CLAIM = 3; // ads to watch for one claim
export const CLAIM_DAYS = 1; // days of Nitro per claim
export const MAX_DAYS = 7; // most Nitro time you can stack from claims
export const ADS_PER_DAY = 6; // ads you can start per 24 hours
export const GIFT_DAYS = [1, 3, 7];
const LIVE = ['active', 'trialing'];

export async function getNitro(db, uid) {
  const { data } = await db.from('nitro').select('plan,status,current_period_end,source').eq('user_id', uid).maybeSingle();
  const live = !!data && LIVE.includes(data.status) && (!data.current_period_end || new Date(data.current_period_end) > new Date());
  return { row: data || null, active: live, plan: live ? data.plan : null, rank: live ? PLANS[data.plan].rank : 0 };
}

// Adds days to the user's Nitro. Refuses to go past capDays from now.
export async function grantDays(db, uid, days, source, capDays = MAX_DAYS) {
  const n = await getNitro(db, uid);
  const now = Date.now();
  const start = n.active && n.row.current_period_end ? new Date(n.row.current_period_end).getTime() : now;
  const end = start + days * DAY_MS;
  if (end - now > capDays * DAY_MS) return { ok: false };
  const { error } = await db.from('nitro').upsert({
    user_id: uid,
    plan: 'nitro',
    status: 'active',
    current_period_end: new Date(end).toISOString(),
    source,
    stripe_customer: null,
    stripe_subscription: null,
    updated_at: new Date().toISOString(),
  });
  return error ? { ok: false } : { ok: true, until: new Date(end).toISOString() };
}

// Boosts only count while the booster has an active full Nitro.
export async function boostCount(db, sid) {
  const { data } = await db.from('server_boosts').select('user_id').eq('server_id', sid);
  if (!data?.length) return 0;
  const users = [...new Set(data.map((x) => x.user_id))];
  const { data: ns } = await db.from('nitro').select('user_id,plan,status,current_period_end').in('user_id', users);
  const ok = new Set((ns || []).filter((n) => PLANS[n.plan]?.rank === 2 && LIVE.includes(n.status) && (!n.current_period_end || new Date(n.current_period_end) > new Date())).map((n) => n.user_id));
  return data.filter((x) => ok.has(x.user_id)).length;
}
export async function serverLevel(db, sid) {
  return levelOf(await boostCount(db, sid));
}
