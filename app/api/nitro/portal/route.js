import { NextResponse } from 'next/server';
import { admin } from '@/lib/supabase';
import { getUser } from '@/lib/auth';
import { fail } from '@/lib/discord';
import { getNitro, stripe, stripeReady } from '@/lib/nitro';

export const dynamic = 'force-dynamic';

// Open the billing portal (change card, cancel, invoices).
export async function POST(req) {
  const user = await getUser(req);
  if (!user) return fail(401, 'Not logged in.');
  if (!stripeReady()) return fail(503, 'Payments are not available yet.');
  const n = await getNitro(admin(), user.id);
  if (!n.row?.stripe_customer) return fail(400, 'You do not have a subscription to manage.');
  try {
    const s = await stripe('billing_portal/sessions', { customer: n.row.stripe_customer, return_url: new URL(req.url).origin + '/nitro' });
    return NextResponse.json({ url: s.url });
  } catch {
    return fail(502, 'Could not open billing right now. Please try again.');
  }
}
