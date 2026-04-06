import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Shield, RefreshCw, ArrowLeft, Plus, Zap, Wallet, Smartphone, Globe, Home } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import DIDWalletCard from '@/components/did/DIDWalletCard';
import XummImportWallet from '@/components/did/XummImportWallet';
import SendPanel from '@/components/wallet/SendPanel';
import ReceivePanel from '@/components/wallet/ReceivePanel';
import DexSwapPanel from '@/components/dex/DexSwapPanel';

export default function DIDManager() {
  const [creating, setCreating] = useState(false);
  const [walletName, setWalletName] = useState('');
  const [showXummImport, setShowXummImport] = useState(false);

  const { data: wallets = [], isLoading, refetch } = useQuery({
    queryKey: ['did-wallets'],
    queryFn: () => base44.entities.Wallet.list('-created_date', 100),
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const { data: agents = [] } = useQuery({
    queryKey: ['did-agents'],
    queryFn: () => base44.entities.Agent.list('-created_date', 100),
    staleTime: 30000,
  });

  const { data: treasuries = [] } = useQuery({
    queryKey: ['did-treasuries'],
    queryFn: () => base44.entities.Treasury.list('-created_date', 20),
    staleTime: 30000,
  });

  // Fetch live balances in staggered batches to avoid XRPL rate limits
  const { data: balances = {}, refetch: refetchBalances } = useQuery({
    queryKey: ['did-balances', wallets.map(w => w.id).join(',')],
    queryFn: async () => {
      if (wallets.length === 0) return {};
      const result = {};
      const realWallets = wallets.filter(w => w.classic_address && !w.classic_address.startsWith('rAxi') && !w.classic_address.startsWith('rZoe'));
      const batchSize = 4;
      for (let i = 0; i < realWallets.length; i += batchSize) {
        const batch = realWallets.slice(i, i + batchSize);
        await Promise.all(batch.map(async (wallet) => {
          try {
            const res = await base44.functions.invoke('getBalanceEnhanced', { wallet_id: wallet.id });
            result[wallet.id] = res.data;
          } catch (e) {
            result[wallet.id] = { xrp: wallet.balance || 0, rlusd: 0 };
          }
        }));
        if (i + batchSize < realWallets.length) {
          await new Promise(r => setTimeout(r, 600));
        }
      }
      return result;
    },
    enabled: wallets.length > 0,
    staleTime: 60000,
    refetchOnMount: 'always',
  });

  const handleCreateWallet = async () => {
    if (!walletName.trim()) {
      toast.error('Please enter a wallet name');
      return;
    }
    setCreating(true);
    try {
      await base44.functions.invoke('createWallet', { name: walletName.trim() });
      toast.success(`${walletName} created`);
      setWalletName('');
      await new Promise(r => setTimeout(r, 500));
      await refetch();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to create wallet');
    } finally {
      setCreating(false);
    }
  };

  const handleRefreshAll = () => {
    refetch();
    setTimeout(() => refetchBalances(), 500);
  };

  // Exclude treasury addresses from Send panel
  const treasuryAddresses = treasuries.map(t => t.classic_address).filter(Boolean);
  const sendableWallets = wallets.filter(w => w.classic_address && !treasuryAddresses.includes(w.classic_address) && !w.classic_address.startsWith('rAxi') && !w.classic_address.startsWith('rZoe'));

  const publishedCount = wallets.filter(w => w.is_published).length;
  const totalXrp = wallets.reduce((sum, w) => sum + (balances[w.id]?.xrp ?? w.balance ?? 0), 0);
  const totalRlusd = Object.values(balances).reduce((sum, b) => sum + (b?.rlusd || 0), 0);
  const missingSeedCount = wallets.filter(w => !w.encrypted_seed && w.classic_address && !w.classic_address.startsWith('rAxi') && !w.classic_address.startsWith('rZoe')).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 text-white">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/30 backdrop-blur-xl px-3 sm:px-6 py-2.5 sm:py-3 sticky top-0 z-20">
        <div className="flex items-center justify-between gap-2 sm:gap-3 max-w-6xl mx-auto">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center flex-shrink-0">
              <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" />
            </div>
            <div className="min-w-0">
              <h1 className="text-white font-semibold text-xs sm:text-base truncate">DID Manager</h1>
              <p className="text-purple-400/60 text-[9px] sm:text-xs truncate">Mainnet · Wallets · DIDs · Xaman Signing</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Link to="/home"
              className="inline-flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs border border-white/20 bg-white/5 text-white hover:bg-white/10 h-7 sm:h-8 px-2 sm:px-3 rounded-md transition-colors">
              <Home className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> <span className="hidden sm:inline">Home</span>
            </Link>
            <Button size="sm" variant="outline" onClick={handleRefreshAll}
              className="text-[10px] sm:text-xs border-white/20 bg-white/5 text-white hover:bg-white/10 gap-1 sm:gap-1.5 h-7 sm:h-8 px-2 sm:px-3">
              <RefreshCw className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3">
          {[
            { label: 'Total Wallets', value: wallets.length },
            { label: 'DIDs Published', value: publishedCount },
            { label: 'Total XRP', value: totalXrp.toFixed(2) },
            { label: 'Total RLUSD', value: totalRlusd.toFixed(2) },
            { label: 'Missing Seeds', value: missingSeedCount, warn: missingSeedCount > 0 },
          ].map(s => (
            <div key={s.label} className={`bg-white/5 border rounded-xl p-2.5 sm:p-3 text-center ${s.warn ? 'border-red-500/30' : 'border-white/10'}`}>
              <p className={`text-base sm:text-xl font-bold truncate ${s.warn ? 'text-red-300' : 'text-white'}`}>{s.value}</p>
              <p className={`text-[9px] sm:text-xs ${s.warn ? 'text-red-400/60' : 'text-white/40'}`}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Wallet Creation Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Create New Wallet */}
          <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 border border-purple-500/30 rounded-2xl p-4 sm:p-5">
            <h3 className="text-white font-semibold text-sm flex items-center gap-2 mb-3">
              <Plus className="w-4 h-4" /> Create New DID Wallet
            </h3>
            <div className="space-y-3">
              <input
                type="text"
                value={walletName}
                onChange={(e) => setWalletName(e.target.value)}
                placeholder="Enter wallet name..."
                className="w-full bg-white/10 border border-purple-500/50 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-400 placeholder:text-white/20"
              />
              <Button
                onClick={handleCreateWallet}
                disabled={creating || !walletName.trim()}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white gap-2 font-semibold">
                {creating ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Zap className="w-4 h-4" />}
                Generate Wallet
              </Button>
              <p className="text-white/30 text-[9px]">Creates a new XRPL mainnet wallet with encrypted seed storage.</p>
            </div>
          </div>

          {/* Xumm Import */}
          {showXummImport ? (
            <XummImportWallet
              onComplete={() => { setShowXummImport(false); refetch(); }}
              onClose={() => setShowXummImport(false)}
            />
          ) : (
            <div className="bg-white/5 border border-cyan-500/30 rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
              <div>
                <h3 className="text-white font-semibold text-sm flex items-center gap-2 mb-2">
                  <Smartphone className="w-4 h-4 text-cyan-400" /> Import via Xaman (Xumm)
                </h3>
                <p className="text-white/50 text-xs mb-4">Sign in with Xaman to import an existing XRPL wallet address. Your keys stay in Xaman — only the public address is saved.</p>
              </div>
              <Button onClick={() => setShowXummImport(true)}
                className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white gap-2 text-sm">
                <Smartphone className="w-4 h-4" /> Connect Xaman Wallet
              </Button>
            </div>
          )}
        </div>

        {/* Send / Receive / DEX */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SendPanel wallets={sendableWallets} />
            <ReceivePanel wallets={sendableWallets} />
          </div>
          <DexSwapPanel wallets={sendableWallets} />
        </div>

        {/* Wallets Grid */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold text-sm flex items-center gap-2">
              <Wallet className="w-4 h-4 text-purple-400" /> All Wallets & DIDs
            </h2>
            <span className="text-white/30 text-xs">{wallets.length} wallets · {publishedCount} published</span>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            </div>
          ) : wallets.length === 0 ? (
            <div className="text-center py-12 text-white/30 text-sm">No wallets found. Create one above or import from Xaman.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {wallets.map(wallet => (
                <DIDWalletCard
                  key={wallet.id}
                  wallet={wallet}
                  agents={agents}
                  onRefresh={handleRefreshAll}
                  liveXrpBalance={balances[wallet.id]?.xrp}
                  liveRlusdBalance={balances[wallet.id]?.rlusd}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}