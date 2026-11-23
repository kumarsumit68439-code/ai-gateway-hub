import { NextResponse } from 'next/server';
import { admin } from '@/lib/supabase';
import { getUser } from '@/lib/auth';
import { fail } from '@/lib/discord';
import { readImage, storeImage } from '@/lib/upload';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Upload your profile avatar or banner.
export async function POST(req) {
  const user = await getUser(req);
  if (!user) return fail(401, 'Not logged in.');
  const kind = new URL(req.url).searchParams.get('kind');
  if (kind !== 'avatar' && kind !== 'banner') return fail(400, 'Invalid image type.');

  const img = await readImage(req);
  if (img.res) return img.res;
  const db = admin();
  const url = await storeImage(db, `users/${user.id}/${kind}-${Date.now()}.${img.ext}`, img);
  if (!url) return fail(500, 'Upload failed. Please try again.');

  await db.from('profiles').upsert({ id: user.id, [kind + '_url']: url, updated_at: new Date().toISOString() });
  if (kind === 'avatar') await db.from('server_members').update({ user_avatar: url }).eq('user_id', user.id);
  return NextResponse.json({ url });
}
