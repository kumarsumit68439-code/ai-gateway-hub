import { sb } from '@/lib/supabase-browser';

// Authenticated fetch to our own API. Returns { ok, status, j }.
export async function api(method, url, body) {
  const s = (await sb().auth.getSession()).data.session;
  const r = await fetch(url, {
    method,
    headers: { Authorization: 'Bearer ' + s.access_token, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  let j = {};
  try { j = await r.json(); } catch {}
  return { ok: r.ok, status: r.status, j };
}

export const seen = (iso) => !!iso && Date.now() - new Date(iso).getTime() < 75000;
