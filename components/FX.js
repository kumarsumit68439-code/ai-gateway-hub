'use client';
import { useEffect } from 'react';

// Moves the soft spotlight inside cards with the cursor.
export default function FX() {
  useEffect(() => {
    const on = (e) => {
      const t = e.target.closest && e.target.closest('.card,.tile,.stat,.glass');
      if (!t) return;
      const r = t.getBoundingClientRect();
      t.style.setProperty('--x', e.clientX - r.left + 'px');
      t.style.setProperty('--y', e.clientY - r.top + 'px');
    };
    document.addEventListener('pointermove', on, { passive: true });
    return () => document.removeEventListener('pointermove', on);
  }, []);
  return null;
}
