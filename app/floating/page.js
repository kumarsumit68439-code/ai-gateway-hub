'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

export default function FloatingWindowPage() {
  const windowRef = useRef(null);
  const [pos, setPos] = useState({ x: 40, y: 100 });
  const [dragging, setDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const [minimized, setMinimized] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    const center = () => {
      if (!windowRef.current) return;
      const w = windowRef.current.offsetWidth || 360;
      const h = 420;
      const leftPad = sidebarOpen && window.innerWidth > 700 ? 280 : 20;
      setPos({
        x: Math.max(leftPad, (window.innerWidth - w) / 2),
        y: Math.max(90, (window.innerHeight - h) / 2 - 20),
      });
    };
    center();
    window.addEventListener('resize', center);
    return () => window.removeEventListener('resize', center);
  }, [sidebarOpen]);

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
      {/* ===== SIDEBAR ===== */}
      <aside className={`float-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sb-head">
          <span className="dot" />
          <b>AI Gateway</b>
        </div>

        <nav className="sb-nav">
          <p className="sb-label">Explore</p>
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/models">Live Models</Link>
          <Link href="/docs">API Docs</Link>
          <Link href="/docs/backend">Backend Docs</Link>
          <Link href="/floating">Floating Window</Link>
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

          {/* BIG CLEAR HIDE BUTTON */}
          <button
            type="button"
            className="sb-hide-btn"
            onClick={() => setSidebarOpen(false)}
          >
            ← Hide Sidebar
          </button>
        </div>
      </aside>

      {/* ===== UNHIDE BUTTON (when sidebar is closed) ===== */}
      {!sidebarOpen && (
        <button
          type="button"
          className="sb-unhide-btn"
          onClick={() => setSidebarOpen(true)}
        >
          ☰ Show Sidebar
        </button>
      )}

      {/* ===== SCENE + FLOATING WINDOW ===== */}
      <div className="float-scene">
        <div className="scene-floor" />
        <div className="scene-particles" aria-hidden="true">
          {[...Array(10)].map((_, i) => (
            <span key={i} className="particle" style={{ '--i': i }} />
          ))}
        </div>

        <div
          ref={windowRef}
          className={`float-window ${dragging ? 'dragging' : ''} ${minimized ? 'minimized' : ''}`}
          style={{
            left: 0,
            top: 0,
            transform: `translate3d(${pos.x}px, ${pos.y}px, 0)`,
          }}
          onMouseDown={startDrag}
          onTouchStart={startDrag}
        >
          <div className="win-titlebar">
            <div className="win-dots">
              <button type="button" className="win-btn close" onClick={() => setMinimized(true)} title="Minimize" />
              <button type="button" className="win-btn min" onClick={() => setMinimized(true)} title="Minimize" />
              <button type="button" className="win-btn max" onClick={() => setMinimized(false)} title="Restore" />
            </div>
            <span className="win-title">AI Gateway Hub · Jilowa</span>
            <div className="win-spacer" />
          </div>

          {!minimized && (
            <div className="win-content">
              {/* ===== WEBSITE DETAILS "VIDEO" SHOWCASE (CSS animated, no external video) ===== */}
              <div className="showcase-3d">
                <div className="showcase-screen">
                  <div className="showcase-scanline" />
                  <div className="showcase-content">
                    <div className="sc-logo">
                      <span className="dot" />
                      <strong>AI Gateway</strong>
                    </div>
                    <h3 className="sc-title">One API key for every AI model</h3>
                    <div className="sc-chips">
                      <span>Groq</span>
                      <span>OpenRouter</span>
                      <span>Gemini</span>
                      <span>OpenAI</span>
                    </div>
                    <div className="sc-lines">
                      <p><code>POST /api/v1/chat/completions</code></p>
                      <p><code>GET  /api/v1/models</code></p>
                      <p><code>sk-gw-…</code> keys · streaming · rate limits</p>
                    </div>
                    <p className="sc-brand">Provided by <span className="grad">Jilowa</span></p>
                  </div>
                  <div className="showcase-badge">▶ Website details</div>
                </div>
              </div>

              {/* Feature cards */}
              <div className="details-grid">
                <div className="detail-card">
                  <span className="detail-icon">🔑</span>
                  <h3>Gateway Keys</h3>
                  <p>Create <code>sk-gw-...</code> keys and call real models through one OpenAI-compatible endpoint.</p>
                </div>
                <div className="detail-card">
                  <span className="detail-icon">📡</span>
                  <h3>Endpoints</h3>
                  <p><code>chat/completions</code> · <code>models</code> · <code>providers</code></p>
                </div>
                <div className="detail-card">
                  <span className="detail-icon">🛡️</span>
                  <h3>Security</h3>
                  <p>Supabase RLS · hashed keys · 30 req/min · 1000/day</p>
                </div>
                <div className="detail-card">
                  <span className="detail-icon">🚀</span>
                  <h3>Streaming</h3>
                  <p>Full streaming support + live free model list</p>
                </div>
              </div>

              <div className="win-cta">
                <Link href="/login" className="btn">Get started</Link>
                <Link href="/docs" className="btn ghost">API Docs</Link>
              </div>

              <p className="win-footer">Provided by <span className="grad">Jilowa</span></p>
            </div>
          )}
        </div>

        {minimized && (
          <button type="button" className="float-dock" onClick={() => setMinimized(false)}>
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

        /* ---------- SIDEBAR ---------- */
        .float-sidebar {
          position: relative;
          width: 260px;
          flex-shrink: 0;
          background: rgba(10, 11, 20, 0.96);
          border-right: 1px solid var(--line);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          display: flex;
          flex-direction: column;
          z-index: 30;
          transition: transform 0.35s cubic-bezier(0.2, 0.8, 0.2, 1), width 0.35s, opacity 0.3s;
        }
        .float-sidebar.closed {
          transform: translateX(-105%);
          width: 0;
          opacity: 0;
          pointer-events: none;
          border: none;
        }
        .sb-head {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 18px 16px;
          border-bottom: 1px solid var(--line);
          font-family: var(--f-head), sans-serif;
          font-weight: 700;
          font-size: 16px;
        }
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
          background: rgba(255, 255, 255, 0.08);
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
          padding: 14px 14px 18px;
          border-top: 1px solid var(--line);
          font-size: 13px;
          color: var(--mute);
        }
        .sb-foot p { margin: 0 0 2px; }
        .sb-foot small { display: block; margin-bottom: 14px; }

        /* BIG HIDE BUTTON */
        .sb-hide-btn {
          display: block;
          width: 100%;
          padding: 12px 14px;
          border-radius: 11px;
          border: 1px solid rgba(251, 113, 133, 0.45);
          background: rgba(251, 113, 133, 0.12);
          color: #fb7185;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: 0.2s;
          text-align: center;
        }
        .sb-hide-btn:hover {
          background: rgba(251, 113, 133, 0.25);
          border-color: #fb7185;
          transform: translateY(-1px);
        }
        .sb-hide-btn:active {
          transform: none;
        }

        /* UNHIDE BUTTON */
        .sb-unhide-btn {
          position: fixed;
          top: 70px;
          left: 12px;
          z-index: 40;
          padding: 12px 18px;
          border-radius: 12px;
          border: 1px solid rgba(124, 92, 255, 0.5);
          background: rgba(14, 15, 26, 0.95);
          color: #fff;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          box-shadow: 0 8px 28px rgba(0, 0, 0, 0.5), 0 0 20px rgba(124, 92, 255, 0.2);
          transition: 0.25s;
          animation: fadeUp 0.35s both;
        }
        .sb-unhide-btn:hover {
          border-color: var(--accent);
          box-shadow: 0 10px 36px rgba(124, 92, 255, 0.4);
          transform: translateY(-2px);
        }

        /* ---------- SCENE ---------- */
        .float-scene {
          flex: 1;
          position: relative;
          perspective: 1400px;
          overflow: hidden;
          min-height: calc(100vh - 60px);
        }
        .scene-floor {
          position: absolute;
          inset: 45% -20% -30%;
          background: radial-gradient(ellipse at center, rgba(124, 92, 255, 0.14) 0%, transparent 70%);
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
          left: calc(10% + (var(--i) * 8%));
          top: calc(18% + (var(--i) * 6%));
          animation: particleFloat 8s ease-in-out infinite;
          animation-delay: calc(var(--i) * -0.55s);
          box-shadow: 0 0 10px var(--accent2);
        }
        @keyframes particleFloat {
          0%, 100% { transform: translateY(0) scale(1); opacity: 0.25; }
          50% { transform: translateY(-36px) scale(1.35); opacity: 0.55; }
        }

        /* ---------- FLOATING WINDOW ---------- */
        .float-window {
          position: absolute;
          width: min(480px, 92vw);
          transform-style: preserve-3d;
          animation: windowFloat 6s ease-in-out infinite;
          cursor: grab;
          z-index: 10;
          border-radius: 18px;
          background: rgba(16, 18, 32, 0.9);
          border: 1px solid rgba(255, 255, 255, 0.12);
          box-shadow:
            0 25px 80px rgba(0, 0, 0, 0.55),
            0 0 0 1px rgba(124, 92, 255, 0.18),
            inset 0 1px 0 rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(24px) saturate(1.3);
          -webkit-backdrop-filter: blur(24px) saturate(1.3);
          overflow: hidden;
        }
        .float-window.dragging {
          cursor: grabbing;
          animation: none;
          box-shadow: 0 40px 120px rgba(0, 0, 0, 0.65), 0 0 40px rgba(124, 92, 255, 0.3);
        }
        .float-window.minimized {
          width: 260px;
          animation: none;
        }
        @keyframes windowFloat {
          0%, 100% { transform: translate3d(var(--x, 0), var(--y, 0), 0) translateY(0); }
          50% { transform: translate3d(var(--x, 0), var(--y, 0), 0) translateY(-12px); }
        }

        .win-titlebar {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 11px 14px;
          background: rgba(0, 0, 0, 0.4);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          user-select: none;
        }
        .win-dots { display: flex; gap: 7px; }
        .win-btn {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          border: none;
          cursor: pointer;
          padding: 0;
        }
        .win-btn.close { background: #ff5f57; }
        .win-btn.min { background: #febc2e; }
        .win-btn.max { background: #28c840; }
        .win-title {
          flex: 1;
          text-align: center;
          font-size: 13px;
          color: var(--mute);
          font-weight: 500;
        }
        .win-spacer { width: 40px; }

        .win-content {
          padding: 16px;
          max-height: min(70vh, 640px);
          overflow-y: auto;
          cursor: default;
        }

        /* ---------- WEBSITE DETAILS SHOWCASE (3D animated panel) ---------- */
        .showcase-3d {
          perspective: 900px;
          margin-bottom: 16px;
        }
        .showcase-screen {
          position: relative;
          border-radius: 14px;
          overflow: hidden;
          border: 1px solid rgba(124, 92, 255, 0.45);
          background: linear-gradient(160deg, #0d0f1c 0%, #12152a 50%, #0a0c18 100%);
          min-height: 200px;
          transform-style: preserve-3d;
          animation: screenTilt 7s ease-in-out infinite;
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.45), 0 0 30px rgba(124, 92, 255, 0.15);
        }
        @keyframes screenTilt {
          0%, 100% { transform: rotateY(-5deg) rotateX(3deg); }
          50% { transform: rotateY(5deg) rotateX(-2deg); }
        }
        .showcase-scanline {
          position: absolute;
          inset: 0;
          background: repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(0, 0, 0, 0.12) 2px,
            rgba(0, 0, 0, 0.12) 4px
          );
          pointer-events: none;
          z-index: 2;
          opacity: 0.4;
        }
        .showcase-content {
          position: relative;
          z-index: 1;
          padding: 22px 18px 28px;
          text-align: center;
        }
        .sc-logo {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
          font-family: var(--f-head), sans-serif;
          font-size: 15px;
        }
        .sc-title {
          margin: 0 0 12px;
          font-size: 18px;
          line-height: 1.3;
          background: linear-gradient(90deg, #c4b5fd, #22d3ee);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }
        .sc-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          justify-content: center;
          margin-bottom: 14px;
        }
        .sc-chips span {
          padding: 4px 10px;
          border-radius: 99px;
          font-size: 11px;
          background: rgba(124, 92, 255, 0.18);
          border: 1px solid rgba(124, 92, 255, 0.35);
          color: #c4b5fd;
        }
        .sc-lines {
          margin: 0 0 12px;
          font-size: 12px;
          color: var(--mute);
          line-height: 1.6;
        }
        .sc-lines code {
          font-size: 11px;
          background: rgba(0, 0, 0, 0.4);
          padding: 2px 6px;
          border-radius: 4px;
          color: #a5f3fc;
        }
        .sc-brand {
          margin: 0;
          font-size: 12px;
          color: var(--mute);
        }
        .showcase-badge {
          position: absolute;
          bottom: 10px;
          left: 10px;
          z-index: 3;
          font-size: 11px;
          font-weight: 600;
          padding: 4px 10px;
          border-radius: 99px;
          background: rgba(124, 92, 255, 0.8);
          color: #fff;
        }

        /* Details grid */
        .details-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-bottom: 16px;
        }
        @media (max-width: 420px) {
          .details-grid { grid-template-columns: 1fr; }
        }
        .detail-card {
          padding: 12px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid var(--line);
          transition: 0.25s;
        }
        .detail-card:hover {
          border-color: rgba(124, 92, 255, 0.45);
          transform: translateY(-2px);
        }
        .detail-icon { font-size: 18px; display: block; margin-bottom: 4px; }
        .detail-card h3 { margin: 0 0 4px; font-size: 13px; }
        .detail-card p {
          margin: 0;
          font-size: 11px;
          color: var(--mute);
          line-height: 1.45;
        }
        .detail-card code {
          font-size: 10px;
          background: rgba(0, 0, 0, 0.35);
          padding: 1px 4px;
          border-radius: 3px;
        }

        .win-cta {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-bottom: 12px;
        }
        .win-cta .btn {
          flex: 1;
          text-align: center;
          min-width: 110px;
        }
        .win-footer {
          text-align: center;
          font-size: 12px;
          color: var(--mute);
          margin: 0;
        }

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
          background: rgba(14, 15, 26, 0.92);
          color: var(--text);
          font-weight: 600;
          cursor: pointer;
          backdrop-filter: blur(16px);
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.45);
          z-index: 12;
        }
        .float-dock:hover {
          border-color: var(--accent);
          transform: translateX(-50%) translateY(-2px);
        }

        /* Mobile: sidebar becomes full overlay */
        @media (max-width: 700px) {
          .float-sidebar {
            position: fixed;
            top: 0;
            left: 0;
            bottom: 0;
            height: 100%;
            width: min(280px, 85vw);
            box-shadow: 20px 0 60px rgba(0, 0, 0, 0.5);
          }
          .float-sidebar.closed {
            transform: translateX(-110%);
            width: min(280px, 85vw);
          }
          .float-window {
            width: min(94vw, 400px);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .float-window,
          .showcase-screen,
          .particle {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
