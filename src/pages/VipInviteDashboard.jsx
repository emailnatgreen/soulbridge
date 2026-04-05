import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { hasAdminAccess } from '@/lib/adminAccess';
import { Link } from 'react-router-dom';
import { Shield, Globe, Wallet, Sparkles, RefreshCw, Plus, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import VipWalletAssigner from '@/components/vip/VipWalletAssigner';
import VipWalletCard from '@/components/vip/VipWalletCard';
import DexSwapPanel from '@/components/dex/DexSwapPanel';
import SendPanel from '@/components/wallet/SendPanel';
import ReceivePanel from '@/components/wallet/ReceivePanel';

export default function VipInviteDashboard() {
  const { user } = useAuth();
  const [identity] = useState(() => {
    try { return JSON.parse(localStorage.getItem('soulbridge_identity') || 'null'); } catch(_) { return null; }
  });
  const identityDid = identity?.did;
  const isAdmin = hasAdminAccess({ user, identityDid });

  const [wallets, setWallets] = useState([]);
  const [agents, setAgents] = useState([]);
  const [treasuryAddresses, setTreasuryAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rlusdBalances, setRlusdBalances] = useState({});

  const loadData = async () => {
    setLoading(true);
    const [allWallets, allAgents, treasuries] = await Promise.all([
      base44.entities.Wallet.list('-created_date', 100).catch(() => []),
      base44.entities.Agent.list('-created_date', 100).catch(() => []),
      base44.entities.Treasury.list('-created_date', 20).catch(() => [])
    ]);
    const tAddresses = (treasuries || []).map(t => t.classic_address).filter(a => a && a !== 'N/A - Legacy Record');
    setTreasuryAddresses(tAddresses);
    const vipOnly = (allWallets || []).filter(w =>
      (w.name && w.name.toLowerCase().includes('vip')) ||
      (w.notes && w.notes.toLowerCase().includes('vip'))
    );
    setWallets(vipOnly);
    setAgents(allAgents || []);
    setLoading(false);

    // Fetch RLUSD balances for VIP wallets in background
    for (const w of vipOnly) {
      if (w.classic_address) {
        base44.functions.invoke('getWalletTrustlines', { wallet_id: w.id }).then(res => {
          const lines = res?.data?.trustlines || [];
          const rlusdLine = lines.find(tl => tl.currency === 'RLUSD' || tl.currency === '524C555344000000000000000000000000000000');
          if (rlusdLine) {
            setRlusdBalances(prev => ({ ...prev, [w.id]: parseFloat(rlusdLine.balance || '0') }));
          }
        }).catch(() => {});
      }
    }
  };

  useEffect(() => { loadData(); }, []);



  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center text-white">
        <div className="text-center space-y-3">
          <Shield className="w-10 h-10 text-red-400 mx-auto" />
          <p className="text-white/60">Admin access required</p>
          <Link to="/dashboard" className="text-purple-400 text-sm hover:underline">← Back to Dashboard</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 text-white">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/30 backdrop-blur-xl px-3 sm:px-6 py-2.5 sm:py-3 sticky top-0 z-20">
        <div className="flex items-center justify-between gap-2 sm:gap-3 max-w-6xl mx-auto">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-amber-300" />
            </div>
            <div className="min-w-0">
              <h1 className="text-white font-semibold text-xs sm:text-base truncate">VIP Invite Dashboard</h1>
              <p className="text-amber-400/60 text-[9px] sm:text-xs truncate">Admin · VIP wallets, DIDs & access</p>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={loadData}
            className="text-[10px] sm:text-xs border-white/20 bg-white/5 text-white hover:bg-white/10 gap-1 sm:gap-1.5 h-7 sm:h-8 px-2 sm:px-3 flex-shrink-0">
            <RefreshCw className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          {[
            { label: 'VIP Wallets', value: wallets.length },
            { label: 'DIDs Published', value: wallets.filter(w => w.is_published && w.published_txid).length },
            { label: 'Total XRP', value: `${wallets.reduce((s, w) => s + (w.balance || 0), 0).toFixed(2)}` },
            { label: 'Total RLUSD', value: `${Object.values(rlusdBalances).reduce((s, b) => s + b, 0).toFixed(2)}` },
          ].map(s => (
            <div key={s.label} className="bg-white/5 border border-white/10 rounded-xl p-2.5 sm:p-3 text-center">
              <p className="text-base sm:text-xl font-bold text-white truncate">{s.value}</p>
              <p className="text-white/40 text-[9px] sm:text-xs">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Send / Receive / DEX Swap — VIP wallets only, exclude treasury */}
        {(() => {
          const vipUserWallets = wallets.filter(w => !treasuryAddresses.includes(w.classic_address));
          return (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SendPanel wallets={vipUserWallets} />
                <ReceivePanel wallets={vipUserWallets} />
              </div>
              <DexSwapPanel wallets={vipUserWallets} />
            </div>
          );
        })()}

        {/* Admin: Add Wallet to VIP */}
        <VipWalletAssigner
          wallets={wallets}
          agents={agents}
          onComplete={loadData}
        />

        {/* Live VIP Wallets */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold text-sm flex items-center gap-2">
              <Wallet className="w-4 h-4 text-purple-400" /> Live VIP Wallets
            </h2>
            <span className="text-white/30 text-xs">{wallets.length} VIP wallets</span>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            </div>
          ) : wallets.length === 0 ? (
            <div className="text-center py-12 text-white/30 text-sm">No wallets found. Use Edit Mode to assign wallets.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {wallets.map(wallet => (
                <VipWalletCard
                  key={wallet.id}
                  wallet={wallet}
                  agents={agents}
                  onRefresh={loadData}
                />
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}