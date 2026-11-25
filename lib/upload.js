import { fail } from '@/lib/discord';

const IMG = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif' };
const AUD = { 'audio/webm': 'webm', 'audio/ogg': 'ogg', 'audio/mp4': 'm4a', 'audio/mpeg': 'mp3', 'audio/wav': 'wav' };

function looksLike(buf, type) {
  const h = (i, s) => buf.subarray(i, i + s.length).toString('latin1') === s;
  if (type === 'image/png') return buf[0] === 0x89 && h(1, 'PNG');
  if (type === 'image/jpeg') return buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  if (type === 'image/gif') return h(0, 'GIF8');
  if (type === 'image/webp') return h(0, 'RIFF') && h(8, 'WEBP');
  if (type === 'audio/webm') return buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3;
  if (type === 'audio/ogg') return h(0, 'OggS');
  if (type === 'audio/mp4') return h(4, 'ftyp');
  if (type === 'audio/mpeg') return h(0, 'ID3') || (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0);
  if (type === 'audio/wav') return h(0, 'RIFF') && h(8, 'WAVE');
  return false;
}

// Reads and validates an uploaded image (png, jpg, webp, gif up to 2 MB). Returns { buf, type, ext } or { res }.
export async function readImage(req) {
  let file;
  try { file = (await req.formData()).get('file'); } catch { return { res: fail(400, 'Invalid upload.') }; }
  if (!file || typeof file === 'string') return { res: fail(400, 'Choose an image file.') };
  if (file.size > 2 * 1024 * 1024) return { res: fail(413, 'Image must be 2 MB or smaller.') };
  const ext = IMG[file.type];
  if (!ext) return { res: fail(400, 'Use a PNG, JPG, WEBP or GIF image.') };
  const buf = Buffer.from(await file.arrayBuffer());
  if (!looksLike(buf, file.type)) return { res: fail(400, 'That file is not a valid image.') };
  return { buf, type: file.type, ext };
}

// Chat attachment: an image (up to 4 MB) or a voice message (up to 2 MB). Also returns the optional text.
export async function readMedia(req) {
  let fd;
  try { fd = await req.formData(); } catch { return { res: fail(400, 'Invalid upload.') }; }
  const file = fd.get('file');
  if (!file || typeof file === 'string') return { res: fail(400, 'Choose a file.') };
  const type = String(file.type).split(';')[0];
  const isImg = !!IMG[type];
  const isAud = !!AUD[type];
  if (!isImg && !isAud) return { res: fail(400, 'Attach a PNG, JPG, WEBP or GIF image, or a voice message.') };
  if (file.size > (isAud ? 2 : 4) * 1024 * 1024) return { res: fail(413, isAud ? 'That voice message is too long.' : 'Image must be 4 MB or smaller.') };
  const buf = Buffer.from(await file.arrayBuffer());
  if (!looksLike(buf, type)) return { res: fail(400, 'That file is not valid.') };
  return { buf, type, ext: isImg ? IMG[type] : AUD[type], kind: isImg ? 'image' : 'audio', text: String(fd.get('text') || '').trim().slice(0, 2000) };
}

// Stores the file in a public bucket and returns its URL (or null on failure).
export async function storeImage(db, path, img, bucket = 'bot-media') {
  const up = await db.storage.from(bucket).upload(path, img.buf, { contentType: img.type, upsert: false });
  if (up.error) return null;
  return db.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}
