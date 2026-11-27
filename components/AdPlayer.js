'use client';
import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/client';
import './nitro.css';

// Rewarded ad. The countdown only runs while this tab is visible; the server re-checks the real time.
export default function AdPlayer({ onClose, onDone }) {
  const [s, setS] = useState({ phase: 'loading' });
  const [elapsed, setElapsed] = useState(0);
  const doneRef = useRef(false);

  useEffect(() => {
    let alive = true;
    api('POST', '/api/nitro/ads/start').then((r) => {
      if (!alive) return;
      if (r.ok) setS({ phase: 'play', view: r.j.viewId, ad: r.j.ad }); else setS({ phase: 'error', msg: r.j.error || 'Could not start the ad.' });
    });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (s.phase !== 'play') return;
    const t = setInterval(() => { if (!document.hidden) setElapsed((e) => e + 0.25); }, 250);
    return () => clearInterval(t);
  }, [s.phase]);

  useEffect(() => {
    if (s.phase !== 'play' || doneRef.current || elapsed < s.ad.duration) return;
    doneRef.current = true;
    (async () => {
      const r = await api('POST', '/api/nitro/ads/complete', { viewId: s.view });
      if (r.ok) { setS({ phase: 'done', ad: s.ad, res: r.j }); onDone && onDone(r.j); } else setS({ phase: 'error', msg: r.j.error || 'Could not finish the ad.' });
    })();
  }, [elapsed, s, onDone]);

  const ad = s.ad;
  const left = ad ? Math.max(0, Math.ceil(ad.duration - elapsed)) : 0;
  const isLink = ad?.click_url;
  const external = isLink && /^https:/i.test(ad.click_url);

  return (
    <div className='ad-back'>
      <div className='ad' role='dialog' aria-label='Advertisement'>
        <div className='hd'>
          <span className='sp'>AD</span>
          <b>{ad ? (ad.advertiser ? ad.advertiser + ' \u00b7 ' : '') + ad.title : 'Loading ad'}</b>
          {s.phase !== 'play' && <button className='ghost small' onClick={onClose}>Close</button>}
        </div>
        {s.phase === 'loading' && <div className='media'><div className='skel' style={{ width: '60%', height: 24 }} /></div>}
        {s.phase === 'error' && <div className='ft'><p className='bad'>{s.msg}</p><button className='ghost' onClick={onClose}>Close</button></div>}
        {(s.phase === 'play' || s.phase === 'done') && (
          <>
            <div className='media'>
              {ad.kind === 'video' ? <video src={ad.media_url} autoPlay playsInline muted={false} /> : <img src={ad.media_url} alt='' />}
            </div>
            <div className='ft'>
              {s.phase === 'play' && (
                <>
                  <div className='bar'><i style={{ width: Math.min(100, (elapsed / ad.duration) * 100) + '%' }} /></div>
                  <div className='row' style={{ justifyContent: 'space-between' }}>
                    <span className='mute'>Your reward unlocks in {left}s. Keep this tab open.</span>
                    {isLink && <a className='ghost small' style={{ padding: '6px 12px', borderRadius: 10, border: '1px solid var(--line)' }} href={ad.click_url} target='_blank' rel={external ? 'noopener noreferrer sponsored' : 'noopener'}>Learn more</a>}
                  </div>
                </>
              )}
              {s.phase === 'done' && (
                <div className='row' style={{ justifyContent: 'space-between' }}>
                  <span className='ok'>Ad finished. {s.res.watched} of {s.res.needed} ads watched.</span>
                  <button onClick={onClose}>{s.res.canClaim ? 'Claim Nitro' : 'Close'}</button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
