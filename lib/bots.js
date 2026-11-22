import crypto from 'node:crypto';
import { admin } from '@/lib/supabase';
import { hashKey } from '@/lib/keys';

export const RESERVED = ['help', 'ping', 'ai', 'ask', 'chat', 'say', 'roll', 'serverinfo', 'join', 'leave', 'play', 'stop', 'nowplaying'];

// Token format: base64url(clientId).secret  (client id is public, the secret is not)
export function newBotToken(clientId) {
  const secret = crypto.randomBytes(32).toString('base64url');
  const token = Buffer.from(clientId).toString('base64url') + '.' + secret;
  return { token, prefix: token.slice(0, 10) + '…' };
}

// Authenticates a request with "Authorization: Bot <token>".
export async function botAuth(req) {
  const h = req.headers.get('authorization') || '';
  const token = h.startsWith('Bot ') ? h.slice(4).trim() : '';
  if (!token || token.length > 200 || !token.includes('.')) return null;
  const db = admin();
  const { data } = await db
    .from('bots')
    .select('id,owner_id,name,avatar_url,prefix,hosting')
    .eq('token_hash', hashKey(token))
    .maybeSingle();
  if (!data) return null;
  await db.from('bots').update({ last_seen_at: new Date().toISOString() }).eq('id', data.id);
  return { db, bot: data };
}
