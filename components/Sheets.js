'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { sb } from '@/lib/supabase-browser';
import { api } from '@/lib/client';
import Ic from '@/components/Ic';
import { Sheet } from '@/components/ServerMenu';
import './dx.css';
import './dx2.css';

const fmtWhen = (d) => new Date(d).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

// Server events with Interested and create/delete for managers.
export function EventsSheet({ server, channels, canManage, meId, onClose }) {
  const [events, setEvents] = useState(null);
  const [interest, setInterest] = useState([]);
  const [form, setForm] = useState(false);
  const [name, setName] = useState('');
  const [when, setWhen] = useState('');
  const [desc, setDesc] = useState('');
  const [chan, setChan] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const since = new Date(Date.now() - 2 * 3600e3).toISOString();
    const [e, i] = await Promise.all([
      sb().from('server_events').select('id,name,description,channel_id,starts_at').eq('server_id', server.id).gte('starts_at', since).order('starts_at'),
      sb().from('event_interest').select('event_id,user_id').eq('server_id', server.id),
    ]);
    setEvents(e.data || []);
    setInterest(i.data || []);
  }, [server.id]);

  useEffect(() => { load(); }, [load]);

  async function create(e) {
    e.preventDefault();
    setBusy(true); setErr('');
    const r = await api('POST', `/api/servers/${server.id}/events`, { name, description: desc, starts_at: new Date(when).toISOString(), channel_id: chan || null });
    if (r.ok) { setForm(false); setName(''); setDesc(''); setWhen(''); setChan(''); load(); } else setErr(r.j.error || 'Could not create the event.');
    setBusy(false);
  }
  async function toggle(id) { await api('POST', `/api/servers/${server.id}/events/${id}/interest`); load(); }
  async function del(id) {
    if (!confirm('Delete this event?')) return;
    await api('DELETE', `/api/servers/${server.id}/events?eventId=${id}`);
    load();
  }
  const cname = (id) => channels.find((c) => c.id === id)?.name;

  return (
    <Sheet title='Events' onClose={onClose}>
      {events === null && <div className='skel' style={{ height: 80 }} />}
      {events && events.length === 0 && !form && <p className='mute'>No upcoming events.</p>}
      {events && events.map((ev) => {
        const n = interest.filter((x) => x.event_id === ev.id).length;
        const mine = interest.some((x) => x.event_id === ev.id && x.user_id === meId);
        return (
          <div className='ev' key={ev.id}>
            <div className='when'>{fmtWhen(ev.starts_at)}</div>
            <h4>{ev.name}</h4>
            {ev.description && <p>{ev.description}</p>}
            {ev.channel_id && cname(ev.channel_id) && <div className='mute' style={{ fontSize: 13 }}>In #{cname(ev.channel_id)}</div>}
            <div className='row' style={{ marginTop: 10 }}>
              <button className={mine ? '' : 'ghost'} onClick={() => toggle(ev.id)}>{mine ? 'Interested' : 'Mark as interested'}</button>
              <span className='mute'>{n} interested</span>
              {canManage && <button className='danger small' style={{ marginLeft: 'auto' }} onClick={() => del(ev.id)}>Delete</button>}
            </div>
          </div>
        );
      })}
      {canManage && !form && <button onClick={() => setForm(true)}>Create event</button>}
      {canManage && form && (
        <form onSubmit={create}>
          <label>Event name</label>
          <input required minLength={2} maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
          <label>Starts</label>
          <input required type='datetime-local' value={when} onChange={(e) => setWhen(e.target.value)} />
          <label>Where (optional)</label>
          <select className='sel' value={chan} onChange={(e) => setChan(e.target.value)}>
            <option value=''>Anywhere</option>
            {channels.map((c) => <option key={c.id} value={c.id}>{c.type === 'voice' ? 'Voice: ' : '# '}{c.name}</option>)}
          </select>
          <label>Description (optional)</label>
          <textarea maxLength={500} value={desc} onChange={(e) => setDesc(e.target.value)} style={{ minHeight: 70 }} />
          {err && <p className='bad'>{err}</p>}
          <div className='row'><button disabled={busy}>{busy ? 'Creating\u2026' : 'Create'}</button><button type='button' className='ghost' onClick={() => setForm(false)}>Cancel</button></div>
        </form>
      )}
    </Sheet>
  );
}

// Server Boosts: level, progress and perks. Boosting needs Nitro (which is free).
export function BoostSheet({ server, onClose }) {
  const [i, setI] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const r = await api('GET', `/api/servers/${server.id}/boost`);
    if (r.ok) setI(r.j); else setErr(r.j.error || 'Could not load boosts.');
  }, [server.id]);
  useEffect(() => { load(); }, [load]);

  async function act(method) {
    setBusy(true); setErr('');
    const r = await api(method, `/api/servers/${server.id}/boost`);
    if (r.ok) setI(r.j); else setErr(r.j.error || 'Something went wrong.');
    setBusy(false);
  }

  const perks = [[1, 'Animated server icon (GIF)'], [2, 'Server banner'], [3, 'Custom invite link']];
  return (
    <Sheet onClose={onClose}>
      <div className='bigmark'><Ic n='boost' s={34} /></div>
      <h3 style={{ marginTop: 0 }}>Server Boosts</h3>
      {!i && !err && <div className='skel' style={{ height: 120 }} />}
      {i && (
        <>
          <p style={{ margin: '0 0 4px' }}><b>Level {i.level}</b> \u00b7 {i.count} boost{i.count === 1 ? '' : 's'}</p>
          <p className='mute' style={{ margin: 0 }}>{i.next ? `${i.next - i.count} more to reach Level ${i.level + 1}` : 'Max level reached'}</p>
          <div className='lvl'>{[2, 7, 14].map((n, k) => <span key={n} className={i.level > k ? 'on' : ''}>Level {k + 1}<br />{n} boosts</span>)}</div>
          {perks.map(([lv, text]) => <div key={lv} className={'perk' + (i.level >= lv ? '' : ' off')}><Ic n={i.level >= lv ? 'check' : 'boost'} s={20} />{text} <span className='mute'>(Level {lv})</span></div>)}
          <div style={{ marginTop: 14 }}>
            {i.hasNitro ? (
              <div className='row'>
                <button onClick={() => act('POST')} disabled={busy || i.free < 1}>Boost this server</button>
                {i.mine > 0 && <button className='ghost' onClick={() => act('DELETE')} disabled={busy}>Remove my boost</button>}
                <span className='mute'>{i.free} of 2 boosts available</span>
              </div>
            ) : <p className='mute'>Boosting a server needs Nitro. <Link href='/nitro'>Get free Nitro</Link></p>}
          </div>
        </>
      )}
      {err && <p className='bad'>{err}</p>}
    </Sheet>
  );
}

// Gift Nitro: turn some of your own Nitro days into a code, then send the link in the chat.
export function GiftSheet({ onClose, onSend }) {
  const [d, setD] = useState(null);
  const [days, setDays] = useState(1);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState('');

  const load = useCallback(async () => { const r = await api('GET', '/api/nitro'); if (r.ok) setD(r.j); }, []);
  useEffect(() => { load(); }, [load]);

  async function make() {
    setBusy(true); setErr('');
    const r = await api('POST', '/api/nitro/gift', { days });
    if (!r.ok) setErr(r.j.error || 'Could not create the gift.');
    await load();
    setBusy(false);
  }
  const link = (code) => window.location.origin + '/gift/' + code;
  const open = (d?.gifts || []).filter((g) => !g.redeemed_by);
  const left = d?.nitro.period_end ? Math.max(0, Math.floor((new Date(d.nitro.period_end) - Date.now()) / 3600e3)) : 0;

  return (
    <Sheet title='Gift Nitro' onClose={onClose}>
      {!d && <div className='skel' style={{ height: 120 }} />}
      {d && (
        <>
          {d.nitro.active ? (
            <>
              <p className='mute' style={{ marginTop: 0 }}>You have about {Math.floor(left / 24)}d {left % 24}h of Nitro. Gifting takes those days from your Nitro.</p>
              <div className='seg'>{[1, 3, 7].map((n) => <button key={n} type='button' className={days === n ? 'on' : ''} onClick={() => setDays(n)}>{n} day{n === 1 ? '' : 's'}</button>)}</div>
              <button onClick={make} disabled={busy}>{busy ? 'Creating\u2026' : 'Create gift'}</button>
            </>
          ) : <p className='mute' style={{ marginTop: 0 }}>You need Nitro to gift it. <Link href='/nitro'>Get free Nitro</Link></p>}
          {err && <p className='bad'>{err}</p>}
          {open.length > 0 && (
            <>
              <h3 style={{ marginTop: 22 }}>Your gifts</h3>
              {open.map((g) => (
                <div className='ev' key={g.code}>
                  <b>Nitro</b> <span className='mute'>{g.days} day{g.days === 1 ? '' : 's'}</span>
                  <div className='row' style={{ marginTop: 8 }}>
                    {onSend && <button className='small' onClick={() => { onSend(link(g.code)); onClose(); }}>Send in chat</button>}
                    <button className='ghost small' onClick={() => { navigator.clipboard.writeText(link(g.code)); setCopied(g.code); setTimeout(() => setCopied(''), 1400); }}>{copied === g.code ? 'Copied' : 'Copy link'}</button>
                  </div>
                </div>
              ))}
            </>
          )}
        </>
      )}
    </Sheet>
  );
}
