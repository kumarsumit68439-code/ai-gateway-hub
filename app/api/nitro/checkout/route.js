import { NextResponse } from 'next/server';
import { admin } from '@/lib/supabase';
import { getUser } from '@/lib/auth';
import { fail } from '@/lib/discord';
import { PLANS, getNitro, stripe, stripeReady } from '@/lib/nitro';

export const dynamic = 'force-dynamic';

// Start a Nitro subscription (opens secure Stripe checkout).
export async function POST(req) {
  const user = await getUser(req);
  if (!user) return fail(401, 'Not logged in.');
  if (!stripeReady()) return fail(503, 'Payments are not available yet.');

  let b = {};
  try { b = await req.json(); } catch {}
  const plan = PLANS[b.plan] ? b.plan : null;
  const interval = b.interval === 'year' ? 'year' : 'month';
  if (!plan) return fail(400, 'Choose a plan.');

  const n = await getNitro(admin(), user.id);
  if (n.active && n.row?.source === 'stripe') return fail(400, 'You already have Nitro. Use Manage subscription to change it.');

  const origin = new URL(req.url).origin;
  try {
    const s = await stripe('checkout/sessions', {
      mode: 'subscription',
      client_reference_id: user.id,
      ...(n.row?.stripe_customer ? { customer: n.row.stripe_customer } : { customer_email: user.email }),
      success_url: origin + '/nitro?status=success',
      cancel_url: origin + '/nitro',
      line_items: [{ quantity: 1, price_data: { currency: 'usd', unit_amount: PLANS[plan][interval], recurring: { interval }, product_data: { name: `${PLANS[plan].name} (${interval === 'year' ? 'yearly' : 'monthly'})` } } }],
      subscription_data: { metadata: { user_id: user.id, plan } },
      metadata: { user_id: user.id, plan },
    });
    return NextResponse.json({ url: s.url });
  } catch {
    return fail(502, 'Could not start checkout. Please try again.');
  }
}
