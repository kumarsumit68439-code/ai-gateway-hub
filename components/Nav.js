'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { sb } from '@/lib/supabase-browser';

const links = [
  ['/dashboard', 'API Keys'],
  ['/models', 'Models'],
  ['/docs', 'API Docs'],
];

export default function Nav() {
  const path = usePathname();
  if (path === '/login') return null;

  async function out() {
    await sb().auth.signOut();
    window.location.href = '/login';
  }

  return (
    <nav className="nav">
      <Link href="/dashboard" className="brand"><span className="dot" />AI Gateway</Link>
      <div className="links">
        {links.map(([href, label]) => (
          <Link key={href} href={href} className={path === href ? 'active' : ''}>{label}</Link>
        ))}
      </div>
      <button className="ghost small" onClick={out}>Log out</button>
    </nav>
  );
}
