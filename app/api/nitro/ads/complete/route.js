import { NextResponse } from 'next/server';
import { admin } from '@/lib/supabase';
import { getUser } from '@/lib/auth';
import { fail, isUuid } from '@/lib/discord';
import { ADS_PER_CLAIM } from '@/lib/nitro';

export const dynamic = 'force-dynamic';

// Finish an ad. Counts only if the full ad time has really passed on the server.
export async function POST(req) {
  const user = await getUser(req);
  if (!user) return fail(401, 'Not logged in.');
  let b = {};
  try { b = await req.json(); } catch {}
  if (!isUuid(b.viewId)) return fail(400, 'Invalid ad.');

  const db = admin();
  const { data: v } = await db.from('ad_views').select('id,started_at,completed_at,ads(duration)').eq('id', b.viewId).eq('user_id', user.id).maybeSingle();
  if (!v) return fail(404, 'Ad not found.');
  if (v.completed_at) return fail(400, 'You already finished this ad.');
  const need = (v.ads?.duration || 15) * 1000 - 500;
  if (Date.now() - new Date(v.started_at).getTime() < need) return fail(400, 'The ad is not finished yet.');

  const done = await db.from('ad_views').update({ completed_at: new Date().toISOString() }).eq('id', v.id).is('completed_at', null).select('id').maybeSingle();
  if (!done.data) return fail(400, 'You already finished this ad.');

  const { count } = await db.from('ad_views').select('id', { count: 'exact', head: true }).eq('user_id', user.id).not('completed_at', 'is', null).is('claimed_at', null);
  return NextResponse.json({ watched: count || 0, needed: ADS_PER_CLAIM, canClaim: (count || 0) >= ADS_PER_CLAIM });
}
