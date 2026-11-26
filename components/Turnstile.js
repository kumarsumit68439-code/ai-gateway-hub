'use client';
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/client';
import './verify.css';

// Our own human check. Same name as before so every creation form keeps working.
// Shows "Select all stars" on a 3x3 picture grid, then hands a one-time pass token to onToken.
export default function Turnstile({ onToken, onError }) {
  const [ch, setCh] = useState(null);
  const [sel, setSel] = useState([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const load = useCallback(async (keep) => {
    setCh(null); setSel([]);
    if (!keep) setMsg('');
    const r = await api('GET', '/api/captcha/challenge');
    if (r.ok) setCh(r.j); else setMsg(r.j.error || 'Could not load the check.');
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggle = (i) => setSel((s) => (s.includes(i) ? s.filter((x) => x !== i) : [...s, i]));

  async function submit() {
    setBusy(true);
    const r = await api('POST', '/api/captcha/verify', { token: ch.token, picked: sel });
    setBusy(false);
    if (r.ok) { onToken(r.j.pass); return; }
    await load(true);
    setMsg(r.j.error || 'Verification failed.');
  }

  return (
    <div className='vf-back'>
      <div className='vf' role='dialog' aria-label='Verify you are human'>
        <h3>Verify you are human</h3>
        {ch ? (
          <>
            <div className='q'>{ch.prompt}</div>
            <div className='vf-grid'>
              {ch.tiles.map((src, i) => (
                <button type='button' key={i} className={'vf-tile' + (sel.includes(i) ? ' on' : '')} onClick={() => toggle(i)} aria-label={'Tile ' + (i + 1)}>
                  <img src={src} alt='' draggable={false} />
                </button>
              ))}
            </div>
          </>
        ) : <div className='skel' style={{ height: 300 }} />}
        {msg && <p className='bad' style={{ margin: '10px 0 0' }}>{msg}</p>}
        <div className='vf-foot'>
          <button type='button' className='ghost small' onClick={() => load()}>Refresh</button>
          <small>Jilowa Verify</small>
          <button type='button' className='ghost small' onClick={() => onError && onError('')}>Cancel</button>
          <button type='button' className='small' disabled={busy || !ch || sel.length === 0} onClick={submit}>{busy ? 'Checking\u2026' : 'Verify'}</button>
        </div>
      </div>
    </div>
  );
}
