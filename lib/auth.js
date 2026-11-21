import { admin } from '@/lib/supabase';

// Verifies the Supabase access token sent by the dashboard.
export async function getUser(req) {
  const h = req.headers.get('authorization') || '';
  const token = h.startsWith('Bearer ') ? h.slice(7).trim() : '';
  if (!token) return null;
  const { data, error } = await admin().auth.getUser(token);
  return error || !data?.user ? null : data.user;
}
