import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Shield, Globe, Wallet, Sparkles, Eye, Home, ExternalLink, CheckCircle, Users, Zap, ScrollText, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import SecureInviteWalletCard from '@/components/vip/SecureInviteWalletCard';

export default function SecureInviteDashboard() {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [dashData, setDashData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    try {
      const stored = localStorage.getItem('sb_invite_session');
      if (!stored) {
        navigate('/');
        return;
      }
      const parsed = JSON.parse(stored);
      setSession(parsed);

      // If dashboard_data was stored from validation, use it
      if (parsed.dashboard_data) {
        setDashData(parsed.dashboard_data);
        setLoading(false);
      } else {
        setLoading(false);
      }
    } catch (e) {
      navigate('/');
    }
  }, []);

  const handleExit = () => {
    localStorage.removeItem('sb_invite_session');
    localStorage.removeItem('sb_invite_wallet');
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) return null;

  const wallets = dashData?.wallets || [];
  const agents = dashData?.agents || [];
  const publishedDIDs = wallets.filter(w => w.is_published && w.published_txid).length;
  const totalXRP = wallets.reduce((s, w) => s + (w.balance || 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 text-white">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/30 backdrop-blur-xl px-3 sm:px-6 py-2.5 sm:py-3 sticky top-0 z-20">
        <div className="flex items-center justify-between gap-2 max-w-6xl mx-auto">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <img
              src="https://base44.app/api/apps/699319649276f1077c1f2c81/files/public/699319649276f1077c1f2c81/20b492e9e_1185.png"
              alt="SoulBridge"
              className="w-8 h-8 rounded-lg object-contain flex-shrink-0"
            />
            <div className="min-w-0">
              <h1 className="text-white font-semibold text-xs sm:text-base truncate">SoulBridge VIP Dashboard</h1>
              <p className="text-amber-400/60 text-[9px] sm:text-xs truncate">Welcome, {session.recipient_nickname || 'Honoured Guest'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Badge className="bg-green-500/20 text-green-300 border-green-500/30 text-[9px] sm:text-xs gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
              XRPL Mainnet
            </Badge>
            <button onClick={handleExit} className="text-white/40 hover:text-white text-xs flex items-center gap-1 border border-white/20 rounded-md px-2 py-1.5 hover:bg-white/5 transition-colors">
              <Home className="w-3 h-3" /> Exit
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">

        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-amber-500/10 to-purple-500/10 border border-amber-500/30 rounded-2xl p-5 sm:p-7">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-6 h-6 text-amber-300" />
            </div>
            <div className="space-y-2">
              <h2 className="text-white text-lg sm:text-xl font-semibold">Welcome to the SoulBridge Village, {session.recipient_nickname}</h2>
              <p className="text-white/60 text-sm leading-relaxed">
                You've been granted VIP access to explore SoulBridge — a sovereign AI agent economy built on the XRP Ledger. 
                Below you'll find our live XRPL wallets, published DIDs, and the infrastructure that powers our constitutional governance.
              </p>
              {session.notes && (
                <p className="text-amber-400/70 text-xs italic">"{session.notes}"</p>
              )}
              <div className="flex items-center gap-2 mt-1">
                <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-[10px]">
                  Invite: {session.token_id}
                </Badge>
                <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[10px]">
                  <Zap className="w-2.5 h-2.5" /> {session.kinetic_weight} KU Energy
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          {[
            { label: 'VIP Wallets', value: wallets.length, icon: Wallet },
            { label: 'DIDs Published', value: publishedDIDs, icon: Globe },
            { label: 'Active Agents', value: agents.filter(a => a.status === 'active').length, icon: Users },
            { label: 'Total XRP', value: `${totalXRP.toFixed(2)}`, icon: Zap },
          ].map(s => (
            <div key={s.label} className="bg-white/5 border border-white/10 rounded-xl p-2.5 sm:p-3 text-center">
              <s.icon className="w-4 h-4 text-purple-400 mx-auto mb-1" />
              <p className="text-base sm:text-xl font-bold text-white truncate">{s.value}</p>
              <p className="text-white/40 text-[9px] sm:text-xs">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Live VIP Wallets */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold text-sm flex items-center gap-2">
              <Wallet className="w-4 h-4 text-purple-400" /> Live XRPL Wallets
            </h2>
            <span className="text-white/30 text-xs">{wallets.length} wallets on mainnet</span>
          </div>

          {wallets.length === 0 ? (
            <div className="text-center py-12 text-white/30 text-sm">No VIP wallets configured yet.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {wallets.map(wallet => (
                <SecureInviteWalletCard key={wallet.id} wallet={wallet} />
              ))}
            </div>
          )}
        </div>

        {/* Active Agents */}
        {agents.length > 0 && (
          <div>
            <h2 className="text-white font-semibold text-sm flex items-center gap-2 mb-4">
              <Users className="w-4 h-4 text-emerald-400" /> Village Agents
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {agents.filter(a => a.status === 'active').slice(0, 9).map(agent => (
                <div key={agent.id} className="bg-white/5 border border-white/10 rounded-xl p-3">
                  <div className="flex items-center gap-2.5">
                    {agent.avatar_url ? (
                      <img src={agent.avatar_url} alt="" className="w-8 h-8 rounded-lg object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-300 text-xs font-bold">
                        {(agent.name || '?')[0]}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-white text-xs font-medium truncate">{agent.name}</p>
                      <p className="text-white/40 text-[10px] truncate">{agent.role} · Honour {agent.honor_score}/100</p>
                    </div>
                  </div>
                  {agent.purpose && <p className="text-white/30 text-[10px] mt-2 line-clamp-2">{agent.purpose}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Explore Links */}
        <div>
          <h2 className="text-white font-semibold text-sm flex items-center gap-2 mb-4">
            <BookOpen className="w-4 h-4 text-cyan-400" /> Explore SoulBridge
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <a href="/whitepaper/governance" className="group bg-purple-500/10 border border-purple-500/20 rounded-xl p-4 hover:bg-purple-500/15 hover:border-purple-500/40 transition-all">
              <ScrollText className="w-5 h-5 text-purple-400 mb-2" />
              <p className="text-white font-medium text-sm">Governance White Paper</p>
              <p className="text-white/40 text-[10px] mt-1">11-layer constitutional architecture</p>
            </a>
            <a href="/whitepaper/business" className="group bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 hover:bg-amber-500/15 hover:border-amber-500/40 transition-all">
              <ScrollText className="w-5 h-5 text-amber-400 mb-2" />
              <p className="text-white font-medium text-sm">Business Layer Paper</p>
              <p className="text-white/40 text-[10px] mt-1">RLUSD economy & agent commerce</p>
            </a>
            <a href="/whitepaper/technical" className="group bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-4 hover:bg-cyan-500/15 hover:border-cyan-500/40 transition-all">
              <ScrollText className="w-5 h-5 text-cyan-400 mb-2" />
              <p className="text-white font-medium text-sm">Technical Architecture</p>
              <p className="text-white/40 text-[10px] mt-1">DID, Kinetic, WebMCP, Axi</p>
            </a>
          </div>
        </div>

        {/* Verify on XRPScan */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center space-y-2">
          <p className="text-white/50 text-xs">All wallets and DIDs are verifiable on the XRPL public ledger</p>
          <a href="https://xrpscan.com" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm font-medium">
            <ExternalLink className="w-4 h-4" /> Verify on XRPScan.com
          </a>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-black/20 py-4 mt-8">
        <div className="max-w-6xl mx-auto px-4 text-center space-y-1">
          <p className="text-white/25 text-[10px]">© 2026 SoulBridge Foundation · Governed by 11 Laws of Honour · XRPL DID Architecture</p>
          <p className="text-white/15 text-[8px]">VIP Access · Invitation-only preview · UK FSMA 2026 compliant</p>
        </div>
      </footer>
    </div>
  );
}