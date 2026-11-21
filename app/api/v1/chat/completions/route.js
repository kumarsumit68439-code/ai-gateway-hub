import { NextResponse } from 'next/server';
import { admin } from '@/lib/supabase';
import { hashKey } from '@/lib/keys';
import { PROVIDERS, providerKey, getModels } from '@/lib/providers';

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const ALLOWED = ['messages', 'temperature', 'top_p', 'max_tokens', 'stream', 'stop', 'presence_penalty', 'frequency_penalty', 'seed', 'response_format', 'tools', 'tool_choice'];
const PER_MINUTE = 30;
const PER_DAY = 1000;

const err = (status, message, type = 'invalid_request_error') =>
  NextResponse.json({ error: { message, type } }, { status });

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}

async function log(db, key, provider, model, status, started, usage = {}) {
  try {
    await Promise.all([
      db.from('usage_logs').insert({
        api_key_id: key.id,
        user_id: key.user_id,
        provider,
        model,
        status,
        latency_ms: Date.now() - started,
        prompt_tokens: usage.prompt_tokens ?? null,
        completion_tokens: usage.completion_tokens ?? null,
      }),
      db.rpc('bump_key_usage', { p_key_id: key.id }),
    ]);
  } catch {}
}

export async function POST(req) {
  const started = Date.now();
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!token.startsWith('sk-gw-'))
    return err(401, 'Missing or invalid API key. Send header: Authorization: Bearer sk-gw-...', 'authentication_error');

  const db = admin();
  const { data: key } = await db
    .from('api_keys')
    .select('id,user_id,allowed_ips,allowed_origins')
    .eq('key_hash', hashKey(token))
    .is('revoked_at', null)
    .maybeSingle();
  if (!key) return err(401, 'Invalid or revoked API key.', 'authentication_error');

  // Backend-only by default: a browser request carries an Origin header.
  const origin = req.headers.get('origin');
  if (origin && !(key.allowed_origins || []).includes(origin))
    return err(403, 'This key is backend-only. Call the API from your server, or add this origin to the key in the dashboard.', 'permission_error');

  // Optional IP allowlist for server-to-server use.
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim();
  if ((key.allowed_ips || []).length && !key.allowed_ips.includes(ip))
    return err(403, `IP ${ip || 'unknown'} is not allowed for this key.`, 'permission_error');

  const minAgo = new Date(Date.now() - 60 * 1000).toISOString();
  const dayAgo = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const [m, d] = await Promise.all([
    db.from('usage_logs').select('id', { count: 'exact', head: true }).eq('api_key_id', key.id).gte('created_at', minAgo),
    db.from('usage_logs').select('id', { count: 'exact', head: true }).eq('api_key_id', key.id).gte('created_at', dayAgo),
  ]);
  if ((m.count || 0) >= PER_MINUTE) return err(429, `Rate limit: ${PER_MINUTE} requests/minute per key.`, 'rate_limit_error');
  if ((d.count || 0) >= PER_DAY) return err(429, `Daily limit: ${PER_DAY} requests/day per key.`, 'rate_limit_error');

  if (Number(req.headers.get('content-length') || 0) > 1_000_000) return err(413, 'Request body too large (1 MB max).');
  let body;
  try { body = await req.json(); } catch { return err(400, 'Body must be valid JSON.'); }
  if (!body || typeof body.model !== 'string' || !Array.isArray(body.messages) || !body.messages.length)
    return err(400, '"model" (string) and "messages" (non-empty array) are required.');

  const i = body.model.indexOf('/');
  const provider = body.model.slice(0, i);
  const raw = body.model.slice(i + 1);
  if (i < 1 || !PROVIDERS[provider])
    return err(400, 'Model must look like "provider/model", e.g. "groq/llama-3.3-70b-versatile". See GET /api/v1/models.');

  const info = await getModels(provider);
  if (!info.configured) return err(503, `${PROVIDERS[provider].label} is not configured on this server.`, 'server_error');
  if (!info.models.some((x) => x.id === body.model))
    return err(404, `Model "${body.model}" is not in the live free model list. See GET /api/v1/models.`);

  const payload = {};
  for (const k of ALLOWED) if (body[k] !== undefined) payload[k] = body[k];
  payload.model = raw;
  if (!(payload.max_tokens <= 4096)) payload.max_tokens = 4096;
  if (provider === 'openai' && /^o\d/.test(raw)) {
    payload.max_completion_tokens = payload.max_tokens;
    delete payload.max_tokens;
  }

  const headers = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + providerKey(provider) };
  if (provider === 'openrouter') {
    headers['HTTP-Referer'] = process.env.SITE_URL || 'https://vercel.com';
    headers['X-Title'] = 'AI Gateway Hub';
  }

  let up;
  try {
    up = await fetch(PROVIDERS[provider].base + '/chat/completions', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(55000),
    });
  } catch {
    await log(db, key, provider, raw, 504, started);
    return err(502, 'Upstream provider unreachable or timed out.', 'server_error');
  }

  if (payload.stream === true && up.ok && up.body) {
    await log(db, key, provider, raw, up.status, started);
    return new Response(up.body, {
      status: 200,
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform' },
    });
  }

  const text = await up.text();
  let usage = {};
  try { usage = JSON.parse(text).usage || {}; } catch {}
  await log(db, key, provider, raw, up.status, started, usage);
  return new Response(text, {
    status: up.status,
    headers: { 'Content-Type': up.headers.get('content-type') || 'application/json' },
  });
}
