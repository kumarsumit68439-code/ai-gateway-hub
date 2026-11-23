import { NextResponse } from 'next/server';
import { admin } from '@/lib/supabase';
import { getUser } from '@/lib/auth';
import { fail } from '@/lib/discord';

export const dynamic = 'force-dynamic';

// Your conversations, newest first.
export async function GET(req) {
  const user = await getUser(req);
  if (!user) return fail(401, 'Not logged in.');
  const db = admin();
  const { data: threads } = await db.from('dm_threads').select('id,user_low,user_high').or(`user_low.eq.${user.id},user_high.eq.${user.id}`).limit(60);
  if (!threads?.length) return NextResponse.json({ threads: [] });

  const otherId = (t) => (t.user_low === user.id ? t.user_high : t.user_low);
  const ids = threads.map(otherId);
  const [{ data: profs }, { data: mems }] = await Promise.all([
    db.from('profiles').select('id,display_name,avatar_url').in('id', ids),
    db.from('server_members').select('user_id,user_name,user_avatar').in('user_id', ids),
  ]);

  const out = await Promise.all(threads.map(async (t) => {
    const oid = otherId(t);
    const p = profs?.find((x) => x.id === oid);
    const m = mems?.find((x) => x.user_id === oid);
    const { data: last } = await db.from('dm_messages').select('content,created_at').eq('thread_id', t.id).order('id', { ascending: false }).limit(1);
    return {
      threadId: t.id,
      other: { id: oid, name: p?.display_name || m?.user_name || 'Member', avatar: p?.avatar_url || m?.user_avatar || null },
      last: last?.[0] || null,
    };
  }));
  out.sort((a, b) => new Date(b.last?.created_at || 0) - new Date(a.last?.created_at || 0));
  return NextResponse.json({ threads: out });
}
