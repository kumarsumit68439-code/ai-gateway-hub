import { NextResponse } from 'next/server';
import { admin } from '@/lib/supabase';
import { getUser } from '@/lib/auth';
import { fail } from '@/lib/discord';
import { ADS_PER_DAY, DAY_MS } from '@/lib/nitro';

export const dynamic = 'force-dynamic';

// Start watching an ad. The server remembers when it started.
export async function POST(req) {
  const user = await getUser(req);
  if (!user) return fail(401, 'Not logged in.');
  const db = admin();

  const since = new Date(Date.now() - DAY_MS).toISOString();
  const { count } = await db.from('ad_views').select('id', { count: 'exact', head: true }).eq('user_id', user.id).gte('started_at', since);
  if ((count || 0) >= ADS_PER_DAY) return fail(429, 'You have reached the daily ad limit. Come back tomorrow.');

  const { data: ads } = await db.from('ads').select('id,title,advertiser,kind,media_url,click_url,duration').eq('active', true);
  if (!ads?.length) return fail(404, 'No ads are available right now. Please try again later.');

  const { data: last } = await db.from('ad_views').select('ad_id').eq('user_id', user.id).order('started_at', { ascending: false }).limit(1);
  const pool = ads.length > 1 ? ads.filter((a) => a.id !== last?.[0]?.ad_id) : ads;
  const ad = pool[Math.floor(Math.random() * pool.length)];

  const { data: view, error } = await db.from('ad_views').insert({ user_id: user.id, ad_id: ad.id }).select('id').single();
  if (error) return fail(500, 'Could not start the ad. Please try again.');
  return NextResponse.json({ viewId: view.id, ad });
}
