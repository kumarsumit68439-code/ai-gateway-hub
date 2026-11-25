import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { admin } from '@/lib/supabase';
import { PLANS, stripe, verifyStripeSignature } from '@/lib/nitro';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function saveSub(db, uid, sub, customer) {
  const plan = sub.metadata?.plan;
  if (!uid || !PLANS[plan]) return;
  const end = sub.current_period_end ?? sub.items?.data?.[0]?.current_period_end;
  await db.from('nitro').upsert({
    user_id: uid,
    plan,
    status: sub.status,
    current_period_end: end ? new Date(end * 1000).toISOString() : null,
    stripe_customer: typeof customer === 'string' ? customer : customer?.id || null,
    stripe_subscription: sub.id,
    source: 'stripe',
    updated_at: new Date().toISOString(),
  });
}

// Stripe sends payment events here. The signature proves the call is really from Stripe.
export async function POST(req) {
  const raw = await req.text();
  if (!verifyStripeSignature(raw, req.headers.get('stripe-signature'), process.env.STRIPE_WEBHOOK_SECRET)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }
  let event;
  try { event = JSON.parse(raw); } catch { return NextResponse.json({ error: 'Bad payload' }, { status: 400 }); }

  const db = admin();
  try {
    if (event.type === 'checkout.session.completed') {
      const s = event.data.object;
      if (s.mode === 'subscription' && s.subscription) {
        const sub = await stripe(`subscriptions/${s.subscription}`, null, 'GET');
        await saveSub(db, s.client_reference_id || s.metadata?.user_id, sub, s.customer);
      } else if (s.mode === 'payment' && s.metadata?.kind === 'gift' && s.payment_status === 'paid' && PLANS[s.metadata.plan]) {
        const code = crypto.randomBytes(12).toString('hex').slice(0, 16);
        await db.from('nitro_gifts').insert({ code, plan: s.metadata.plan, months: Number(s.metadata.months) === 12 ? 12 : 1, buyer_id: s.metadata.buyer_id, stripe_session: s.id });
      }
    } else if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
      const sub = event.data.object;
      await saveSub(db, sub.metadata?.user_id, sub, sub.customer);
    }
  } catch {
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}
