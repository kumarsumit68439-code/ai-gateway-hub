import { NextResponse } from 'next/server';

// Payments were removed: Nitro is free (watch ads, then claim).
export const dynamic = 'force-dynamic';
export async function POST() {
  return NextResponse.json({ error: 'Not available.' }, { status: 410 });
}
