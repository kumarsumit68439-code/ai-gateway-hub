import { NextResponse } from 'next/server';
import { admin } from '@/lib/supabase';
import { getUser } from '@/lib/auth';
import { fail, isMember, isUuid } from '@/lib/discord';
import { BOOST_LEVELS, boostCount, getNitro, levelOf } from '@/lib/nitro';

export const dynamic = 'force-dynamic';

async function info(db, sid, uid) {
  const [count, nit, { data: mine }, { data: all }] = await Promise.all([
    boostCount(db, sid),
    getNitro(db, uid),
    db.from('server_boosts').select('id').eq('server_id', sid).eq('user_id', uid),
    db.from('server_boosts').select('id').eq('user_id', uid),
  ]);
  const level = levelOf(count);
  return { count, level, next: BOOST_LEVELS[level] || null, mine: (mine || []).length, free: nit.rank >= 2 ? Math.max(0, 2 - (all || []).length) : 0, hasNitro: nit.rank >= 2 };
}

async function gate(req, sid) {
  const user = await getUser(req);
  if (!user) return { res: fail(401, 'Not logged in.') };
  if (!isUuid(sid)) return { res: fail(400, 'Bad id.') };
  const db = admin();
  if (!(await isMember(db, sid, user.id))) return { res: fail(403, 'You are not in this server.') };
  return { db, user };
}

// Boost level, progress and your boosts for this server.
export async function GET(req, { params }) {
  const g = await gate(req, params.id);
  if (g.res) return g.res;
  return NextResponse.json(await info(g.db, params.id, g.user.id));
}

// Boost this server (needs Nitro, you have 2 boosts).
export async function POST(req, { params }) {
  const g = await gate(req, params.id);
  if (g.res) return g.res;
  const i = await info(g.db, params.id, g.user.id);
  if (!i.hasNitro) return fail(403, 'Boosting a server needs Nitro.');
  if (i.free < 1) return fail(400, 'You have used both of your boosts. Remove one first.');
  await g.db.from('server_boosts').insert({ server_id: params.id, user_id: g.user.id });
  return NextResponse.json(await info(g.db, params.id, g.user.id));
}

// Take back one of your boosts from this server.
export async function DELETE(req, { params }) {
  const g = await gate(req, params.id);
  if (g.res) return g.res;
  const { data } = await g.db.from('server_boosts').select('id').eq('server_id', params.id).eq('user_id', g.user.id).order('created_at').limit(1);
  if (data?.length) await g.db.from('server_boosts').delete().eq('id', data[0].id);
  return NextResponse.json(await info(g.db, params.id, g.user.id));
}
