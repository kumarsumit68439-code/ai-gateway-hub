'use client';
import { useState } from 'react';

// Round avatar with a gradient letter fallback when there is no image or it fails to load.
export default function Avatar({ src, name = '?', size = 36, round = true }) {
  const [bad, setBad] = useState(false);
  const letter = (String(name).trim()[0] || '?').toUpperCase();
  const base = { width: size, height: size, borderRadius: round ? '50%' : Math.round(size * 0.28), flex: 'none' };
  if (src && !bad) {
    return <img src={src} alt="" style={{ ...base, objectFit: 'cover', background: '#222' }} onError={() => setBad(true)} loading="lazy" referrerPolicy="no-referrer" />;
  }
  return (
    <span aria-hidden="true" style={{ ...base, display: 'inline-grid', placeItems: 'center', background: 'linear-gradient(135deg,#7c5cff,#22d3ee)', color: '#fff', fontWeight: 700, fontSize: Math.round(size * 0.45) }}>{letter}</span>
  );
}
