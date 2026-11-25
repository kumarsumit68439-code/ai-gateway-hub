import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth';
import { fail } from '@/lib/discord';
import { PLANS, stripe, stripeReady } from '@/lib/nitro';

export const dynamic = 'force-dynamic';

// Buy a Nitro gift code (one-time payment). The code appears in your gifts after payment.
export async function POST(req) {
  const user = await getUser(req);
  if (!user) return fail(401, 'Not logged in.');
  if (!stripeReady()) return fail(503, 'Payments are not available yet.');

  let b = {};
  try { b = await req.json(); } catch {}
  const plan = PLANS[b.plan] ? b.plan : null;
  const months = Number(b.months) === 12 ? 12 : 1;
  if (!plan) return fail(400, 'Choose a plan.');

  const origin = new URL(req.url).origin;
  try {
    const s = await stripe('checkout/sessions', {
      mode: 'payment',
      customer_email: user.email,
      success_url: origin + '/nitro?gift=success',
      cancel_url: origin + '/nitro',
      line_items: [{ quantity: 1, price_data: { currency: 'usd', unit_amount: months === 12 ? PLANS[plan].year : PLANS[plan].month, product_data: { name: `${PLANS[plan].name} gift (${months === 12 ? '1 year' : '1 month'})` } } }],
      metadata: { kind: 'gift', buyer_id: user.id, plan, months },
    });
    return NextResponse.json({ url: s.url });
  } catch {
    return fail(502, 'Could not start checkout. Please try again.');
  }
}
