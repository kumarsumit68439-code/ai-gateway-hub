'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { sb } from '@/lib/supabase-browser';

const fmt = (d) => (d ? new Date(d).toLocaleString() : '-');

export default function Account() {
  const [user, setUser] = useState(null);
  const [keys, setKeys] = useState([]);
  const [profile, setProfile] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const u = await sb().auth.getUser();
      setUser(u.data?.user || null);
      const k = await sb().from('api_keys').select('id,created_at,rotated_at,allowed_ips').is('revoked_at', null);
      setKeys(k.data || []);
      const p = await sb().from('profiles').select('display_name').maybeSingle();
      setProfile(p.data);
      setReady(true);
    })();
  }, []);

  if (!ready || !user) return <div className="wrap"><p className="mute">Checking your account…</p></div>;

  const old = keys.filter((k) => Date.now() - new Date(k.rotated_at || k.created_at).getTime() > 90 * 86400000);
  const unlocked = keys.filter((k) => !(k.allowed_ips || []).length);

  const checks = [
    { ok: !!user.email_confirmed_at, title: 'Email verified', fix: 'Open the confirmation email we sent to ' + user.email + '.' },
    { ok: !!profile?.display_name, title: 'Profile completed', fix: 'Add your name on the Profile page.', link: ['/profile', 'Open profile'] },
    { ok: old.length === 0, title: 'API keys rotated in the last 90 days', fix: old.length + ' key(s) are older than 90 days. Regenerate them.', link: ['/settings#keys', 'Open API keys'] },
    { ok: keys.length === 0 || unlocked.length === 0, title: 'API keys locked to server IPs', fix: unlocked.length + ' key(s) accept any IP. Optional, but safer if your server has a fixed IP.', link: ['/settings#keys', 'Open API keys'] },
  ];
  const passed = checks.filter((c) => c.ok).length;
  const pct = Math.round((passed / checks.length) * 100);

  return (
    <div className="wrap">
      <h1>Account check</h1>

      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <b>Security score</b><b className={pct === 100 ? 'ok' : ''}>{pct}%</b>
        </div>
        <div className="score"><i style={{ width: pct + '%' }} /></div>
        {checks.map((c) => (
          <div className="check" key={c.title}>
            <span className={'tick ' + (c.ok ? 'ok' : 'warn')}>{c.ok ? '✓' : '!'}</span>
            <div>
              <b>{c.title}</b>
              {!c.ok && <div className="mute">{c.fix} {c.link && <Link href={c.link[0]}>{c.link[1]}</Link>}</div>}
            </div>
          </div>
        ))}
      </div>

      <h2>Account details</h2>
      <div className="card">
        <dl className="kv">
          <dt>Email</dt><dd>{user.email}</dd>
          <dt>Email status</dt><dd className={user.email_confirmed_at ? 'ok' : 'bad'}>{user.email_confirmed_at ? 'Verified' : 'Not verified'}</dd>
          <dt>Account ID</dt><dd><code>{user.id}</code></dd>
          <dt>Created</dt><dd>{fmt(user.created_at)}</dd>
          <dt>Last sign-in</dt><dd>{fmt(user.last_sign_in_at)}</dd>
          <dt>Active API keys</dt><dd>{keys.length}</dd>
        </dl>
      </div>
      <div className="row">
        <Link className="btn" href="/settings">Open settings</Link>
        <Link className="btn ghost" href="/profile" style={{ background: 'rgba(255,255,255,.06)', border: '1px solid var(--line)', boxShadow: 'none' }}>Edit profile</Link>
      </div>
    </div>
  );
}
