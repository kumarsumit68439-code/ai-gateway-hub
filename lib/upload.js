import { fail } from '@/lib/discord';

const TYPES = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif' };

function looksLike(buf, type) {
  const h = (i, s) => buf.subarray(i, i + s.length).toString('latin1') === s;
  if (type === 'image/png') return buf[0] === 0x89 && h(1, 'PNG');
  if (type === 'image/jpeg') return buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  if (type === 'image/gif') return h(0, 'GIF8');
  if (type === 'image/webp') return h(0, 'RIFF') && h(8, 'WEBP');
  return false;
}

// Reads and validates an uploaded image (png, jpg, webp, gif up to 2 MB). Returns { buf, type, ext } or { res }.
export async function readImage(req) {
  let file;
  try { file = (await req.formData()).get('file'); } catch { return { res: fail(400, 'Invalid upload.') }; }
  if (!file || typeof file === 'string') return { res: fail(400, 'Choose an image file.') };
  if (file.size > 2 * 1024 * 1024) return { res: fail(413, 'Image must be 2 MB or smaller.') };
  const ext = TYPES[file.type];
  if (!ext) return { res: fail(400, 'Use a PNG, JPG, WEBP or GIF image.') };
  const buf = Buffer.from(await file.arrayBuffer());
  if (!looksLike(buf, file.type)) return { res: fail(400, 'That file is not a valid image.') };
  return { buf, type: file.type, ext };
}

// Stores the image in the public media bucket and returns its URL (or null on failure).
export async function storeImage(db, path, img) {
  const up = await db.storage.from('bot-media').upload(path, img.buf, { contentType: img.type, upsert: false });
  if (up.error) return null;
  return db.storage.from('bot-media').getPublicUrl(path).data.publicUrl;
}
