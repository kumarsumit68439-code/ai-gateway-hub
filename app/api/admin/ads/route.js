import { NextResponse } from 'next/server';
import { admin } from '@/lib/supabase';
import { getUser } from '@/lib/auth';
import { fail, isUuid } from '@/lib/discord';
import { isAdmin } from '@/lib/admin';

export const dynamic = 'force-dynamic';

async function gate(req) {
  const user = await getUser(req);
  if (!user) return { res: fail(401, 'Not logged in.') };
  if (!isAdmin(user)) return { res: fail(403, 'Admins only.') };
  return { db: admin() };
}

const https = (v) => { try { return new URL(v).protocol === 'https:'; } catch { return false; } };

// All ads with how many times each was fully watched.
export async function GET(req) {
  const g = await gate(req);
  if (g.res) return g.res;
  const { data: ads } = await g.db.from('ads').select('id,title,advertiser,kind,click_url,duration,active,created_at').order('created_at', { ascending: false });
  const { data: views } = await g.db.from('ad_views').select('ad_id').not('completed_at', 'is', null);
  const counts = {};
  (views || []).forEach((v) => { counts[v.ad_id] = (counts[v.ad_id] || 0) + 1; });
  return NextResponse.json({ ads: (ads || []).map((a) => ({ ...a, views: counts[a.id] || 0 })) });
}

// Add an ad (image or video, https link, 5-60 seconds).
export async function POST(req) {
  const g = await gate(req);
  if (g.res) return g.res;
  let b = {};
  try { b = await req.json(); } catch {}
  const title = String(b.title || '').trim();
  const advertiser = String(b.advertiser || '').trim();
  const kind = b.kind === 'video' ? 'video' : 'image';
  const media = String(b.media_url || '').trim();
  const click = String(b.click_url || '').trim();
  const duration = Math.round(Number(b.duration));
  if (title.length < 2 || title.length > 60) return fail(400, 'Title must be 2-60 characters.');
  if (advertiser.length > 40) return fail(400, 'Advertiser name is too long (40 max).');
  if (!https(media) || media.length > 500) return fail(400, 'Media link must be an https URL.');
  if (click && (!https(click) || click.length > 500)) return fail(400, 'Click link must be an https URL.');
  if (!(duration >= 5 && duration <= 60)) return fail(400, 'Duration must be 5-60 seconds.');
  const { error } = await g.db.from('ads').insert({ title, advertiser: advertiser || null, kind, media_url: media, click_url: click || null, duration });
  if (error) return fail(500, 'Could not add the ad.');
  return NextResponse.json({ ok: true });
}

// Turn an ad on or off.
export async function PATCH(req) {
  const g = await gate(req);
  if (g.res) return g.res;
  let b = {};
  try { b = await req.json(); } catch {}
  if (!isUuid(b.id)) return fail(400, 'Invalid ad.');
  await g.db.from('ads').update({ active: !!b.active }).eq('id', b.id);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req) {
  const g = await gate(req);
  if (g.res) return g.res;
  const id = new URL(req.url).searchParams.get('id');
  if (!isUuid(id)) return fail(400, 'Invalid ad.');
  await g.db.from('ads').delete().eq('id', id);
  return NextResponse.json({ ok: true });
}
