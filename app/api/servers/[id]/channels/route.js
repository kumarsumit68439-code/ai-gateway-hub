import { NextResponse } from 'next/server';
import { admin } from '@/lib/supabase';
import { getUser } from '@/lib/auth';
import { canManage, fail, isUuid } from '@/lib/discord';

export const dynamic = 'force-dynamic';

// Create a text or voice channel (owner or manager), optionally inside a category.
export async function POST(req, { params }) {
  const user = await getUser(req);
  if (!user) return fail(401, 'Not logged in.');
  if (!isUuid(params.id)) return fail(400, 'Bad id.');
  const db = admin();
  const perm = await canManage(db, params.id, user.id);
  if (!perm.exists) return fail(404, 'Server not found.');
  if (!perm.ok) return fail(403, 'You do not have permission to create channels.');

  let b = {};
  try { b = await req.json(); } catch {}
  const type = b.type === 'voice' ? 'voice' : 'text';
  const name = String(b.name || '').trim().toLowerCase().replace(/\s+/g, '-');
  if (!/^[a-z0-9-]{1,32}$/.test(name)) return fail(400, 'Channel name: letters, numbers and dashes, up to 32 characters.');

  let category_id = null;
  if (b.category_id) {
    if (!isUuid(b.category_id)) return fail(400, 'Invalid category.');
    const { data: cat } = await db.from('channel_categories').select('id').eq('id', b.category_id).eq('server_id', params.id).maybeSingle();
    if (!cat) return fail(400, 'Category not found.');
    category_id = cat.id;
  }

  const { count } = await db.from('channels').select('id', { count: 'exact', head: true }).eq('server_id', params.id);
  if ((count || 0) >= 50) return fail(400, 'A server can have up to 50 channels.');

  const { data, error } = await db.from('channels').insert({ server_id: params.id, name, type, category_id, position: count || 0 }).select('id').single();
  if (error) return fail(500, 'Could not create channel.');
  return NextResponse.json({ id: data.id });
}
