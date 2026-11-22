'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { sb } from '@/lib/supabase-browser';
import './discord.css';

export default function ServerList() {
  const router = useRouter();
  const [servers, setServers] = useState(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const u = (await sb().auth.getUser()).data.user;
    const r = await sb().from('server_members').select('role,servers(id,name)').eq('user_id', u.id);
    setServers((r.data || []).filter((x) => x.servers));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function call(url, body) {
    const s = (await sb().auth.getSession()).data.session;
    const r = await fetch(url, { method: 'POST', headers: { Authorization: 'Bearer ' + s.access_token, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return { ok: r.ok, j: await r.json() };
  }

  async function create(e) {
    e.preventDefault();
    setBusy(true); setMsg('');
    const r = await call('/api/servers', { name });
    if (r.ok) router.push('/servers/' + r.j.id); else { setMsg(r.j.error || 'Could not create server.'); setBusy(false); }
  }

  async function join(e) {
    e.preventDefault();
    setBusy(true); setMsg('');
    const clean = code.trim().split('/').pop();
    const r = await call('/api/servers/join', { code: clean });
    if (r.ok) router.push('/servers/' + r.j.id); else { setMsg(r.j.error || 'Could not join.'); setBusy(false); }
  }

  return (
    <div>
      <div className="row2">
        <form className="card" onSubmit={create}>
          <b>Create a server</b>
          <input required minLength={2} maxLength={40} placeholder="Server name" value={name} onChange={(e) => setName(e.target.value)} style={{ marginTop: 10 }} />
          <button disabled={busy}>Create server</button>
        </form>
        <form className="card" onSubmit={join}>
          <b>Join with an invite</b>
          <input required placeholder="Invite code or link" value={code} onChange={(e) => setCode(e.target.value)} style={{ marginTop: 10 }} />
          <button disabled={busy}>Join server</button>
        </form>
      </div>
      {msg && <p className="bad">{msg}</p>}

      <h2>Your servers</h2>
      {servers === null ? <div className="skel" style={{ height: 70 }} /> : servers.length === 0 ? <p className="mute">You are not in any server yet.</p> : (
        <div className="grid">
          {servers.map((s) => (
            <Link key={s.servers.id} href={'/servers/' + s.servers.id} className="tile">
              <em>{s.servers.name[0].toUpperCase()}</em>
              <b>{s.servers.name}</b>
              <span>{s.role === 'owner' ? 'Owner' : 'Member'}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
