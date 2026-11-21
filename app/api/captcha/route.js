import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// The Turnstile site key is public by design. Served at runtime so no rebuild is needed.
export async function GET() {
  return NextResponse.json({ siteKey: process.env.TURNSTILE_SITE_KEY || null });
}
