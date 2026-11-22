'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

// Global interaction effects: cursor glow, card spotlight + tilt, button ripple,
// scroll reveal, code-block copy buttons and a route-change progress bar.
export default function FX() {
  const path = usePathname();

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const root = document.documentElement;
    let last = null;
    const resetTilt = (el) => { if (el) { el.style.removeProperty('--rx'); el.style.removeProperty('--ry'); } };

    const move = (e) => {
      root.style.setProperty('--mx', e.clientX + 'px');
      root.style.setProperty('--my', e.clientY + 'px');
      const t = e.target.closest && e.target.closest('.card,.tile,.stat,.glass');
      if (!t) { if (last) { resetTilt(last); last = null; } return; }
      const r = t.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      t.style.setProperty('--x', x + 'px');
      t.style.setProperty('--y', y + 'px');
      if (!reduce && t.matches('.tile,.stat')) {
        t.style.setProperty('--ry', ((x / r.width - 0.5) * 8).toFixed(2) + 'deg');
        t.style.setProperty('--rx', ((0.5 - y / r.height) * 8).toFixed(2) + 'deg');
      }
      if (last && last !== t) resetTilt(last);
      last = t;
    };

    const down = (e) => {
      const b = e.target.closest && e.target.closest('button,.btn');
      if (!b || b.disabled || reduce) return;
      const r = b.getBoundingClientRect();
      const d = Math.max(r.width, r.height) * 1.6;
      const s = document.createElement('span');
      s.className = 'ripple';
      s.style.cssText = `width:${d}px;height:${d}px;left:${e.clientX - r.left - d / 2}px;top:${e.clientY - r.top - d / 2}px`;
      b.appendChild(s);
      setTimeout(() => s.remove(), 650);
    };

    document.addEventListener('pointermove', move, { passive: true });
    document.addEventListener('pointerdown', down, { passive: true });
    return () => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerdown', down);
    };
  }, []);

  // Scroll reveal for content below the fold + copy buttons on code blocks.
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let io = null;
    if (!reduce) {
      io = new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
        });
      }, { threshold: 0.08, rootMargin: '0px 0px -6% 0px' });
    }

    const prepare = () => {
      if (io) {
        document.querySelectorAll('.wrap > *:not(.rv)').forEach((el) => {
          if (el.getBoundingClientRect().top < window.innerHeight * 0.92) return;
          el.classList.add('rv');
          io.observe(el);
        });
      }
      document.querySelectorAll('pre:not([data-copy])').forEach((pre) => {
        pre.dataset.copy = '1';
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'ghost small copybtn';
        b.textContent = 'Copy';
        b.onclick = () => {
          const code = pre.querySelector('code');
          navigator.clipboard.writeText((code ? code.innerText : pre.innerText).trim());
          b.textContent = 'Copied';
          setTimeout(() => { b.textContent = 'Copy'; }, 1400);
        };
        pre.appendChild(b);
      });
    };

    let timer = setTimeout(prepare, 500);
    const mo = new MutationObserver(() => { clearTimeout(timer); timer = setTimeout(prepare, 350); });
    const main = document.querySelector('main');
    if (main) mo.observe(main, { childList: true, subtree: true });
    return () => { clearTimeout(timer); mo.disconnect(); if (io) io.disconnect(); };
  }, [path]);

  return <div key={path} className="topbar" aria-hidden="true" />;
}
