import { NextResponse } from 'next/server';
import { admin } from '@/lib/supabase';
import { getUser } from '@/lib/auth';
import { fail, isUuid, isMember } from '@/lib/discord';

export const dynamic = 'force-dynamic';

// Toggle "Interested" on an event.
export async function POST(req, { params }) {
  const user = await getUser(req);
  if (!user) return fail(401, 'Not logged in.');
  if (!isUuid(params.id) || !isUuid(params.eid)) return fail(400, 'Bad id.');
  const db = admin();
  if (!(await isMember(db, params.id, user.id))) return fail(403, 'You are not in this server.');
  const { data: ev } = await db.from('server_events').select('id').eq('id', params.eid).eq('server_id', params.id).maybeSingle();
  if (!ev) return fail(404, 'Event not found.');

  const { data: have } = await db.from('event_interest').select('user_id').eq('event_id', ev.id).eq('user_id', user.id).maybeSingle();
  if (have) {
    await db.from('event_interest').delete().eq('event_id', ev.id).eq('user_id', user.id);
    return NextResponse.json({ interested: false });
  }
  await db.from('event_interest').insert({ event_id: ev.id, server_id: params.id, user_id: user.id });
  return NextResponse.json({ interested: true });
}
