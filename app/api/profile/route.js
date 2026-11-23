import { NextResponse } from 'next/server';
import { admin } from '@/lib/supabase';
import { getUser } from '@/lib/auth';
import { cleanUrl, fail } from '@/lib/discord';

export const dynamic = 'force-dynamic';

// Update the profile and keep the name and avatar in sync across all servers.
export async function PATCH(req) {
  const user = await getUser(req);
  if (!user) return fail(401, 'Not logged in.');
  let b = {};
  try { b = await req.json(); } catch {}

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
  for (const k of ['avatar_url', 'banner_url']) {
    if (b[k] !== undefined) {
      const v = cleanUrl(b[k]);
      if (v === undefined) return fail(400, 'Image links must be https URLs.');
      u[k] = v;
    }
  }

  const db = admin();
  const { error } = await db.from('profiles').upsert(u);
  if (error) return fail(500, 'Could not save profile.');

  const sync = {};
  if (u.display_name) sync.user_name = u.display_name;
  if (u.avatar_url !== undefined) sync.user_avatar = u.avatar_url;
  if (Object.keys(sync).length) await db.from('server_members').update(sync).eq('user_id', user.id);
  return NextResponse.json({ ok: true });
}
