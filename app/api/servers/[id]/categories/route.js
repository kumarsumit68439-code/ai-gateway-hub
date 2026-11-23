import { NextResponse } from 'next/server';
import { admin } from '@/lib/supabase';
import { getUser } from '@/lib/auth';
import { canManage, fail, isUuid } from '@/lib/discord';

export const dynamic = 'force-dynamic';

async function gate(req, sid) {
  const user = await getUser(req);
  if (!user) return { res: fail(401, 'Not logged in.') };
  if (!isUuid(sid)) return { res: fail(400, 'Bad id.') };
  const db = admin();
  const perm = await canManage(db, sid, user.id);
  if (!perm.exists) return { res: fail(404, 'Server not found.') };
  if (!perm.ok) return { res: fail(403, 'You do not have permission to do that.') };
  return { db, user, perm };
}

// Create a category.
export async function POST(req, { params }) {
  const g = await gate(req, params.id);
  if (g.res) return g.res;
  let b = {};
  try { b = await req.json(); } catch {}
  const name = String(b.name || '').trim();
  if (name.length < 1 || name.length > 32) return fail(400, 'Category name must be 1-32 characters.');
  const { count } = await g.db.from('channel_categories').select('id', { count: 'exact', head: true }).eq('server_id', params.id);
  if ((count || 0) >= 15) return fail(400, 'A server can have up to 15 categories.');
  const { data, error } = await g.db.from('channel_categories').insert({ server_id: params.id, name, position: count || 0 }).select('id').single();
  if (error) return fail(500, 'Could not create category.');
  return NextResponse.json({ id: data.id });
}

// Delete a category (its channels stay, uncategorized).
export async function DELETE(req, { params }) {
  const g = await gate(req, params.id);
  if (g.res) return g.res;
  const cid = new URL(req.url).searchParams.get('categoryId');
  if (!isUuid(cid)) return fail(400, 'Invalid category.');
  await g.db.from('channel_categories').delete().eq('id', cid).eq('server_id', params.id);
  return NextResponse.json({ ok: true });
}
