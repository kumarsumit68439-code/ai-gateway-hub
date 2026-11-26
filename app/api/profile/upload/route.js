import { NextResponse } from 'next/server';
import { admin } from '@/lib/supabase';
import { getUser } from '@/lib/auth';
import { fail } from '@/lib/discord';
import { readImage, storeImage } from '@/lib/upload';
import { getNitro } from '@/lib/nitro';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Upload your avatar or banner. Animated (GIF) avatars need Nitro; banners need Nitro.
export async function POST(req) {
  const user = await getUser(req);
  if (!user) return fail(401, 'Not logged in.');
  const kind = new URL(req.url).searchParams.get('kind');
  if (kind !== 'avatar' && kind !== 'banner') return fail(400, 'Invalid image type.');

  const db = admin();
  const nit = await getNitro(db, user.id);
  if (kind === 'banner' && nit.rank < 2) return fail(403, 'A profile banner needs Nitro.');

  const img = await readImage(req);
  if (img.res) return img.res;
  if (kind === 'avatar' && img.type === 'image/gif' && nit.rank < 1) return fail(403, 'Animated avatars need Nitro.');

  const url = await storeImage(db, `users/${user.id}/${kind}-${Date.now()}.${img.ext}`, img);
  if (!url) return fail(500, 'Upload failed. Please try again.');

  await db.from('profiles').upsert({ id: user.id, [kind + '_url']: url, updated_at: new Date().toISOString() });
  if (kind === 'avatar') await db.from('server_members').update({ user_avatar: url }).eq('user_id', user.id);
  return NextResponse.json({ url });
}
