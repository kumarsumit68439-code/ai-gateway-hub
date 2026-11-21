'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { sb } from '@/lib/supabase-browser';

const main = [
  ['/dashboard', 'Dashboard'],
  ['/models', 'Models'],
  ['/docs', 'API Docs'],
];

const explore = [
  ['/dashboard', 'Dashboard'],
  ['/docs', 'AI API Docs'],
  ['/docs/backend', 'Backend Docs'],
  ['/models', 'Live Models'],
];
const keysMenu = [
  ['/gateway-keys', 'AI Gateway keys'],
  ['/backend-keys', 'Backend keys'],
];
const accountMenu = [
  ['/account', 'Account verification'],
  ['/profile', 'Profile'],
  ['/settings', 'Settings'],
];

export default function Nav() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => { setOpen(false); }, [path]);
  if (path === '/login') return null;

  async function out() {
    await sb().auth.signOut();
    window.location.href = '/login';
  }

  return (
    <nav className="nav">
      <Link href="/dashboard" className="brand"><span className="dot" />AI Gateway</Link>
      <div className="links">
        {main.map(([href, label]) => (
          <Link key={href} href={href} className={path === href ? 'active' : ''}>{label}</Link>
        ))}
      </div>
      <div style={{ position: 'relative' }}>
        <button className="ghost small menubtn" onClick={() => setOpen(!open)} aria-expanded={open}>Menu {open ? '▴' : '▾'}</button>
        {open && (
          <div className="panel">
            <small>Explore</small>
            {explore.map(([href, label]) => <Link key={href} href={href}>{label}</Link>)}
            <hr />
            <small>API keys</small>
            {keysMenu.map(([href, label]) => <Link key={href} href={href}>{label}</Link>)}
            <hr />
            <small>My account</small>
            {accountMenu.map(([href, label]) => <Link key={href} href={href}>{label}</Link>)}
            <hr />
            <Link href="/menu">All pages</Link>
            <button className="item" onClick={out}>Log out</button>
          </div>
        )}
      </div>
    </nav>
  );
}
