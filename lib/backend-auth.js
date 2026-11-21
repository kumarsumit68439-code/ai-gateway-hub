import { NextResponse } from 'next/server';
import { admin } from '@/lib/supabase';
import { hashKey } from '@/lib/keys';

export const PER_MINUTE = 60;
export const PER_DAY = 5000;
export const MAX_BODY = 65536;

export const jerr = (status, message, type = 'invalid_request_error') =>
  NextResponse.json({ error: { message, type } }, { status });

export const okCollection = (c) => /^[a-z0-9_-]{1,40}$/.test(c);

// Authenticates a backend key and applies all safety checks.
// Returns { db, key } on success or { res } with the error response.
export async function guard(req) {
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!token.startsWith('bk-live-'))
    return { res: jerr(401, 'Missing or invalid backend key. Send header: Authorization: Bearer bk-live-...', 'authentication_error') };

  const db = admin();
  const { data: key } = await db
    .from('backend_keys')
    .select('id,user_id,engine,allowed_ips')
    .eq('key_hash', hashKey(token))
    .is('revoked_at', null)
    .maybeSingle();
  if (!key) return { res: jerr(401, 'Invalid, revoked or regenerated (old) backend key.', 'authentication_error') };

  // Backend keys are server-only: any browser request carries an Origin header.
  if (req.headers.get('origin'))
    return { res: jerr(403, 'Backend keys can only be used from a server, never from a browser.', 'permission_error') };

  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim();
  if ((key.allowed_ips || []).length && !key.allowed_ips.includes(ip))
    return { res: jerr(403, `IP ${ip || 'unknown'} is not allowed for this key.`, 'permission_error') };

  const minAgo = new Date(Date.now() - 60 * 1000).toISOString();
  const dayAgo = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const q = (since) => db.from('backend_logs').select('id', { count: 'exact', head: true }).eq('key_id', key.id).gte('created_at', since);
  const [m, d] = await Promise.all([q(minAgo), q(dayAgo)]);
  if ((m.count || 0) >= PER_MINUTE) return { res: jerr(429, `Rate limit: ${PER_MINUTE} requests/minute per key.`, 'rate_limit_error') };
  if ((d.count || 0) >= PER_DAY) return { res: jerr(429, `Daily limit: ${PER_DAY} requests/day per key.`, 'rate_limit_error') };

  return { db, key };
}

async function logB(db, key, action, status) {
  try {
    await Promise.all([
      db.from('backend_logs').insert({ key_id: key.id, user_id: key.user_id, engine: key.engine, action, status }),
      db.rpc('bump_backend_key', { p_key_id: key.id }),
    ]);
  } catch {}
}

// Runs fn(key) behind guard(), logs the result and hides internal errors.
export async function handle(req, action, fn) {
  const g = await guard(req);
  if (g.res) return g.res;
  try {
    const out = await fn(g.key);
    await logB(g.db, g.key, action, out.status);
    return out;
  } catch {
    await logB(g.db, g.key, action, 502);
    return jerr(502, 'Storage error. Please try again.', 'server_error');
  }
}

function cleanKeys(v, depth = 0) {
  if (depth > 6) return false;
  if (Array.isArray(v)) return v.length <= 1000 && v.every((x) => cleanKeys(x, depth + 1));
  if (v && typeof v === 'object')
    return Object.keys(v).every((k) => k.length <= 100 && !k.includes('.') && !k.startsWith('$') && k !== '__proto__' && !k.includes('\0') && cleanKeys(v[k], depth + 1));
  return true;
}

// Reads the JSON body (the body itself is the document). Returns { data } or { res }.
export async function readDoc(req) {
  const raw = await req.text();
  if (raw.length > MAX_BODY) return { res: jerr(413, 'Document too large (64 KB max).') };
  let data;
  try { data = JSON.parse(raw); } catch { return { res: jerr(400, 'Body must be valid JSON.') }; }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return { res: jerr(400, 'Body must be a JSON object.') };
  if (!cleanKeys(data)) return { res: jerr(400, 'Field names cannot contain "." or start with "$", and nesting is limited to 6 levels.') };
  return { data };
}
