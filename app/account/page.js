'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { sb } from '@/lib/supabase-browser';
import { Icon, NAMES } from '@/components/Icons';

const fmt = (d) => (d ? new Date(d).toLocaleString() : '-');

export default function Account() {
  const [user, setUser] = useState(null);
  const [keys, setKeys] = useState([]);
  const [profile, setProfile] = useState(null);
  const [engines, setEngines] = useState(null);
  const [ready, setReady] = useState(false);
  const [note, setNote] = useState(null);
  const [cool, setCool] = useState(0);

  useEffect(() => {
    (async () => {
      const u = await sb().auth.getUser();
      setUser(u.data?.user || null);
      const k = await sb().from('api_keys').select('id,created_at,rotated_at,allowed_ips').is('revoked_at', null);
      const b = await sb().from('backend_keys').select('id,created_at,rotated_at,allowed_ips').is('revoked_at', null);
      setKeys([...(k.data || []), ...(b.data || [])]);
      const p = await sb().from('profiles').select('display_name').maybeSingle();
      setProfile(p.data);
      const s = (await sb().auth.getSession()).data.session;
      if (s) {
        const r = await fetch('/api/backend-keys', { headers: { Authorization: 'Bearer ' + s.access_token } });
        if (r.ok) setEngines((await r.json()).engines);
      }
      setReady(true);
    })();
  }, []);

  useEffect(() => {
    if (cool <= 0) return;
    const t = setTimeout(() => setCool(cool - 1), 1000);
    return () => clearTimeout(t);
  }, [cool]);

  async function resend() {
    setNote(null);
    const { error } = await sb().auth.resend({ type: 'signup', email: user.email, options: { emailRedirectTo: window.location.origin + '/dashboard' } });
    if (error) setNote({ bad: error.message });
    else { setNote({ ok: 'Verification email sent. Open the link, then press "Check again".' }); setCool(60); }
  }

  async function recheck() {
    setNote(null);
    await sb().auth.refreshSession();
    const u = (await sb().auth.getUser()).data?.user;
    setUser(u || user);
    setNote(u?.email_confirmed_at ? { ok: 'Email verified.' } : { bad: 'Not verified yet.' });
  }

  if (!ready || !user) return <div className="wrap"><div className="skel" style={{ width: 240, height: 28 }} /></div>;

  const verified = !!user.email_confirmed_at;
  const old = keys.filter((k) => Date.now() - new Date(k.rotated_at || k.created_at).getTime() > 90 * 86400000);
  const unlocked = keys.filter((k) => !(k.allowed_ips || []).length);
  const dbs = ['supabase', 'mongodb', 'firebase'].filter((id) => (engines ? engines[id] : id === 'supabase'));

  const checks = [
    { ok: verified, title: 'Email verified' },
    { ok: !!profile?.display_name, title: 'Profile completed', link: ['/profile', 'Open profile'] },
    { ok: old.length === 0, title: 'Keys rotated in the last 90 days', link: ['/settings#keys', 'Open keys'] },
    { ok: keys.length === 0 || unlocked.length === 0, title: 'Keys locked to IPs', link: ['/settings#keys', 'Open keys'] },
  ];
  const pct = Math.round((checks.filter((c) => c.ok).length / checks.length) * 100);

  return (
    <div className="wrap">
      <h1>Verification</h1>

      <div className="card" style={{ borderColor: verified ? 'var(--ok)' : '#fbbf24' }}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <b>{user.email}</b>
          <b className={verified ? 'ok' : ''} style={verified ? {} : { color: '#fbbf24' }}>{verified ? '✓ Verified' : 'Not verified'}</b>
        </div>
        {verified ? (
          <p className="mute" style={{ marginBottom: 0 }}>Verified on {fmt(user.email_confirmed_at)}</p>
        ) : (
          <div className="row" style={{ marginTop: 12 }}>
            <button onClick={resend} disabled={cool > 0}>{cool > 0 ? `Resend in ${cool}s` : 'Send verification email'}</button>
            <button className="ghost" onClick={recheck}>Check again</button>
          </div>
        )}
        {note?.ok && <p className="ok" style={{ marginBottom: 0 }}>{note.ok}</p>}
        {note?.bad && <p className="bad" style={{ marginBottom: 0 }}>{note.bad}</p>}
      </div>

      {dbs.length > 0 && (
        <>
          <h2>Storage</h2>
          <div className="card">
            {dbs.map((id) => (
              <div className="check" key={id} style={{ alignItems: 'center' }}>
                <Icon id={id} size={32} />
                <b style={{ flex: 1 }}>{NAMES[id]}</b>
                <span className="ok">✓ Active</span>
              </div>
            ))}
          </div>
        </>
      )}

      <h2>Security score</h2>
      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <span className="mute">Score</span><b className={pct === 100 ? 'ok' : ''}>{pct}%</b>
        </div>
        <div className="score"><i style={{ width: pct + '%' }} /></div>
        {checks.map((c) => (
          <div className="check" key={c.title}>
            <span className={'tick ' + (c.ok ? 'ok' : 'warn')}>{c.ok ? '✓' : '!'}</span>
            <div>
              <b>{c.title}</b>
              {!c.ok && c.link && <div><Link href={c.link[0]}>{c.link[1]}</Link></div>}
            </div>
          </div>
        ))}
      </div>

      <h2>Details</h2>
      <div className="card">
        <dl className="kv">
          <dt>Email</dt><dd>{user.email}</dd>
          <dt>Created</dt><dd>{fmt(user.created_at)}</dd>
          <dt>Last sign-in</dt><dd>{fmt(user.last_sign_in_at)}</dd>
          <dt>Active keys</dt><dd>{keys.length}</dd>
        </dl>
      </div>
    </div>
  );
}
