import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth';
import { solveChallenge } from '@/lib/captcha';
import { fail } from '@/lib/discord';

export const dynamic = 'force-dynamic';

// Check the picked tiles. Returns a one-time pass token that creation routes accept.
export async function POST(req) {
  const user = await getUser(req);
  if (!user) return fail(401, 'Not logged in.');
  let b = {};
  try { b = await req.json(); } catch {}
  const r = await solveChallenge(req, b.token, b.picked);
  if (!r.ok) return fail(r.status, r.error);
  return NextResponse.json({ pass: r.pass });
}
