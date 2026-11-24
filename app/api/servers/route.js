import { NextResponse } from 'next/server';
import { admin } from '@/lib/supabase';
import { getUser } from '@/lib/auth';
import { fail, seedRoles, userCard } from '@/lib/discord';

export const dynamic = 'force-dynamic';
const MAX_SERVERS = 10;

// Create a server with default roles, two categories, a text channel and a voice channel.
export async function POST(req) {
  const user = await getUser(req);
  if (!user) return fail(401, 'Not logged in.');
  if (!user.email_confirmed_at) return fail(403, 'Verify your email first.');

  let b = {};
  try { b = await req.json(); } catch {}
  const name = String(b.name || '').trim();
  if (name.length < 2 || name.length > 40) return fail(400, 'Server name must be 2-40 characters.');

  const db = admin();
  const { count } = await db.from('servers').select('id', { count: 'exact', head: true }).eq('owner_id', user.id);
  if ((count || 0) >= MAX_SERVERS) return fail(400, `You can own up to ${MAX_SERVERS} servers.`);

  const { data: server, error } = await db.from('servers').insert({ owner_id: user.id, name }).select('id').single();
  if (error) return fail(500, 'Could not create server.');

  const me = await userCard(db, user);
  await db.from('server_members').insert({ server_id: server.id, user_id: user.id, user_name: me.name, user_avatar: me.avatar, role: 'owner' });
  await seedRoles(db, server.id);

  const { data: cats } = await db.from('channel_categories').insert([
    { server_id: server.id, name: 'Text Channels', position: 0 },
    { server_id: server.id, name: 'Voice Channels', position: 1 },
  ]).select('id,name');
  const text = cats?.find((c) => c.name === 'Text Channels');
  const voice = cats?.find((c) => c.name === 'Voice Channels');
  await db.from('channels').insert([
    { server_id: server.id, name: 'general', type: 'text', position: 0, category_id: text?.id || null },
    { server_id: server.id, name: 'lounge', type: 'voice', position: 1, category_id: voice?.id || null },
  ]);
  return NextResponse.json({ id: server.id });
}
