import crypto from 'node:crypto';

// Plans (USD cents). Nitro Basic: animated avatar and decorations. Nitro: everything, plus profile banner,
// profile colors and 2 server boosts.
export const PLANS = {
  basic: { name: 'Nitro Basic', rank: 1, month: 299, year: 2999 },
  nitro: { name: 'Nitro', rank: 2, month: 999, year: 9999 },
};
export const BOOST_LEVELS = [2, 7, 14];
export const levelOf = (n) => BOOST_LEVELS.filter((t) => n >= t).length;
export const stripeReady = () => !!process.env.STRIPE_SECRET_KEY;
export const isGifUrl = (u) => { try { return /\.gif$/i.test(new URL(u).pathname); } catch { return false; } };
const LIVE = ['active', 'trialing'];

function enc(obj, prefix = '', out = []) {
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (Array.isArray(v)) v.forEach((x, i) => (typeof x === 'object' ? enc(x, `${key}[${i}]`, out) : out.push([`${key}[${i}]`, String(x)])));
    else if (typeof v === 'object') enc(v, key, out);
    else out.push([key, String(v)]);
  }
  return out;
}

// Minimal Stripe REST client (no SDK needed).
export async function stripe(path, params, method = 'POST') {
  const body = params ? new URLSearchParams(enc(params)).toString() : undefined;
  const r = await fetch('https://api.stripe.com/v1/' + path, {
    method,
    headers: { Authorization: 'Bearer ' + process.env.STRIPE_SECRET_KEY, 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    signal: AbortSignal.timeout(20000),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j?.error?.message || 'Payment provider error');
  return j;
}

export function verifyStripeSignature(raw, header, secret) {
  if (!header || !secret) return false;
  const items = header.split(',').map((p) => p.split('='));
  const t = items.find((i) => i[0] === 't')?.[1];
  const sigs = items.filter((i) => i[0] === 'v1').map((i) => i[1]);
  if (!t || !sigs.length || Math.abs(Date.now() / 1000 - Number(t)) > 300) return false;
  const want = crypto.createHmac('sha256', secret).update(`${t}.${raw}`).digest('hex');
  return sigs.some((s) => s.length === want.length && crypto.timingSafeEqual(Buffer.from(s), Buffer.from(want)));
}

export async function getNitro(db, uid) {
  const { data } = await db.from('nitro').select('plan,status,current_period_end,source,stripe_customer').eq('user_id', uid).maybeSingle();
  const live = !!data && LIVE.includes(data.status) && (!data.current_period_end || new Date(data.current_period_end) > new Date());
  return { row: data || null, active: live, plan: live ? data.plan : null, rank: live ? PLANS[data.plan].rank : 0 };
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
