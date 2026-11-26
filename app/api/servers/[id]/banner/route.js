import { NextResponse } from 'next/server';
import { admin } from '@/lib/supabase';
import { getUser } from '@/lib/auth';
import { canManage, fail, isUuid } from '@/lib/discord';
import { readImage, storeImage } from '@/lib/upload';
import { serverLevel } from '@/lib/nitro';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Upload a server banner. Needs Boost Level 2.
export async function POST(req, { params }) {
  const user = await getUser(req);
  if (!user) return fail(401, 'Not logged in.');
  if (!isUuid(params.id)) return fail(400, 'Bad id.');
  const db = admin();
  const perm = await canManage(db, params.id, user.id);
  if (!perm.exists) return fail(404, 'Server not found.');
  if (!perm.ok) return fail(403, 'You do not have permission to do that.');
  if ((await serverLevel(db, params.id)) < 2) return fail(403, 'A server banner unlocks at Boost Level 2.');

  const img = await readImage(req);
  if (img.res) return img.res;
  const url = await storeImage(db, `servers/${params.id}/banner-${Date.now()}.${img.ext}`, img);
  if (!url) return fail(500, 'Upload failed. Please try again.');
  await db.from('servers').update({ banner_url: url }).eq('id', params.id);
  return NextResponse.json({ url });
}
