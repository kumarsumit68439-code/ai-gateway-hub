// Cloudflare Turnstile verification (server side).
export async function verifyCaptcha(token, req) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return { ok: false, status: 503, error: 'Verification is unavailable right now. Please try again later.' };
  if (!token || typeof token !== 'string' || token.length > 4096)
    return { ok: false, status: 400, error: 'Verification required.' };

  const body = new URLSearchParams({ secret, response: token });
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim();
  if (ip) body.set('remoteip', ip);

  try {
    const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body,
      signal: AbortSignal.timeout(8000),
    });
    const j = await r.json();
    return j.success ? { ok: true } : { ok: false, status: 400, error: 'Verification failed. Please try again.' };
  } catch {
    return { ok: false, status: 502, error: 'Verification failed. Please try again.' };
  }
}
