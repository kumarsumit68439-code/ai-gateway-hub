'use client';
import { useEffect, useRef } from 'react';

let loading;
function loadScript() {
  if (window.turnstile) return Promise.resolve();
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      s.async = true;
      s.onload = resolve;
      s.onerror = () => { loading = null; reject(new Error('Captcha failed to load. Check your connection and try again.')); };
      document.head.appendChild(s);
    });
  }
  return loading;
}

// Cloudflare Turnstile widget. Mount it only when a captcha is actually needed;
// it is removed again as soon as it is unmounted.
export default function Turnstile({ siteKey, onToken, onError }) {
  const box = useRef(null);
  const cb = useRef({ onToken, onError });
  cb.current = { onToken, onError };

  useEffect(() => {
    let widget = null;
    let dead = false;
    loadScript()
      .then(() => {
        if (dead || !box.current) return;
        widget = window.turnstile.render(box.current, {
          sitekey: siteKey,
          theme: 'dark',
          callback: (t) => cb.current.onToken(t),
          'error-callback': () => cb.current.onError && cb.current.onError('Captcha error. Please try again.'),
          'expired-callback': () => cb.current.onError && cb.current.onError('Captcha expired. Please try again.'),
        });
      })
      .catch((e) => cb.current.onError && cb.current.onError(e.message));
    return () => {
      dead = true;
      if (widget !== null && window.turnstile) window.turnstile.remove(widget);
    };
  }, [siteKey]);

  return <div ref={box} style={{ minHeight: 65, margin: '12px 0' }} />;
}
