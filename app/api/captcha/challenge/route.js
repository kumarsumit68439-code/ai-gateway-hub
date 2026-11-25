import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth';
import { captchaReady, newChallenge } from '@/lib/captcha';
import { fail } from '@/lib/discord';

export const dynamic = 'force-dynamic';

// A fresh picture challenge for the logged-in user.
export async function GET(req) {
  const user = await getUser(req);
  if (!user) return fail(401, 'Not logged in.');
  if (!captchaReady()) return fail(503, 'Verification is unavailable right now. Please try again later.');
  return NextResponse.json(newChallenge(), { headers: { 'Cache-Control': 'no-store' } });
}
