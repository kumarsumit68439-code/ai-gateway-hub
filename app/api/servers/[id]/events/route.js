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
  if (!perm.ok) return { res: fail(403, 'You do not have permission to manage events.') };
  return { db, user };
}

// Create an event (owner or manager).
export async function POST(req, { params }) {
  const g = await gate(req, params.id);
  if (g.res) return g.res;
  let b = {};
  try { b = await req.json(); } catch {}
  const name = String(b.name || '').trim();
  const description = String(b.description || '').trim();
  const when = new Date(b.starts_at);
  if (name.length < 2 || name.length > 80) return fail(400, 'Event name must be 2-80 characters.');
  if (description.length > 500) return fail(400, 'Description is too long (500 max).');
  if (isNaN(when) || when.getTime() < Date.now() - 5 * 60000 || when.getTime() > Date.now() + 366 * 86400000) return fail(400, 'Pick a start time within the next year.');

  let channel_id = null;
  if (b.channel_id) {
    if (!isUuid(b.channel_id)) return fail(400, 'Invalid channel.');
    const { data: c } = await g.db.from('channels').select('id').eq('id', b.channel_id).eq('server_id', params.id).maybeSingle();
    if (!c) return fail(400, 'Channel not found.');
    channel_id = c.id;
  }
  const { count } = await g.db.from('server_events').select('id', { count: 'exact', head: true }).eq('server_id', params.id).gte('starts_at', new Date().toISOString());
  if ((count || 0) >= 25) return fail(400, 'A server can have up to 25 upcoming events.');

  const { error } = await g.db.from('server_events').insert({ server_id: params.id, name, description: description || null, channel_id, starts_at: when.toISOString(), created_by: g.user.id });
  if (error) return fail(500, 'Could not create the event.');
  return NextResponse.json({ ok: true });
}

// Delete an event.
export async function DELETE(req, { params }) {
  const g = await gate(req, params.id);
  if (g.res) return g.res;
  const eid = new URL(req.url).searchParams.get('eventId');
  if (!isUuid(eid)) return fail(400, 'Invalid event.');
  await g.db.from('server_events').delete().eq('id', eid).eq('server_id', params.id);
  return NextResponse.json({ ok: true });
}
