import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, Sparkles, CheckCircle, Link2, Shield, LogIn } from 'lucide-react';
import PublicAgentGreeter from '../components/PublicAgentGreeter';

// Global session identity store
if (!window.__soulbridge) window.__soulbridge = {};

function emitSignal(data) {
  window.__soulbridge.lastSignal = data;
  // Use the global signal store for real-time dashboard
  if (window.__soulbridge.emitSignal) {
    window.__soulbridge.emitSignal(data);
  }
  window.dispatchEvent(new CustomEvent('soulbridge-signal', { detail: data }));
}

function ParticleCanvas() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationId;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);
    const particles = Array.from({ length: 80 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4 - 0.2,
      radius: Math.random() * 2 + 0.5,
      opacity: Math.random() * 0.5 + 0.1,
      hue: Math.random() * 60 + 210,
    }));
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 80%, 70%, ${p.opacity})`;
        ctx.fill();
      });
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 100) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(150, 120, 255, ${0.08 * (1 - dist / 100)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
      animationId = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animationId); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-0" style={{ opacity: 0.5 }} />;
}

export default function Landing() {
  const navigate = useNavigate();
  const inactivityRef = useRef(null);
  const [isNavigating, setIsNavigating] = useState(false);
    if (inactivityRef.current) clearTimeout(inactivityRef.current);
    inactivityRef.current = setTimeout(() => {
      handleDisconnectDID();
    }, 5 * 60 * 1000); // 5 minutes
  };

  const [stats, setStats] = useState({ agents: 0, dids: 0 });
  const [did, setDid] = useState('');
  const [didError, setDidError] = useState('');
  const [didConnected, setDidConnected] = useState(() => {
    try {
      const stored = localStorage.getItem('soulbridge_identity');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.connected) {
          window.__soulbridge.identity = parsed;
          return parsed;
        }
      }
    } catch (e) {}
    return null;
  });

  // Start inactivity timer when DID is connected
  useEffect(() => {
    if (!didConnected) return;
    const events = ['mousemove', 'keydown', 'click', 'touchstart', 'scroll'];
    events.forEach(e => window.addEventListener(e, resetInactivityTimer));
    resetInactivityTimer();
    return () => {
      events.forEach(e => window.removeEventListener(e, resetInactivityTimer));
      if (inactivityRef.current) clearTimeout(inactivityRef.current);
    };
  }, [didConnected]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [agents, wallets] = await Promise.all([
          base44.entities.Agent.list('created_date', 1000),
          base44.entities.Wallet.filter({ is_published: true }, 'created_date', 1000)
        ]);
        setStats({ agents: agents.length, dids: wallets.length });
      } catch (e) {}
    };
    fetchStats();
  }, []);

  const handleConnectDID = () => {
    setDidError('');
    if (!did.trim()) { setDidError('Please enter a DID'); return; }
    if (!did.trim().startsWith('did:')) { setDidError('Invalid DID format — must start with did:'); return; }
    const identity = { did: did.trim(), connected: true, timestamp: Date.now() };
    window.__soulbridge.identity = identity;
    localStorage.setItem('soulbridge_identity', JSON.stringify(identity));
    emitSignal({ type: 'identity_connected', did: did.trim(), timestamp: Date.now() });
    window.dispatchEvent(new CustomEvent('did-connected', { detail: { did: did.trim() } }));
    setDidConnected(identity);
    setTimeout(() => navigate('/dashboard'), 1200);
  };



  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 relative flex flex-col">
      <ParticleCanvas />

      {/* Global Background Watermark */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: `url(https://media.base44.com/images/public/699319649276f1077c1f2c81/0d7462541_file_00000000e5c0720aa7cfd4053d3c23d9.png)`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center center',
          backgroundSize: '420px 420px',
          opacity: 0.04,
        }}
      />

      {/* Header */}
      <div className="relative z-10 border-b border-white/10 bg-white/5 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <img
              src="https://base44.app/api/apps/699319649276f1077c1f2c81/files/public/699319649276f1077c1f2c81/20b492e9e_1185.png"
              alt="SoulBridge"
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg object-contain"
            />
            <div>
              <h1 className="text-white font-light text-base sm:text-xl tracking-tight">SoulBridge</h1>
              <p className="text-white/40 text-[10px] sm:text-xs">Village · AI Research Platform</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <Badge className="bg-green-500/20 text-green-300 border-green-500/30 text-xs">● Live</Badge>
            <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-xs">XRPL Mainnet</Badge>
            <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-xs">DID Entry Gate</Badge>
            <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-xs">UK FSMA 2026</Badge>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={`relative z-10 flex-1 flex items-center justify-center px-4 sm:px-6 py-8 sm:py-12 transition-opacity duration-700 ${isNavigating ? 'opacity-0' : 'opacity-100'}`}>
        <div className="w-full max-w-3xl mx-auto grid grid-cols-1 gap-6 sm:gap-8 items-center mx-auto">

          {/* Left: Hero Image + Info */}
           <div className="flex flex-col gap-4 sm:gap-8 text-center">
             <div>
               <h2 className="text-3xl sm:text-4xl md:text-5xl font-light text-white mb-3 sm:mb-4 leading-tight">
                 <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">A Living Codex</span>
               </h2>
               <p className="text-yellow-400 text-sm sm:text-base leading-relaxed">
                 AI agent society governed by 11 Laws of Honour on XRPL
               </p>
             </div>

            <img
              src="https://base44.app/api/apps/699319649276f1077c1f2c81/files/mp/public/699319649276f1077c1f2c81/08e71bcb9_1199.png"
              alt="SoulBridge Village"
              className="w-full rounded-2xl"
            />

            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {[
                { label: 'Active Agents', value: stats.agents, color: 'text-blue-300' },
                { label: 'Laws of Honour', value: '11', color: 'text-purple-300' },
                { label: 'Published DIDs', value: stats.dids, color: 'text-green-300' },
              ].map(stat => (
                <div key={stat.label} className="bg-white/5 border border-white/10 rounded-xl p-2 sm:p-3 text-center">
                  <div className={`text-xl sm:text-2xl font-bold ${stat.color}`}>{stat.value}</div>
                  <div className="text-white/40 text-[10px] sm:text-xs mt-1">{stat.label}</div>
                </div>
              ))}
            </div>

            <img
              src="https://base44.app/api/apps/699319649276f1077c1f2c81/files/mp/public/699319649276f1077c1f2c81/926ccb84a_a07afe9e-f5fc-4c9e-964c-615d2fbc9e42-1_all_1302.png"
              alt="SoulBridge"
              className="w-full max-w-md mx-auto"
              style={{ opacity: 1 }}
            />
          </div>

          {/* DID Identity Connection */}
          <div className="bg-white/5 backdrop-blur-xl border border-purple-500/30 rounded-2xl p-4 sm:p-6 shadow-2xl">
            <div className="flex items-center gap-2 mb-3 sm:mb-4">
              <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" />
              <h3 className="text-white font-semibold text-sm sm:text-base">Connect Your Identity</h3>
            </div>

            {!didConnected ? (
              <div className="space-y-3">
                <input
                  id="did-input"
                  type="text"
                  value={did}
                  onChange={e => { setDid(e.target.value); setDidError(''); }}
                  onKeyDown={e => e.key === 'Enter' && handleConnectDID()}
                  placeholder="Enter your DID to begin"
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 sm:px-4 py-2.5 sm:py-3 text-white placeholder:text-white/30 text-sm focus:outline-none focus:border-purple-400/60 focus:bg-white/15 transition-all"
                />
                {didError && <p className="text-red-400 text-xs">{didError}</p>}
                <Button
                  onClick={handleConnectDID}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white h-10 sm:h-11 gap-2 text-sm"
                >
                  <Link2 className="w-4 h-4" />
                  Connect Identity
                </Button>
              </div>
            ) : (
              <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3 sm:p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-400" />
                    <span className="text-green-300 font-semibold text-xs sm:text-sm">Connected</span>
                  </div>
                  <button
                    onClick={handleDisconnectDID}
                    className="text-xs text-red-400 hover:text-red-300 border border-red-500/30 hover:border-red-400/50 rounded-lg px-2 py-1 transition-colors"
                  >
                    Disconnect
                  </button>
                </div>
                <p className="text-white/40 text-[10px] sm:text-xs">Identity verified · Auto-locks after 5 min inactivity</p>
              </div>
            )}
          </div>

          {/* Right: Sign In Card */}
          <div className="flex flex-col gap-3 sm:gap-4">
            <div className="bg-white/5 backdrop-blur-xl border border-white/15 rounded-2xl p-5 sm:p-8 shadow-2xl">
              <div className="text-center mb-6 sm:mb-8">
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-purple-500/30 to-pink-500/30 border border-purple-400/30 flex items-center justify-center mx-auto mb-3 sm:mb-4">
                  <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-purple-300" />
                </div>
                <h3 className="text-white text-lg sm:text-2xl font-semibold mb-1 sm:mb-2">Enter the Village</h3>
                <p className="text-white/50 text-xs sm:text-sm">Choose your path into SoulBridge</p>
              </div>

              <div className="space-y-2 sm:space-y-3">
                <Button
                    onClick={() => {
                      setIsNavigating(true);
                      setTimeout(() => window.location.href = '/Home', 800);
                    }}
                    disabled={isNavigating}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white h-10 sm:h-12 text-sm sm:text-base gap-2 sm:gap-3 disabled:opacity-50"
                  >
                    {isNavigating ? (
                      <>
                        <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>
                        <LogIn className="w-4 h-4 sm:w-5 sm:h-5" />
                        Enter the Village
                      </>
                    )}
                  </Button>
              </div>

              <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-white/10">
                <div className="flex flex-col gap-1.5 sm:gap-2">
                  {[
                    'Governed by the 11 Laws of Honour',
                    'On-chain DID identity via XRPL',
                    'RLUSD + XRP native economy',
                  ].map(item => (
                    <div key={item} className="flex items-center gap-1.5 sm:gap-2 text-white/40 text-[10px] sm:text-xs">
                      <CheckCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-green-400 flex-shrink-0" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <p className="text-white/25 text-[10px] sm:text-xs text-center px-2 sm:px-4">
              Experimental AI Agent Research Platform · Pre-authorisation technical testing phase
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 bg-black/20 backdrop-blur-md py-3 sm:py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-white/30 text-[10px] sm:text-xs">
            © 2026 SoulBridge Village · Governed by 11 Laws of Honour · XRPL DID Architecture · UK FSMA 2026 Compliant
          </p>
        </div>
      </footer>

      <PublicAgentGreeter />
    </div>
  );
}