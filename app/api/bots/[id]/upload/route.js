import { NextResponse } from 'next/server';
import { admin } from '@/lib/supabase';
import { getUser } from '@/lib/auth';
import { fail, isUuid } from '@/lib/discord';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TYPES = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif' };

function looksLike(buf, type) {
  const h = (i, s) => buf.subarray(i, i + s.length).toString('latin1') === s;
  if (type === 'image/png') return buf[0] === 0x89 && h(1, 'PNG');
  if (type === 'image/jpeg') return buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  if (type === 'image/gif') return h(0, 'GIF8');
  if (type === 'image/webp') return h(0, 'RIFF') && h(8, 'WEBP');
  return false;
}

// Upload an avatar or banner image (png, jpg, webp, gif up to 2 MB).
export async function POST(req, { params }) {
  const user = await getUser(req);
  if (!user) return fail(401, 'Not logged in.');
  if (!isUuid(params.id)) return fail(400, 'Bad id.');
  const kind = new URL(req.url).searchParams.get('kind');
  if (kind !== 'avatar' && kind !== 'banner') return fail(400, 'Invalid image type.');

  const db = admin();
  const { data: bot } = await db.from('bots').select('id').eq('id', params.id).eq('owner_id', user.id).maybeSingle();
  if (!bot) return fail(404, 'Bot not found.');

  let file;
  try { file = (await req.formData()).get('file'); } catch { return fail(400, 'Invalid upload.'); }
  if (!file || typeof file === 'string') return fail(400, 'Choose an image file.');
  if (file.size > 2 * 1024 * 1024) return fail(413, 'Image must be 2 MB or smaller.');
  const ext = TYPES[file.type];
  if (!ext) return fail(400, 'Use a PNG, JPG, WEBP or GIF image.');

  const buf = Buffer.from(await file.arrayBuffer());
  if (!looksLike(buf, file.type)) return fail(400, 'That file is not a valid image.');

  const path = `${bot.id}/${kind}-${Date.now()}.${ext}`;
  const up = await db.storage.from('bot-media').upload(path, buf, { contentType: file.type, upsert: false });
  if (up.error) return fail(500, 'Upload failed. Please try again.');
  const url = db.storage.from('bot-media').getPublicUrl(path).data.publicUrl;

  const { error } = await db.from('bots').update({ [kind + '_url']: url }).eq('id', bot.id);
  if (error) return fail(500, 'Could not save image.');
  return NextResponse.json({ url });
}
