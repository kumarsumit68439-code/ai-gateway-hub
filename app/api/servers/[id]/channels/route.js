import { NextResponse } from 'next/server';
import { admin } from '@/lib/supabase';
import { getUser } from '@/lib/auth';
import { fail, isUuid } from '@/lib/discord';

export const dynamic = 'force-dynamic';

// Owner: create a text or voice channel.
export async function POST(req, { params }) {
  const user = await getUser(req);
  if (!user) return fail(401, 'Not logged in.');
  if (!isUuid(params.id)) return fail(400, 'Bad id.');
  const db = admin();
  const { data: server } = await db.from('servers').select('id,owner_id').eq('id', params.id).maybeSingle();
  if (!server) return fail(404, 'Server not found.');
  if (server.owner_id !== user.id) return fail(403, 'Only the server owner can create channels.');

  let b = {};
  try { b = await req.json(); } catch {}
  const type = b.type === 'voice' ? 'voice' : 'text';
  const name = String(b.name || '').trim().toLowerCase().replace(/\s+/g, '-');
  if (!/^[a-z0-9-]{1,32}$/.test(name)) return fail(400, 'Channel name: letters, numbers and dashes, up to 32 characters.');

  const { count } = await db.from('channels').select('id', { count: 'exact', head: true }).eq('server_id', server.id);
  if ((count || 0) >= 30) return fail(400, 'A server can have up to 30 channels.');

  const { data, error } = await db.from('channels').insert({ server_id: server.id, name, type, position: count || 0 }).select('id').single();
  if (error) return fail(500, 'Could not create channel.');
  return NextResponse.json({ id: data.id });
}
