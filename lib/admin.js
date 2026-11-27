// Site admins are listed in the ADMIN_EMAILS environment variable (comma separated).
export function isAdmin(user) {
  if (!user?.email || !user.email_confirmed_at) return false;
  const list = (process.env.ADMIN_EMAILS || '').toLowerCase().split(',').map((s) => s.trim()).filter(Boolean);
  return list.includes(user.email.toLowerCase());
}
