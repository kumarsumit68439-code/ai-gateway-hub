import crypto from 'node:crypto';
import { admin } from '@/lib/supabase';

// Our own human check (no third-party service): a 3x3 picture grid, "Select all stars".
// Stateless generation (seeded from a signed id), single-use tokens, attempt limits per network.

const secret = () => process.env.CAPTCHA_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
export const captchaReady = () => !!secret();
const hmac = (s, enc = 'base64url') => crypto.createHmac('sha256', secret()).update(s).digest(enc);
const same = (a, b) => {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};
const ipHash = (req) =>
  crypto.createHash('sha256').update(((req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown') + ':' + secret()).digest('hex').slice(0, 32);

const SHAPES = ['circle', 'triangle', 'star', 'hexagon', 'cross'];
const LABEL = { circle: 'circles', triangle: 'triangles', star: 'stars', hexagon: 'hexagons', cross: 'crosses' };
const COLORS = ['#ef4444', '#f59e0b', '#22c55e', '#06b6d4', '#6366f1', '#ec4899', '#eab308', '#14b8a6'];
const UNAVAILABLE = 'Verification is unavailable right now. Please try again later.';

function rng(seedHex) {
  let a = parseInt(seedHex.slice(0, 8), 16) >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const poly = (pts) => 'M' + pts.map(([x, y]) => x.toFixed(1) + ' ' + y.toFixed(1)).join('L') + 'Z';

function shapePath(shape, cx, cy, r, rot) {
  const pt = (rad, ang) => [cx + rad * Math.cos(ang), cy + rad * Math.sin(ang)];
  if (shape === 'circle') return `M${(cx - r).toFixed(1)} ${cy.toFixed(1)}a${r.toFixed(1)} ${r.toFixed(1)} 0 1 0 ${(2 * r).toFixed(1)} 0a${r.toFixed(1)} ${r.toFixed(1)} 0 1 0 ${(-2 * r).toFixed(1)} 0Z`;
  if (shape === 'triangle') return poly([0, 1, 2].map((i) => pt(r * 1.15, rot + i * 2.0944)));
  if (shape === 'hexagon') return poly([0, 1, 2, 3, 4, 5].map((i) => pt(r, rot + i * 1.0472)));
  if (shape === 'star') return poly(Array.from({ length: 10 }, (_, i) => pt(i % 2 ? r * 0.45 : r * 1.12, rot + i * 0.6283)));
  const a = r * 0.35, b = r;
  const base = [[-a, -b], [a, -b], [a, -a], [b, -a], [b, a], [a, a], [a, b], [-a, b], [-a, a], [-b, a], [-b, -a], [-a, -a]];
  return poly(base.map(([x, y]) => [cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)]));
}

function tile(shape, rand) {
  const bg = `hsl(${Math.floor(rand() * 360)} 25% ${18 + Math.floor(rand() * 10)}%)`;
  let g = '';
  for (let i = 0; i < 6; i++) g += `<path d='M${Math.floor(rand() * 100)} ${Math.floor(rand() * 100)}L${Math.floor(rand() * 100)} ${Math.floor(rand() * 100)}' stroke='hsl(${Math.floor(rand() * 360)} 40% 60%)' stroke-opacity='.35' stroke-width='${(1 + rand() * 2).toFixed(1)}' fill='none'/>`;
  for (let i = 0; i < 10; i++) g += `<path d='M${Math.floor(rand() * 100)} ${Math.floor(rand() * 100)}h2' stroke='#fff' stroke-opacity='.25' stroke-width='3' stroke-linecap='round'/>`;
  const color = COLORS[Math.floor(rand() * COLORS.length)];
  const d = shapePath(shape, 50 + (rand() - 0.5) * 14, 50 + (rand() - 0.5) * 14, 21 + rand() * 10, rand() * 6.2832);
  g += `<path d='${d}' fill='${color}' stroke='#fff' stroke-opacity='.55' stroke-width='2'/>`;
  g += `<path d='M${Math.floor(rand() * 100)} ${Math.floor(rand() * 100)}L${Math.floor(rand() * 100)} ${Math.floor(rand() * 100)}' stroke='${bg}' stroke-width='1.5' stroke-opacity='.8'/>`;
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='${bg}'/>${g}</svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

// Same id always gives the same challenge, so the server never stores the answer.
function build(jti) {
  const rand = rng(hmac('seed:' + jti, 'hex'));
  const target = SHAPES[Math.floor(rand() * SHAPES.length)];
  const k = 2 + Math.floor(rand() * 3);
  const idx = [0, 1, 2, 3, 4, 5, 6, 7, 8];
  for (let i = 8; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
  const answer = idx.slice(0, k).sort((a, b) => a - b);
  const others = SHAPES.filter((s) => s !== target);
  const tiles = Array.from({ length: 9 }, (_, i) => tile(answer.includes(i) ? target : others[Math.floor(rand() * others.length)], rand));
  return { prompt: `Select all ${LABEL[target]}`, tiles, answer };
}

export function newChallenge() {
  const jti = crypto.randomBytes(10).toString('hex');
  const iat = Date.now();
  const c = build(jti);
  return { token: `${jti}.${iat}.${hmac(jti + '.' + iat)}`, prompt: c.prompt, tiles: c.tiles };
}

// Checks the picked tiles. On success returns a short-lived pass token.
export async function solveChallenge(req, token, picked) {
  if (!captchaReady()) return { ok: false, status: 503, error: UNAVAILABLE };
  const db = admin();
  const ih = ipHash(req);
  const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { count } = await db.from('captcha_log').select('id', { count: 'exact', head: true }).eq('ip_hash', ih).eq('ok', false).gte('created_at', since);
  if ((count || 0) >= 8) return { ok: false, status: 429, error: 'Too many wrong attempts. Please wait a few minutes.' };

  const parts = String(token || '').split('.');
  const bad = { ok: false, status: 400, error: 'Verification failed. Please try again.' };
  if (parts.length !== 3) return bad;
  const [jti, iat, sig] = parts;
  if (!/^[a-f0-9]{20}$/.test(jti) || !/^\d{10,15}$/.test(iat) || !same(sig, hmac(jti + '.' + iat))) return bad;
  const age = Date.now() - Number(iat);
  if (age > 150000) return { ok: false, status: 400, error: 'This check expired. Try again.' };

  const used = await db.from('captcha_used').insert({ jti });
  if (used.error) return { ok: false, status: 400, error: 'This check was already used. Try again.' };

  const want = build(jti).answer;
  const got = [...new Set((Array.isArray(picked) ? picked : []).map(Number))].filter((n) => Number.isInteger(n) && n >= 0 && n < 9).sort((a, b) => a - b);
  const good = age >= 1500 && want.length === got.length && want.every((v, i) => v === got[i]);
  await db.from('captcha_log').insert({ ip_hash: ih, ok: good });
  if (Math.random() < 0.05) {
    const old = new Date(Date.now() - 86400000).toISOString();
    await db.from('captcha_used').delete().lt('used_at', old);
    await db.from('captcha_log').delete().lt('created_at', old);
  }
  if (!good) return { ok: false, status: 400, error: 'That was not right. Try a new one.' };

  const pid = crypto.randomBytes(10).toString('hex');
  const exp = Date.now() + 120000;
  return { ok: true, pass: `p.${pid}.${exp}.${hmac('p.' + pid + '.' + exp)}` };
}

// Consumes a pass token (single use). Used by every route that needs a human check.
export async function verifyCaptcha(token) {
  if (!captchaReady()) return { ok: false, status: 503, error: UNAVAILABLE };
  const parts = String(token || '').split('.');
  if (parts.length !== 4 || parts[0] !== 'p') return { ok: false, status: 400, error: 'Verification required.' };
  const [, pid, exp, sig] = parts;
  if (!/^[a-f0-9]{20}$/.test(pid) || !/^\d{10,15}$/.test(exp) || !same(sig, hmac('p.' + pid + '.' + exp))) return { ok: false, status: 400, error: 'Verification failed. Please try again.' };
  if (Date.now() > Number(exp)) return { ok: false, status: 400, error: 'Verification expired. Please try again.' };
  const used = await admin().from('captcha_used').insert({ jti: 'p' + pid });
  if (used.error) return { ok: false, status: 400, error: 'Verification was already used. Please try again.' };
  return { ok: true };
}
