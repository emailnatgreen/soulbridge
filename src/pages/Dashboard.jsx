import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, CheckCircle, Radio, Sparkles, LogOut } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";

// Global signal emitter — attach to window so anything can call it
if (typeof window !== 'undefined') {
  window.__soulbridge = window.__soulbridge || {};
  window.__soulbridge.signals = window.__soulbridge.signals || [];
  window.__soulbridge.emitSignal = function(signal) {
    const entry = { ...signal, id: Date.now(), time: new Date().toLocaleTimeString() };
    window.__soulbridge.signals.unshift(entry);
    window.dispatchEvent(new Event('signal-update'));
  };
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [identity, setIdentity] = useState(null);
  const [signals, setSignals] = useState([]);

  // Listen for real-time signal updates
  useEffect(() => {
    const loadSignals = () => setSignals([...( window.__soulbridge?.signals || [])]);
    loadSignals();
    window.addEventListener('signal-update', loadSignals);
    return () => window.removeEventListener('signal-update', loadSignals);
  }, []);

  const didEmitStartup = useRef(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('soulbridge_identity');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.connected) {
          setIdentity(parsed);
          if (!didEmitStartup.current) {
            didEmitStartup.current = true;
            window.__soulbridge.emitSignal({ type: 'identity_connected' });
            window.__soulbridge.emitSignal({ type: 'session_started' });
            window.__soulbridge.emitSignal({ type: 'axi_activated' });
          }
          return;
        }
      }
    } catch (e) {}
    navigate('/');
  }, []);

  const handleDisconnect = () => {
    localStorage.removeItem('soulbridge_identity');
    localStorage.removeItem('sb_public_conv_id');
    if (window.__soulbridge) delete window.__soulbridge.identity;
    navigate('/');
  };

  const shortDid = identity?.did
    ? identity.did.length > 40
      ? identity.did.slice(0, 20) + '...' + identity.did.slice(-12)
      : identity.did
    : '';

  if (!identity) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 text-white">
      {/* Header */}
      <div className="border-b border-white/10 bg-white/5 backdrop-blur-xl px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src="https://base44.app/api/apps/699319649276f1077c1f2c81/files/public/699319649276f1077c1f2c81/20b492e9e_1185.png"
            alt="SoulBridge"
            className="w-9 h-9 rounded-lg object-contain"
          />
          <div>
            <h1 className="text-white font-semibold text-lg leading-tight">SoulBridge Dashboard</h1>
            <p className="text-white/40 text-xs">v0.1 — Proof of Identity</p>
          </div>
        </div>
        <button
          onClick={handleDisconnect}
          className="flex items-center gap-2 text-xs text-red-400 hover:text-red-300 border border-red-500/30 hover:border-red-400/50 rounded-lg px-3 py-1.5 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          Disconnect
        </button>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">
        {/* Welcome */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/30 rounded-full px-4 py-1.5 mb-2">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-green-300 text-sm font-medium">Identity Active</span>
          </div>
          <h2 className="text-3xl font-light text-white">Welcome, Traveller</h2>
          <p className="text-white/40 text-sm font-mono break-all max-w-xl mx-auto">{identity.did}</p>
        </div>

        {/* Top Widgets */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Widget 1 — Identity Status */}
          <Card className="bg-white/5 border-green-500/30 backdrop-blur-xl">
            <CardContent className="pt-6 space-y-3">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-5 h-5 text-green-400" />
                <h3 className="text-white font-semibold">Identity Status</h3>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center py-2 border-b border-white/10">
                  <span className="text-white/50">Status</span>
                  <span className="flex items-center gap-1.5 text-green-300 font-medium">
                    <CheckCircle className="w-3.5 h-3.5" /> Connected
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-white/10">
                  <span className="text-white/50">DID</span>
                  <span className="text-white/80 font-mono text-xs">{shortDid}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-white/10">
                  <span className="text-white/50">Session</span>
                  <span className="text-purple-300 font-medium">Active</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-white/50">Network</span>
                  <span className="text-blue-300">XRPL Mainnet</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Widget 2 — Signal Log */}
          <Card className="bg-white/5 border-purple-500/30 backdrop-blur-xl">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-4">
                <Radio className="w-5 h-5 text-purple-400" />
                <h3 className="text-white font-semibold">Signal Log</h3>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {signals.length === 0 && (
                  <p className="text-white/30 text-xs py-2">Waiting for signals…</p>
                )}
                {signals.map((sig) => (
                  <div key={sig.id} className="flex items-center justify-between py-2 border-b border-white/10 text-sm">
                    <div className="flex items-center gap-2">
                      <span>✅</span>
                      <span className="text-white/70 font-mono">{sig.type}</span>
                    </div>
                    <span className="text-white/30 text-xs">{sig.time}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Axi Panel */}
        <Card className="bg-white/5 border-indigo-500/30 backdrop-blur-xl">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-indigo-400" />
              <h3 className="text-white font-semibold">Axi — AI Co-pilot</h3>
              <span className="text-xs bg-green-500/20 text-green-300 border border-green-500/30 rounded-full px-2 py-0.5 ml-auto">Online</span>
            </div>
            <div className="bg-slate-900/60 rounded-xl p-4 border border-white/10 min-h-[120px] flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="bg-white/10 border border-white/10 rounded-2xl px-4 py-2.5 text-sm text-white/90 max-w-lg">
                  Identity recognised. Welcome to the Village, Traveller. Your DID has been logged and your session is active. How can I assist you today?
                </div>
              </div>
            </div>
            <p className="text-white/30 text-xs mt-3 text-center">
              Full Axi chat available via the floating button ✨ bottom-right
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}