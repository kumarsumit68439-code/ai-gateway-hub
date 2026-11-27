'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/client';
import AdPlayer from '@/components/AdPlayer';
import Turnstile from '@/components/Turnstile';
import { GiftSheet } from '@/components/Sheets';
import './nitro.css';

const PERKS = ['Animated (GIF) profile avatar', 'Avatar decorations', 'Profile banner', 'Custom profile colors', '2 Server Boosts (unlock server perks)', 'Nitro badge on your profile'];

function timeLeft(iso) {
  const ms = new Date(iso) - Date.now();
  if (ms <= 0) return null;
  const h = Math.floor(ms / 3600e3);
  return `${Math.floor(h / 24)}d ${h % 24}h ${Math.floor((ms % 3600e3) / 60000)}m`;
}

// Free Nitro: watch ads, claim days, gift your days, boost servers.
export default function NitroStore() {
  const [d, setD] = useState(null);
  const [ad, setAd] = useState(false);
  const [check, setCheck] = useState(false);
  const [gift, setGift] = useState(false);
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => { const r = await api('GET', '/api/nitro'); if (r.ok) setD(r.j); }, []);
  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, [load]);

  async function claim(pass) {
    setCheck(false); setBusy(true); setMsg(null);
    const r = await api('POST', '/api/nitro/ads/claim', { captcha: pass });
    setMsg(r.ok ? { ok: 'Nitro claimed. You got 1 more day.' } : { bad: r.j.error || 'Could not claim.' });
    await load();
    setBusy(false);
  }
  async function redeem(e) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    const r = await api('POST', '/api/nitro/redeem', { code });
    setMsg(r.ok ? { ok: `Gift redeemed: ${r.j.days} day${r.j.days === 1 ? '' : 's'} of Nitro.` } : { bad: r.j.error || 'Could not redeem.' });
    if (r.ok) setCode('');
    await load();
    setBusy(false);
  }
  async function boost(sid, method) {
    const r = await api(method, `/api/servers/${sid}/boost`);
    if (!r.ok) setMsg({ bad: r.j.error || 'Something went wrong.' });
    await load();
  }

  if (!d) return <div className='skel' style={{ height: 220 }} />;
  const left = d.nitro.active && d.nitro.period_end ? timeLeft(d.nitro.period_end) : null;
  const a = d.ads;

  return (
    <div>
      <div className='nt-hero'>
        <h2>Jilowa Nitro <span className='nt-badge'>FREE</span></h2>
        {left ? <p style={{ margin: 0 }}><b className='ok'>Nitro is active</b> \u00b7 {left} left</p> : <p className='mute' style={{ margin: 0 }}>You do not have Nitro right now. Watch ads to get it for free.</p>}
      </div>
      {msg?.ok && <p className='ok'>{msg.ok}</p>}
      {msg?.bad && <p className='bad'>{msg.bad}</p>}

      <h2>Get Nitro for free</h2>
      <div className='card'>
        <b>Watch {a.needed} ads, claim 1 day of Nitro</b>
        <div className='nt-bar'><i style={{ width: Math.min(100, (a.watched / a.needed) * 100) + '%' }} /></div>
        <p className='mute' style={{ margin: '0 0 12px' }}>{Math.min(a.watched, a.needed)} of {a.needed} ads watched \u00b7 {a.today} of {a.limit} ads used today</p>
        <div className='row'>
          <button onClick={() => setAd(true)} disabled={busy || a.today >= a.limit}>Watch an ad</button>
          <button onClick={() => setCheck(true)} disabled={busy || !a.canClaim} className={a.canClaim ? '' : 'ghost'}>Claim Nitro</button>
        </div>
        <p className='mute' style={{ marginBottom: 0, fontSize: 13 }}>You can hold up to 7 days of Nitro from claims.</p>
      </div>

      <h2>What you get</h2>
      <div className='card'><ul className='nt-perks'>{PERKS.map((p) => <li key={p}>{p}</li>)}</ul></div>
      <p><Link href='/profile'>Customize your profile</Link></p>

      <h2>Gifts</h2>
      <div className='card'>
        <div className='row'><button onClick={() => setGift(true)} disabled={!d.nitro.active}>Gift your Nitro days</button></div>
        <form onSubmit={redeem} style={{ marginTop: 14 }}>
          <label>Redeem a gift code or link</label>
          <div className='row' style={{ flexWrap: 'nowrap' }}>
            <input required value={code} onChange={(e) => setCode(e.target.value)} placeholder='Paste gift code' style={{ margin: 0 }} />
            <button disabled={busy}>Redeem</button>
          </div>
        </form>
      </div>

      <h2>Server boosts</h2>
      <div className='card'>
        {d.boosts.max === 0 ? <p className='mute' style={{ margin: 0 }}>Get Nitro to boost servers.</p> : (
          <>
            <p className='mute' style={{ marginTop: 0 }}>{d.boosts.max - d.boosts.used} of {d.boosts.max} boosts available</p>
            {d.boosts.servers.length === 0 && <p className='mute'>Join a server first.</p>}
            {d.boosts.servers.map((s) => (
              <div className='row' key={s.id} style={{ justifyContent: 'space-between', padding: '6px 0' }}>
                <span>{s.name}{s.mine > 0 && <span className='nt-badge' style={{ marginLeft: 8 }}>{s.mine} boost{s.mine === 1 ? '' : 's'}</span>}</span>
                <span className='row'>
                  <button className='small' onClick={() => boost(s.id, 'POST')} disabled={d.boosts.used >= d.boosts.max}>Boost</button>
                  {s.mine > 0 && <button className='ghost small' onClick={() => boost(s.id, 'DELETE')}>Remove</button>}
                </span>
              </div>
            ))}
          </>
        )}
      </div>

      {d.admin && <p style={{ marginTop: 20 }}><Link href='/admin/ads'>Manage ads (admin)</Link></p>}

      {ad && <AdPlayer onClose={() => { setAd(false); load(); }} onDone={load} />}
      {check && <Turnstile onToken={claim} onError={() => setCheck(false)} />}
      {gift && <GiftSheet onClose={() => { setGift(false); load(); }} />}
    </div>
  );
}
