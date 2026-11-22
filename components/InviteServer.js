'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { sb } from '@/lib/supabase-browser';
import './discord.css';

// Join a server from an invite link.
export default function InviteServer({ code }) {
  const router = useRouter();
  const [info, setInfo] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const s = (await sb().auth.getSession()).data.session;
      const r = await fetch('/api/servers/invite/' + code, { headers: { Authorization: 'Bearer ' + s.access_token } });
      const j = await r.json();
      if (r.ok) setInfo(j); else setErr(j.error || 'That invite is invalid or expired.');
    })();
  }, [code]);

  async function join() {
    setBusy(true); setErr('');
    const s = (await sb().auth.getSession()).data.session;
    const r = await fetch('/api/servers/join', { method: 'POST', headers: { Authorization: 'Bearer ' + s.access_token, 'Content-Type': 'application/json' }, body: JSON.stringify({ code }) });
    const j = await r.json();
    if (r.ok) router.push('/servers/' + j.id); else { setErr(j.error || 'Could not join.'); setBusy(false); }
  }

  if (err && !info) return <p className="bad">{err} <Link href="/servers">Go to servers</Link></p>;
  if (!info) return <div className="skel" style={{ height: 120 }} />;
  return (
    <div className="card" style={{ textAlign: 'center', padding: 30 }}>
      <p className="mute" style={{ marginTop: 0 }}>You have been invited to join</p>
      <h2 style={{ justifyContent: 'center', margin: '4px 0 6px' }}>{info.name}</h2>
      <p className="mute">{info.members} member{info.members === 1 ? '' : 's'}</p>
      <button onClick={join} disabled={busy}>{busy ? 'Joining\u2026' : 'Join server'}</button>
      {err && <p className="bad">{err}</p>}
    </div>
  );
}
