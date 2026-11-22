'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

export default function FloatingWindowPage() {
  const windowRef = useRef(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const [minimized, setMinimized] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Center the floating window on first load
  useEffect(() => {
    const center = () => {
      if (!windowRef.current) return;
      const w = windowRef.current.offsetWidth;
      const h = windowRef.current.offsetHeight;
      setPos({
        x: Math.max(20, (window.innerWidth - w) / 2),
        y: Math.max(80, (window.innerHeight - h) / 2 - 40),
      });
    };
    center();
    window.addEventListener('resize', center);
    return () => window.removeEventListener('resize', center);
  }, []);

  // Drag handlers
  useEffect(() => {
    const onMove = (e) => {
      if (!dragging) return;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      setPos({
        x: clientX - dragOffset.current.x,
        y: clientY - dragOffset.current.y,
      });
    };
    const onUp = () => setDragging(false);

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
    };
  }, [dragging]);

  const startDrag = (e) => {
    if (e.target.closest('.win-btn') || e.target.closest('.win-content')) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const rect = windowRef.current.getBoundingClientRect();
    dragOffset.current = { x: clientX - rect.left, y: clientY - rect.top };
    setDragging(true);
  };

  return (
    <div className="float-page">
      {/* Left sidebar */}
      <aside className={`float-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sb-head">
          <span className="dot" />
          <b>AI Gateway</b>
          <button className="sb-toggle" onClick={() => setSidebarOpen(false)} aria-label="Close sidebar">
            ×
          </button>
        </div>
        <nav className="sb-nav">
          <p className="sb-label">Explore</p>
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/models">Live Models</Link>
          <Link href="/docs">API Docs</Link>
          <Link href="/docs/backend">Backend Docs</Link>
          <p className="sb-label">Keys</p>
          <Link href="/gateway-keys">AI Gateway keys</Link>
          <Link href="/backend-keys">Backend keys</Link>
          <p className="sb-label">Account</p>
          <Link href="/account">Verification</Link>
          <Link href="/profile">Profile</Link>
          <Link href="/settings">Settings</Link>
          <Link href="/menu">All pages</Link>
        </nav>
        <div className="sb-foot">
          <p>Provided by <span className="grad">Jilowa</span></p>
          <small>One key → every model</small>
        </div>
      </aside>

      {!sidebarOpen && (
        <button className="sb-open-btn" onClick={() => setSidebarOpen(true)} aria-label="Open sidebar">
          ☰
        </button>
      )}

      {/* Background scene with 3D depth */}
      <div className="float-scene">
        <div className="scene-floor" />
        <div className="scene-particles" aria-hidden="true">
          {[...Array(12)].map((_, i) => (
            <span key={i} className="particle" style={{ '--i': i }} />
          ))}
        </div>

        {/* The real floating 3D window */}
        <div
          ref={windowRef}
          className={`float-window ${dragging ? 'dragging' : ''} ${minimized ? 'minimized' : ''}`}
          style={{
            transform: `translate3d(${pos.x}px, ${pos.y}px, 0) rotateX(var(--rx, 2deg)) rotateY(var(--ry, -3deg))`,
          }}
          onMouseDown={startDrag}
          onTouchStart={startDrag}
        >
          {/* Title bar */}
          <div className="win-titlebar">
            <div className="win-dots">
              <button className="win-btn close" onClick={() => setMinimized(true)} title="Minimize" />
              <button className="win-btn min" onClick={() => setMinimized(true)} title="Minimize" />
              <button className="win-btn max" onClick={() => setMinimized(false)} title="Restore" />
            </div>
            <span className="win-title">AI Gateway Hub — Floating Preview</span>
            <div className="win-spacer" />
          </div>

          {/* Window content */}
          {!minimized && (
            <div className="win-content">
              {/* Hero image / video area with 3D card */}
              <div className="hero-3d">
                <div className="hero-card">
                  <div className="hero-glow" />
                  <div className="hero-visual">
                    <div className="hero-icon">⚡</div>
                    <div className="hero-rings">
                      <i /><i /><i />
                    </div>
                  </div>
                  <div className="hero-text">
                    <h2>One API key for every AI model</h2>
                    <p>Groq · OpenRouter · Gemini · OpenAI</p>
                  </div>
                </div>
              </div>

              {/* Website details */}
              <div className="details-grid">
                <div className="detail-card">
                  <span className="detail-icon">🔑</span>
                  <h3>Gateway Keys</h3>
                  <p>Create <code>sk-gw-...</code> keys. Call real provider models through a single OpenAI-compatible endpoint.</p>
                </div>
                <div className="detail-card">
                  <span className="detail-icon">📡</span>
                  <h3>Endpoints</h3>
                  <p><code>POST /api/v1/chat/completions</code><br /><code>GET /api/v1/models</code><br /><code>GET /api/v1/providers</code></p>
                </div>
                <div className="detail-card">
                  <span className="detail-icon">🛡️</span>
                  <h3>Security</h3>
                  <p>Supabase RLS, hashed keys, rate limits (30/min · 1000/day), free models only on OpenRouter.</p>
                </div>
                <div className="detail-card">
                  <span className="detail-icon">🚀</span>
                  <h3>Streaming</h3>
                  <p>Full streaming support. Live model list. Backend keys for storing your app data.</p>
                </div>
              </div>

              <div className="win-cta">
                <Link href="/login" className="btn">Get started</Link>
                <Link href="/docs" className="btn ghost">Read the docs</Link>
              </div>

              <p className="win-footer">Provided by <span className="grad">Jilowa</span> · AI Gateway Hub</p>
            </div>
          )}
        </div>

        {/* Dock / minimize bar */}
        {minimized && (
          <button className="float-dock" onClick={() => setMinimized(false)}>
            <span className="dot" /> Restore Floating Window
          </button>
        )}
      </div>

      <style jsx global>{`
        .float-page {
          position: relative;
          min-height: calc(100vh - 60px);
          overflow: hidden;
          display: flex;
        }

        /* Sidebar */
        .float-sidebar {
          width: 260px;
          flex-shrink: 0;
          background: rgba(10, 11, 20, 0.92);
          border-right: 1px solid var(--line);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          display: flex;
          flex-direction: column;
          z-index: 15;
          transition: transform 0.35s cubic-bezier(0.2, 0.8, 0.2, 1), width 0.35s;
        }
        .float-sidebar.closed {
          transform: translateX(-100%);
          width: 0;
          border: none;
          overflow: hidden;
        }
        .sb-head {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 18px 16px;
          border-bottom: 1px solid var(--line);
          font-family: var(--f-head), sans-serif;
          font-weight: 700;
        }
        .sb-toggle {
          margin-left: auto;
          background: none;
          border: none;
          color: var(--mute);
          font-size: 22px;
          cursor: pointer;
          line-height: 1;
          padding: 0 4px;
        }
        .sb-toggle:hover { color: var(--text); }
        .sb-nav {
          flex: 1;
          padding: 12px 10px;
          overflow-y: auto;
        }
        .sb-nav a {
          display: block;
          padding: 10px 12px;
          border-radius: 10px;
          color: var(--text);
          font-size: 14px;
          transition: 0.2s;
        }
        .sb-nav a:hover {
          background: rgba(255, 255, 255, 0.07);
          text-decoration: none;
          color: #fff;
        }
        .sb-label {
          margin: 14px 12px 6px;
          font-size: 11px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--mute);
        }
        .sb-foot {
          padding: 16px;
          border-top: 1px solid var(--line);
          font-size: 13px;
          color: var(--mute);
        }
        .sb-open-btn {
          position: fixed;
          top: 70px;
          left: 14px;
          z-index: 16;
          width: 42px;
          height: 42px;
          border-radius: 12px;
          border: 1px solid var(--line);
          background: rgba(14, 15, 26, 0.9);
          color: var(--text);
          font-size: 18px;
          cursor: pointer;
          backdrop-filter: blur(12px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
        }
        .sb-open-btn:hover {
          border-color: var(--accent);
          transform: scale(1.05);
        }

        /* 3D scene */
        .float-scene {
          flex: 1;
          position: relative;
          perspective: 1400px;
          overflow: hidden;
          min-height: calc(100vh - 60px);
        }
        .scene-floor {
          position: absolute;
          inset: 40% -20% -30%;
          background: radial-gradient(ellipse at center, rgba(124, 92, 255, 0.12) 0%, transparent 70%);
          transform: rotateX(70deg);
          pointer-events: none;
        }
        .scene-particles {
          position: absolute;
          inset: 0;
          pointer-events: none;
          overflow: hidden;
        }
        .particle {
          position: absolute;
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: var(--accent2);
          opacity: 0.35;
          left: calc(8% + (var(--i) * 7.5%));
          top: calc(15% + (var(--i) * 5%));
          animation: particleFloat 8s ease-in-out infinite;
          animation-delay: calc(var(--i) * -0.6s);
          box-shadow: 0 0 10px var(--accent2);
        }
        @keyframes particleFloat {
          0%, 100% { transform: translateY(0) scale(1); opacity: 0.25; }
          50% { transform: translateY(-40px) scale(1.4); opacity: 0.55; }
        }

        /* Floating window */
        .float-window {
          position: absolute;
          width: min(520px, 92vw);
          --rx: 2deg;
          --ry: -3deg;
          transform-style: preserve-3d;
          animation: windowFloat 6s ease-in-out infinite;
          cursor: grab;
          z-index: 10;
          border-radius: 18px;
          background: rgba(16, 18, 32, 0.82);
          border: 1px solid rgba(255, 255, 255, 0.12);
          box-shadow:
            0 25px 80px rgba(0, 0, 0, 0.55),
            0 0 0 1px rgba(124, 92, 255, 0.15),
            inset 0 1px 0 rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(24px) saturate(1.4);
          -webkit-backdrop-filter: blur(24px) saturate(1.4);
          overflow: hidden;
          transition: box-shadow 0.3s, border-color 0.3s;
        }
        .float-window:hover {
          --rx: 0deg;
          --ry: 0deg;
          border-color: rgba(124, 92, 255, 0.45);
          box-shadow:
            0 30px 100px rgba(124, 92, 255, 0.25),
            0 0 0 1px rgba(124, 92, 255, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.1);
        }
        .float-window.dragging {
          cursor: grabbing;
          animation: none;
          transition: none;
          box-shadow:
            0 40px 120px rgba(0, 0, 0, 0.65),
            0 0 40px rgba(124, 92, 255, 0.35);
        }
        .float-window.minimized {
          width: 280px;
          height: auto;
          animation: none;
        }
        @keyframes windowFloat {
          0%, 100% {
            transform: translate3d(var(--tx, 0), var(--ty, 0), 0) rotateX(2deg) rotateY(-3deg) translateY(0);
          }
          50% {
            transform: translate3d(var(--tx, 0), var(--ty, 0), 0) rotateX(-1deg) rotateY(2deg) translateY(-14px);
          }
        }

        /* Title bar */
        .win-titlebar {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 11px 14px;
          background: rgba(0, 0, 0, 0.35);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          user-select: none;
        }
        .win-dots {
          display: flex;
          gap: 7px;
        }
        .win-btn {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          border: none;
          cursor: pointer;
          padding: 0;
          transition: transform 0.15s, filter 0.15s;
        }
        .win-btn:hover { transform: scale(1.15); filter: brightness(1.2); }
        .win-btn.close { background: #ff5f57; }
        .win-btn.min { background: #febc2e; }
        .win-btn.max { background: #28c840; }
        .win-title {
          flex: 1;
          text-align: center;
          font-size: 13px;
          color: var(--mute);
          font-weight: 500;
          letter-spacing: 0.02em;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .win-spacer { width: 50px; }

        /* Content */
        .win-content {
          padding: 20px;
          max-height: min(70vh, 620px);
          overflow-y: auto;
          cursor: default;
        }

        /* 3D hero */
        .hero-3d {
          perspective: 800px;
          margin-bottom: 20px;
        }
        .hero-card {
          position: relative;
          border-radius: 16px;
          padding: 28px 20px;
          background: linear-gradient(145deg, rgba(124, 92, 255, 0.18), rgba(34, 211, 238, 0.1));
          border: 1px solid rgba(124, 92, 255, 0.35);
          transform-style: preserve-3d;
          animation: heroTilt 7s ease-in-out infinite;
          overflow: hidden;
        }
        @keyframes heroTilt {
          0%, 100% { transform: rotateY(-6deg) rotateX(4deg); }
          50% { transform: rotateY(6deg) rotateX(-3deg); }
        }
        .hero-glow {
          position: absolute;
          inset: -40%;
          background: radial-gradient(circle at 30% 30%, rgba(124, 92, 255, 0.4), transparent 55%);
          animation: glowPulse 4s ease-in-out infinite;
          pointer-events: none;
        }
        @keyframes glowPulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.1); }
        }
        .hero-visual {
          position: relative;
          width: 80px;
          height: 80px;
          margin: 0 auto 16px;
          display: grid;
          place-items: center;
        }
        .hero-icon {
          font-size: 36px;
          z-index: 2;
          filter: drop-shadow(0 0 12px rgba(124, 92, 255, 0.8));
          animation: iconSpin 10s linear infinite;
        }
        @keyframes iconSpin {
          from { transform: rotateY(0deg); }
          to { transform: rotateY(360deg); }
        }
        .hero-rings i {
          position: absolute;
          inset: 0;
          border: 2px solid rgba(124, 92, 255, 0.4);
          border-radius: 50%;
          animation: ringPulse 3s ease-out infinite;
        }
        .hero-rings i:nth-child(2) { animation-delay: 1s; border-color: rgba(34, 211, 238, 0.35); }
        .hero-rings i:nth-child(3) { animation-delay: 2s; border-color: rgba(244, 114, 182, 0.3); }
        @keyframes ringPulse {
          0% { transform: scale(0.6); opacity: 1; }
          100% { transform: scale(1.8); opacity: 0; }
        }
        .hero-text {
          text-align: center;
          position: relative;
          z-index: 1;
        }
        .hero-text h2 {
          margin: 0 0 6px;
          font-size: 20px;
          line-height: 1.25;
        }
        .hero-text p {
          margin: 0;
          color: var(--mute);
          font-size: 13px;
        }

        /* Details */
        .details-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 20px;
        }
        @media (max-width: 480px) {
          .details-grid { grid-template-columns: 1fr; }
        }
        .detail-card {
          padding: 14px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid var(--line);
          transition: 0.25s;
        }
        .detail-card:hover {
          border-color: rgba(124, 92, 255, 0.45);
          transform: translateY(-3px);
          box-shadow: 0 10px 28px rgba(124, 92, 255, 0.15);
        }
        .detail-icon {
          font-size: 22px;
          display: block;
          margin-bottom: 6px;
        }
        .detail-card h3 {
          margin: 0 0 4px;
          font-size: 14px;
        }
        .detail-card p {
          margin: 0;
          font-size: 12px;
          color: var(--mute);
          line-height: 1.45;
        }
        .detail-card code {
          font-size: 11px;
          background: rgba(0, 0, 0, 0.35);
          padding: 1px 5px;
          border-radius: 4px;
        }

        .win-cta {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-bottom: 16px;
        }
        .win-cta .btn {
          flex: 1;
          text-align: center;
          min-width: 120px;
        }
        .win-footer {
          text-align: center;
          font-size: 12px;
          color: var(--mute);
          margin: 0;
        }

        /* Dock */
        .float-dock {
          position: absolute;
          bottom: 28px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 22px;
          border-radius: 99px;
          border: 1px solid var(--line);
          background: rgba(14, 15, 26, 0.9);
          color: var(--text);
          font-weight: 600;
          cursor: pointer;
          backdrop-filter: blur(16px);
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.45);
          animation: fadeUp 0.4s both;
          z-index: 12;
        }
        .float-dock:hover {
          border-color: var(--accent);
          box-shadow: 0 14px 48px rgba(124, 92, 255, 0.3);
          transform: translateX(-50%) translateY(-2px);
        }

        @media (max-width: 700px) {
          .float-sidebar { position: fixed; height: 100%; top: 0; left: 0; }
          .float-window { width: min(94vw, 420px); }
        }

        @media (prefers-reduced-motion: reduce) {
          .float-window,
          .hero-card,
          .hero-icon,
          .hero-rings i,
          .particle,
          .hero-glow {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
