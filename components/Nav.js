'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { sb } from '@/lib/supabase-browser';
import './sidebar.css';

const P = {
  dash: <><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></>,
  book: <><path d="M5 4h12a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2z" /><path d="M9 8h6M9 12h6" /></>,
  db: <><ellipse cx="12" cy="6" rx="8" ry="3" /><path d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6" /><path d="M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" /></>,
  cube: <><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z" /><path d="M12 12l8-4.5M12 12L4 7.5M12 12v9" /></>,
  key: <><circle cx="8" cy="15" r="4" /><path d="M11 12l9-9M16 7l3 3M14 9l2 2" /></>,
  lock: <><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>,
  play: <><rect x="3" y="4" width="18" height="16" rx="3" /><path d="M10 9l5 3-5 3z" /></>,
  term: <><rect x="3" y="4" width="18" height="16" rx="3" /><path d="M7 10l3 2-3 2M12 15h5" /></>,
  shield: <><path d="M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6z" /><path d="M8.5 12l2.5 2.5 4.5-5" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" /></>,
  gear: <><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1" /></>,
  grid: <path d="M4 6h16M4 12h16M4 18h16" />,
  bot: <><rect x="5" y="8" width="14" height="11" rx="3" /><path d="M12 8V4M9 13h.01M15 13h.01M9 17h6" /></>,
  server: <><rect x="3" y="4" width="18" height="7" rx="2" /><rect x="3" y="13" width="18" height="7" rx="2" /><path d="M7 7.5h.01M7 16.5h.01" /></>,
  chat: <path d="M4 5h16v11H9l-5 4z" />,
};

const GROUPS = [
  { title: 'Explore', items: [['/dashboard', 'Dashboard', 'dash'], ['/docs', 'AI API Docs', 'book'], ['/docs/backend', 'Backend Docs', 'db'], ['/models', 'Models', 'cube']] },
  { title: 'Community', items: [['/servers', 'Servers', 'server'], ['/dm', 'Messages', 'chat'], ['/bots', 'Bots', 'bot'], ['/docs/bots', 'Bot Hosting Guide', 'book']] },
  { title: 'Keys and playground', items: [['/gateway-keys', 'AI Gateway keys', 'key'], ['/backend-keys', 'Backend keys', 'lock'], ['/playground/ai', 'AI Playground', 'play'], ['/playground/backend', 'Backend Playground', 'term']] },
  { title: 'My account', items: [['/account', 'Verification', 'shield'], ['/profile', 'Profile', 'user'], ['/settings', 'Settings', 'gear']] },
];

const top = [['/dashboard', 'Dashboard'], ['/servers', 'Servers'], ['/bots', 'Bots'], ['/docs', 'API Docs']];

function Ico({ name }) {
  return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{P[name]}</svg>;
}

export default function Nav() {
  const path = usePathname();
  const isLogin = path === '/login';
  // Server and message screens are full-screen Discord-style apps with their own rail.
  const shell = path.startsWith('/servers/') || path === '/dm' || path.startsWith('/dm/');
  const hidden = isLogin || shell;
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState('');

  useEffect(() => {
    try { setOpen(localStorage.getItem('sb-open') === '1' && window.innerWidth > 960); } catch {}
    setReady(true);
    sb().auth.getSession().then(({ data }) => setEmail(data.session?.user?.email || ''));
  }, []);

  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem('sb-open', open ? '1' : '0'); } catch {}
  }, [open, ready]);

  useEffect(() => {
    document.body.classList.toggle('sb-open', open && !hidden);
    document.body.classList.toggle('app-shell', shell);
    return () => { document.body.classList.remove('sb-open'); document.body.classList.remove('app-shell'); };
  }, [open, hidden, shell]);

  // Online heartbeat: members see you as online while the app is open.
  useEffect(() => {
    if (isLogin) return;
    const ping = async () => {
      if (document.hidden) return;
      try {
        const s = (await sb().auth.getSession()).data.session;
        if (s) await fetch('/api/presence', { method: 'POST', headers: { Authorization: 'Bearer ' + s.access_token } });
      } catch {}
    };
    ping();
    const t = setInterval(ping, 30000);
    document.addEventListener('visibilitychange', ping);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', ping); };
  }, [isLogin]);

  useEffect(() => { if (window.innerWidth <= 960) setOpen(false); }, [path]);

  useEffect(() => {
    const k = (e) => { if (e.key === 'Escape' && window.innerWidth <= 960) setOpen(false); };
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, []);

  if (hidden) return null;

  async function out() {
    await sb().auth.signOut();
    window.location.href = '/login';
  }

  return (
    <>
      <nav className="nav">
        <button className="ghost small menubtn" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="sidebar">
          {'\u2630'} Menu
        </button>
        <Link href="/dashboard" className="brand"><span className="dot" />AI Gateway</Link>
        <div className="links">
          {top.map(([href, label]) => (
            <Link key={href} href={href} className={path === href || (href !== '/dashboard' && path.startsWith(href + '/')) ? 'active' : ''}>{label}</Link>
          ))}
        </div>
      </nav>

      <div className={'sb-backdrop' + (open ? ' show' : '')} onClick={() => setOpen(false)} />

      <aside id="sidebar" className={'sidebar' + (open ? ' open' : '')} aria-hidden={!open}>
        <div className="sb-head">
          <b>Menu</b>
          <button className="ghost sb-hide" onClick={() => setOpen(false)} aria-label="Hide menu">{'\u2039'}</button>
        </div>
        <div className="sb-scroll">
          {GROUPS.map((g) => (
            <div className="sb-group" key={g.title}>
              <small>{g.title}</small>
              {g.items.map(([href, label, ic]) => (
                <Link key={href} href={href} className={'sb-link' + (path === href ? ' active' : '')}>
                  <Ico name={ic} />{label}
                </Link>
              ))}
            </div>
          ))}
          <div className="sb-group">
            <Link href="/menu" className={'sb-link' + (path === '/menu' ? ' active' : '')}><Ico name="grid" />All pages</Link>
          </div>
        </div>
        <div className="sb-foot">
          {email && <div className="who">{email}</div>}
          <button className="ghost small" onClick={out}>Log out</button>
        </div>
      </aside>

      {!open && <button className="sb-handle" onClick={() => setOpen(true)} aria-label="Show menu">{'\u203a'}</button>}
    </>
  );
}
