'use client';
import { useEffect, useState } from 'react';

// Animates a number from 0 up to its value.
export default function CountUp({ value, duration = 900 }) {
  const [n, setN] = useState(0);

  useEffect(() => {
    const v = Number(value) || 0;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setN(v); return; }
    let raf, start;
    const step = (t) => {
      if (!start) start = t;
      const p = Math.min((t - start) / duration, 1);
      setN(Math.round(v * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return <>{n.toLocaleString()}</>;
}
