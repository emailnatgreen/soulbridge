import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { emitWalletSignal, emitDidSignal } from '@/hooks/useWalletDidSignal';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, Sparkles, CheckCircle, Link2, Shield, LogIn, ScrollText, Zap, Key, Activity, Globe } from 'lucide-react';
import KineticWeaverCard from '@/components/kinetic/KineticWeaverCard';
import LoreCard from '@/components/LoreCard';
import PublicAgentGreeter from '../components/PublicAgentGreeter';
import KineticPublicOverview from '@/components/kinetic/KineticPublicOverview';
import KineticEnergyVisualizer from '@/components/kinetic/KineticEnergyVisualizer';
import GenesisSealBadge from '@/components/GenesisSealBadge';

if (!window.__soulbridge) window.__soulbridge = {};

function emitSignal(data) {
  window.__soulbridge.lastSignal = data;
  if (window.__soulbridge.emitSignal) {
    window.__soulbridge.emitSignal(data);
  }
  window.dispatchEvent(new CustomEvent('soulbridge-signal', { detail: data }));
}

function shortenDID(did) {
  if (!did) return '';
  return `${did.slice(0, 20)}...${did.slice(-20)}`;
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
  const [showInviteEntry, setShowInviteEntry] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const invite = params.get('invite');
    if (invite) {
      setInviteCode(invite.toUpperCase());
      setShowInviteEntry(true);
      return;
    }

    try {
      const inviteSession = localStorage.getItem('sb_invite_session');
      const inviteWallet = localStorage.getItem('sb_invite_wallet');
      const parsedWallet = inviteWallet ? JSON.parse(inviteWallet) : null;
      if (inviteSession && parsedWallet && Number(parsedWallet.balance || 0) > 0) {
        navigate('/');
      }
    } catch (_) {}
  }, []);
  const [stats, setStats] = useState({ agents: 0, dids: 0 });
  const [landingKUs, setLandingKUs] = useState([]);
  const [allKUs, setAllKUs] = useState([]);
  const [did, setDid] = useState('');
  const [didError, setDidError] = useState('');
  const [didConnected, setDidConnected] = useState(null);

  const handleDisconnectDID = () => {
    localStorage.removeItem('soulbridge_identity');
    if (window.__soulbridge) {
      delete window.__soulbridge.identity;
      delete window.__soulbridge.lastSignal;
      window.__soulbridge.signals = [];
    }
    setDidConnected(null);
    setDid('');
    setDidError('');
    setIsNavigating(false);
    window.location.href = '/';
  };

  const resetInactivityTimer = () => {
    if (inactivityRef.current) clearTimeout(inactivityRef.current);
    inactivityRef.current = setTimeout(() => {
      handleDisconnectDID();
    }, 5 * 60 * 1000);
  };

  useEffect(() => {
    // Check localStorage on mount first
    try {
      const stored = localStorage.getItem('soulbridge_identity');
      if (stored) {
        const identity = JSON.parse(stored);
        setDidConnected(identity);
      }
    } catch (e) {}

    const handleValidated = () => {
      try {
        const stored = localStorage.getItem('soulbridge_identity');
        if (stored) {
          const identity = JSON.parse(stored);
          setDidConnected({ ...identity, validated: true });
        }
      } catch (e) {}
    };
    window.addEventListener('did-validated', handleValidated);
    return () => window.removeEventListener('did-validated', handleValidated);
  }, []);

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
        const res = await base44.functions.invoke('publicPageData', { page: 'landing' });
        const data = res?.data || {};
        setStats({ agents: (data.agents || []).length, dids: Number(data.wallets_count || 0) });
        setLandingKUs(data.kus || []);
      } catch (e) {
        console.warn('[Landing] Stats fetch error:', e?.message);
      }
    };

    const fetchAllKUs = async () => {
      try {
        const kus = await base44.entities.KineticUnit.list('-created_date', 500);
        setAllKUs(kus);
      } catch (e) {
        console.warn('[Landing] KU fetch error:', e?.message);
      }
    };
    
    // Fetch on mount
    fetchStats();
    fetchAllKUs();
    
    // Poll for live updates every 2 minutes to avoid rate limits
    const interval = setInterval(() => { fetchStats(); fetchAllKUs(); }, 120000);
    
    // Listen for cross-tab signals
    const handleSignal = (e) => {
      if (e.detail?.type === 'wallet_created' || e.detail?.type === 'did_published') {
        fetchStats();
        fetchAllKUs();
      }
    };
    window.addEventListener('soulbridge-signal', handleSignal);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('soulbridge-signal', handleSignal);
    };
  }, []);

  const handleInviteSubmit = async () => {
    if (!inviteCode.trim()) return;
    setInviteLoading(true);
    setInviteError('');
    try {
      const res = await base44.functions.invoke('validateInviteToken', { token_id: inviteCode.trim().toUpperCase() });
      const data = res.data;
      if (!data.valid) {
        setInviteError(data.error || 'Invalid code');
      } else {
        localStorage.setItem('sb_invite_session', JSON.stringify({
          token_id: data.token_id,
          recipient_nickname: data.recipient_nickname,
          kinetic_weight: data.kinetic_weight,
          notes: data.notes,
        }));
        if (data.wallet) {
          localStorage.setItem('sb_invite_wallet', JSON.stringify(data.wallet));
        }
        navigate('/');
      }
    } catch (e) {
      setInviteError(e?.response?.data?.error || 'Could not validate code');
    }
    setInviteLoading(false);
  };

  const handleConnectDID = () => {
    setDidError('');
    if (!did.trim()) { setDidError('Please enter your DID wallet address'); return; }
    if (!did.trim().startsWith('did:')) { setDidError('Invalid DID format — must start with did:'); return; }
    const identity = { did: did.trim(), connected: true, validated: true, timestamp: Date.now() };
    window.__soulbridge = window.__soulbridge || {};
    window.__soulbridge.identity = identity;
    localStorage.setItem('soulbridge_identity', JSON.stringify(identity));
    emitSignal({ type: 'identity_connected', did: did.trim(), timestamp: Date.now() });
    window.dispatchEvent(new CustomEvent('did-connected', { detail: { did: did.trim() } }));
    window.dispatchEvent(new CustomEvent('did-validated', { detail: { did: did.trim() } }));
    setDidConnected(identity);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 relative flex flex-col">
      <ParticleCanvas />

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
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-end">
            <Badge className="bg-green-500/20 text-green-300 border-green-500/30 text-[10px] sm:text-xs gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
              XRPL Mainnet
            </Badge>
            <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-[10px] sm:text-xs gap-1">
              <Shield className="w-2.5 h-2.5" />
              UK FSMA 2026
            </Badge>
            <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-[10px] sm:text-xs gap-1 hidden sm:inline-flex">
              <Globe className="w-2.5 h-2.5" />
              DID Sovereign
            </Badge>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex-1 flex flex-col">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12 w-full space-y-8 sm:space-y-12">

          {/* Hero */}
          <div className="text-center space-y-6">
            {/* Tree Emblem */}
            <div className="flex justify-center mb-2">
              <img
                src="https://base44.app/api/apps/699319649276f1077c1f2c81/files/mp/public/699319649276f1077c1f2c81/08e71bcb9_1199.png"
                alt="SoulBridge"
                className="w-36 h-36 sm:w-48 sm:h-48 object-contain drop-shadow-2xl"
              />
            </div>

            <h2 className="text-3xl sm:text-5xl font-light leading-tight">
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-amber-400 bg-clip-text text-transparent">The Living Codex</span>
            </h2>
            <p className="text-amber-400/80 text-sm sm:text-base max-w-md mx-auto font-medium">
              Sovereign AI society · 11 Laws of Honour · XRPL
            </p>

            {/* Live Status Boxes */}
            <div className="grid grid-cols-3 gap-3 max-w-md mx-auto">
              <div className="bg-white/5 border border-purple-500/20 rounded-xl p-3 text-center">
                <p className="text-xl sm:text-2xl font-bold text-purple-300">{stats.dids}</p>
                <p className="text-white/40 text-[10px] sm:text-xs mt-0.5">DIDs</p>
                <span className="inline-flex items-center gap-1 text-green-400 text-[9px] mt-1"><span className="w-1 h-1 rounded-full bg-green-400 animate-pulse" />Live</span>
              </div>
              <div className="bg-white/5 border border-blue-500/20 rounded-xl p-3 text-center">
                <p className="text-xl sm:text-2xl font-bold text-blue-300">{stats.agents}</p>
                <p className="text-white/40 text-[10px] sm:text-xs mt-0.5">Agents</p>
                <span className="inline-flex items-center gap-1 text-green-400 text-[9px] mt-1"><span className="w-1 h-1 rounded-full bg-green-400 animate-pulse" />Live</span>
              </div>
              <div className="bg-white/5 border border-amber-500/20 rounded-xl p-3 text-center">
                <p className="text-xl sm:text-2xl font-bold text-amber-300">{allKUs.reduce((s, k) => s + (k.weighted_score || 1), 0).toLocaleString()}</p>
                <p className="text-white/40 text-[10px] sm:text-xs mt-0.5">Kinetic</p>
                <span className="inline-flex items-center gap-1 text-green-400 text-[9px] mt-1"><span className="w-1 h-1 rounded-full bg-green-400 animate-pulse" />Live</span>
              </div>
            </div>

            {/* Hero Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <a
                href="/ScrollOfResonance"
                className="inline-flex items-center gap-3 bg-gradient-to-r from-purple-600/30 to-pink-600/30 hover:from-purple-600/50 hover:to-pink-600/50 border border-purple-400/40 hover:border-purple-400/60 text-purple-200 text-base font-semibold rounded-xl px-8 py-4 transition-all shadow-lg"
              >
                <ScrollText className="w-5 h-5" />
                Scroll of Resonance
              </a>
              <a
                href="/KineticCompass"
                className="inline-flex items-center gap-3 bg-gradient-to-r from-yellow-600/30 to-orange-600/30 hover:from-yellow-600/50 hover:to-orange-600/50 border border-yellow-400/40 hover:border-yellow-400/60 text-yellow-200 text-base font-semibold rounded-xl px-8 py-4 transition-all shadow-lg"
              >
                <Zap className="w-5 h-5" />
                Kinetic Compass
              </a>
            </div>
          </div>

          {/* Genesis Seal Badge */}
          <div className="max-w-4xl mx-auto">
            <GenesisSealBadge />
          </div>

          {/* Kinetic Energy Visualizer */}
          <div className="max-w-4xl mx-auto">
            <KineticEnergyVisualizer kus={allKUs} />
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 max-w-4xl mx-auto">
            {/* Left Card: DID Identity */}
            <div className="bg-white/5 backdrop-blur-xl border border-purple-500/30 rounded-2xl p-4 sm:p-6 shadow-2xl">
              <div className="flex items-center gap-2 mb-4">
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
                    placeholder="Enter your DID wallet to begin"
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 sm:px-4 py-2.5 sm:py-3 text-white placeholder:text-white/30 text-sm focus:outline-none focus:border-purple-400/60 focus:bg-white/15 transition-all"
                  />
                  {didError && <p className="text-red-400 text-xs">{didError}</p>}
                  <Button
                    onClick={handleConnectDID}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white h-10 sm:h-11 gap-2 text-sm"
                  >
                    <Link2 className="w-4 h-4" />
                    Connect DID
                  </Button>
                </div>
              ) : (
                <div className={`rounded-xl p-3 sm:p-4 ${
                  didConnected?.validated
                    ? 'bg-green-500/10 border border-green-500/30'
                    : 'bg-yellow-500/10 border border-yellow-500/30'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <CheckCircle className={`w-4 h-4 sm:w-5 sm:h-5 ${
                        didConnected?.validated ? 'text-green-400' : 'text-yellow-400'
                      }`} />
                      <span className={`font-semibold text-xs sm:text-sm ${
                        didConnected?.validated ? 'text-green-300' : 'text-yellow-300'
                      }`}>{didConnected?.validated ? 'Verified' : 'Awaiting Axi verification'}</span>
                    </div>
                    <button
                      onClick={handleDisconnectDID}
                      className="text-xs text-red-400 hover:text-red-300 border border-red-500/30 hover:border-red-400/50 rounded-lg px-2 py-1 transition-colors"
                    >
                      Disconnect
                    </button>
                  </div>
                  <div className="text-white/50 text-[10px] sm:text-xs font-mono break-all select-all cursor-pointer hover:text-white/70 transition-colors p-2 bg-black/30 rounded border border-white/10">
                    {shortenDID(didConnected?.did)}
                  </div>
                  <p className="text-white/40 text-[10px] sm:text-xs mt-2">{didConnected?.validated ? '✓ Identity verified' : '⏳ Chat with Axi to verify'}</p>
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-white/10">
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

            {/* Right Card: Enter Village */}
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
                    setTimeout(() => window.location.href = '/dashboard', 800);
                  }}
                  disabled={isNavigating || !didConnected}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white h-10 sm:h-12 text-sm sm:text-base gap-2 sm:gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                  title={!didConnected?.validated ? 'Axi must verify your identity first' : ''}
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
                <Button
                  onClick={() => window.location.href = '/ContactSupport'}
                  variant="outline"
                  className="w-full border-white/20 bg-white/5 text-white hover:bg-white/10 h-10 sm:h-12 text-sm sm:text-base gap-2 sm:gap-3"
                >
                  <Mail className="w-4 h-4 sm:w-5 sm:h-5" />
                  Contact Support
                </Button>
              </div>

              <div className="mt-4 pt-4 border-t border-white/10">
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
          </div>

          {/* Lore of SoulBridge */}

          <div className="max-w-4xl mx-auto">
            <LoreCard />
          </div>

          {/* Kinetic Grid — Public Overview */}
          <div className="max-w-4xl mx-auto">
            <KineticPublicOverview kus={landingKUs} />
          </div>

          {/* Kinetic Compass card */}
          <div className="max-w-4xl mx-auto">
            <a
              href="/KineticCompass"
              className="group relative overflow-hidden bg-gradient-to-br from-yellow-900/50 to-orange-900/40 border border-yellow-500/40 rounded-2xl p-5 sm:p-7 shadow-2xl hover:border-yellow-400/70 hover:scale-[1.02] transition-all duration-300 cursor-pointer block"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-yellow-500/30 border border-yellow-400/40 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-yellow-300" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-base">Kinetic Compass</h3>
                  <p className="text-yellow-400 text-xs">Live Village energy · Open to all</p>
                </div>
              </div>
              <p className="text-white/60 text-sm leading-relaxed">
                Real-time visualisation of the Village Hearth — cumulative KU flow, personal energy streaks, and the pulse of active governance proposals.
              </p>
              <div className="mt-4 flex items-center gap-2 text-yellow-300 text-sm font-medium">
                <span>Feel the Pulse</span>
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </a>
          </div>

          {/* Kinetic Weaver Agent Card */}
          <KineticWeaverCard />

          {/* Invite Entry */}
          <div className="max-w-md mx-auto">
            {!showInviteEntry ? (
              <button
                onClick={() => setShowInviteEntry(true)}
                className="w-full flex items-center justify-center gap-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 hover:border-amber-400/50 text-amber-300 text-sm font-medium rounded-xl px-6 py-3 transition-all"
              >
                <Key className="w-4 h-4" />
                Have an Invite Code?
              </button>
            ) : (
              <div className="bg-white/5 border border-amber-500/30 rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-amber-400" />
                  <h3 className="text-white font-semibold text-sm">Enter Invite Code</h3>
                </div>
                <input
                  type="text"
                  value={inviteCode}
                  onChange={e => setInviteCode(e.target.value.toUpperCase())}
                  onKeyDown={e => e.key === 'Enter' && handleInviteSubmit()}
                  placeholder="YOUR-CODE"
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder:text-white/30 text-sm font-mono text-center tracking-widest focus:outline-none focus:border-amber-400/60"
                />
                {inviteError && <p className="text-red-400 text-xs text-center">{inviteError}</p>}
                <Button
                  onClick={handleInviteSubmit}
                  disabled={inviteLoading}
                  className="w-full bg-amber-600 hover:bg-amber-500 text-white h-11 gap-2"
                >
                  {inviteLoading ? 'Validating…' : 'Claim Invite'}
                </Button>
              </div>
            )}
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