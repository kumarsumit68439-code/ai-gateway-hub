import { NextResponse } from 'next/server';
import { captchaReady } from '@/lib/captcha';

export const dynamic = 'force-dynamic';

// "own" means the built-in verification is available.
export async function GET() {
  return NextResponse.json({ siteKey: captchaReady() ? 'own' : null });
}
