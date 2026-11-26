import { NextResponse } from 'next/server';
import { admin } from '@/lib/supabase';
import { getUser } from '@/lib/auth';
import { cleanUrl, fail } from '@/lib/discord';
import { getNitro, isGifUrl } from '@/lib/nitro';

export const dynamic = 'force-dynamic';
const DECOS = ['neon', 'gold', 'rainbow', 'sunset', 'frost'];
const HEX = /^#[0-9a-fA-F]{6}$/;

// Update the profile. Nitro perks are checked here, not just hidden in the page:
// Nitro Basic: animated avatar, avatar decoration. Nitro: also banner and profile colors.
export async function PATCH(req) {
  const user = await getUser(req);
  if (!user) return fail(401, 'Not logged in.');
  let b = {};
  try { b = await req.json(); } catch {}
  const db = admin();
  const nit = await getNitro(db, user.id);

  const u = { id: user.id, updated_at: new Date().toISOString() };
  if (b.display_name !== undefined) {
    const n = String(b.display_name || '').trim();
    if (n && (n.length < 2 || n.length > 32)) return fail(400, 'Name must be 2-32 characters.');
    u.display_name = n || null;
  }
  if (b.company !== undefined) {
    const c = String(b.company || '').trim();
    if (c.length > 80) return fail(400, 'Company is too long (80 max).');
    u.company = c || null;
  }
  if (b.bio !== undefined) {
    const x = String(b.bio || '').trim();
    if (x.length > 300) return fail(400, 'About you is too long (300 max).');
    u.bio = x || null;
  }
  if (b.avatar_url !== undefined) {
    const v = cleanUrl(b.avatar_url);
    if (v === undefined) return fail(400, 'Image links must be https URLs.');
    if (v && isGifUrl(v) && nit.rank < 1) return fail(403, 'Animated avatars need Nitro.');
    u.avatar_url = v;
  }
  if (b.banner_url !== undefined) {
    const v = cleanUrl(b.banner_url);
    if (v === undefined) return fail(400, 'Image links must be https URLs.');
    if (v && nit.rank < 2) return fail(403, 'A profile banner needs Nitro.');
    u.banner_url = v;
  }
  for (const k of ['accent1', 'accent2']) {
    if (b[k] !== undefined) {
      const v = b[k] ? String(b[k]) : null;
      if (v && !HEX.test(v)) return fail(400, 'Pick a valid color.');
      if (v && nit.rank < 2) return fail(403, 'Profile colors need Nitro.');
      u[k] = v;
    }
  }
  if (b.avatar_deco !== undefined) {
    const v = b.avatar_deco ? String(b.avatar_deco) : null;
    if (v && !DECOS.includes(v)) return fail(400, 'Unknown decoration.');
    if (v && nit.rank < 1) return fail(403, 'Avatar decorations need Nitro.');
    u.avatar_deco = v;
  }

  const { error } = await db.from('profiles').upsert(u);
  if (error) return fail(500, 'Could not save profile.');

  const sync = {};
  if (u.display_name) sync.user_name = u.display_name;
  if (u.avatar_url !== undefined) sync.user_avatar = u.avatar_url;
  if (Object.keys(sync).length) await db.from('server_members').update(sync).eq('user_id', user.id);
  return NextResponse.json({ ok: true });
}
