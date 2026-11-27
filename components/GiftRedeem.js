'use client';
import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/client';

// Redeem a Nitro gift from its link.
export default function GiftRedeem({ code }) {
  const [s, setS] = useState({ phase: 'idle' });
  async function go() {
    setS({ phase: 'busy' });
    const r = await api('POST', '/api/nitro/redeem', { code });
    setS(r.ok ? { phase: 'ok', days: r.j.days } : { phase: 'err', msg: r.j.error || 'Could not redeem this gift.' });
  }
  return (
    <div className='card' style={{ textAlign: 'center', padding: 30 }}>
      {s.phase === 'ok' ? (
        <>
          <h2 style={{ justifyContent: 'center', margin: '0 0 6px' }}>Gift redeemed</h2>
          <p className='ok'>You got {s.days} day{s.days === 1 ? '' : 's'} of Nitro.</p>
          <Link className='btn' href='/profile'>Customize your profile</Link>
        </>
      ) : (
        <>
          <h2 style={{ justifyContent: 'center', margin: '0 0 6px' }}>You received a Nitro gift</h2>
          <p className='mute'>Redeem it to unlock Nitro perks.</p>
          <button onClick={go} disabled={s.phase === 'busy'}>{s.phase === 'busy' ? 'Redeeming\u2026' : 'Redeem gift'}</button>
          {s.phase === 'err' && <p className='bad'>{s.msg}</p>}
        </>
      )}
    </div>
  );
}
