import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Shield, RefreshCw, ArrowLeft, Plus, Zap, Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import DIDWalletCard from '@/components/did/DIDWalletCard';

const walletNameOptions = ['Agent01', 'Agent02', 'Agent03', 'Agent04', 'Agent05', 'Guardian01', 'Creator01', 'Trader01', 'Treasury'];

export default function DIDManager() {
  const [creating, setCreating] = useState(false);
  const [walletName, setWalletName] = useState('Agent01');

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

  // Fetch live balances in staggered batches (4 at a time, 500ms gap) to avoid XRPL rate limits
  const { data: balances = {}, refetch: refetchBalances } = useQuery({
    queryKey: ['did-balances', wallets.map(w => w.id).join(',')],
    queryFn: async () => {
      if (wallets.length === 0) return {};
      const result = {};
      // Filter out fake/placeholder addresses
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
        // Stagger between batches to avoid rate limiting
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
      toast.error('Please select a wallet name');
      return;
    }
    setCreating(true);
    try {
      await base44.functions.invoke('createWallet', { name: walletName });
      toast.success(`${walletName} created`);
      setWalletName('Agent01');
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

  const publishedCount = wallets.filter(w => w.is_published).length;
  const unpublishedCount = wallets.length - publishedCount;
  const totalXrp = wallets.reduce((sum, w) => sum + (balances[w.id]?.xrp ?? w.balance ?? 0), 0);
  const totalRlusd = Object.values(balances).reduce((sum, b) => sum + (b?.rlusd || 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/20 backdrop-blur-xl sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3">
          <Link to="/home" className="inline-flex items-center text-purple-300 hover:text-purple-200 text-sm mb-2">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                <Shield className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h1 className="text-white font-semibold text-base sm:text-xl">DID Manager</h1>
                <p className="text-purple-400/60 text-[10px] sm:text-xs">Wallets · DIDs · Balances · Trustlines</p>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={handleRefreshAll}
              className="text-xs border-white/20 bg-white/5 text-white hover:bg-white/10 gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" /> Refresh All
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          {[
            { label: 'Total Wallets', value: wallets.length },
            { label: 'DIDs Published', value: publishedCount },
            { label: 'Total XRP', value: totalXrp.toFixed(2) },
            { label: 'Total RLUSD', value: totalRlusd.toFixed(2) },
          ].map(s => (
            <div key={s.label} className="bg-white/5 border border-white/10 rounded-xl p-2.5 sm:p-3 text-center">
              <p className="text-base sm:text-xl font-bold text-white truncate">{s.value}</p>
              <p className="text-white/40 text-[9px] sm:text-xs">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Create New Wallet */}
        <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 border border-purple-500/30 rounded-2xl p-4 sm:p-5">
          <h3 className="text-white font-semibold text-sm flex items-center gap-2 mb-3">
            <Plus className="w-4 h-4" /> Create New DID Wallet
          </h3>
          <div className="flex gap-3">
            <select
              value={walletName}
              onChange={(e) => setWalletName(e.target.value)}
              className="flex-1 bg-white/10 border border-purple-500/50 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-400 appearance-none"
            >
              {walletNameOptions.map(name => (
                <option key={name} value={name} className="bg-slate-900">{name}</option>
              ))}
            </select>
            <Button
              onClick={handleCreateWallet}
              disabled={creating}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 gap-2 font-semibold"
            >
              {creating ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Zap className="w-4 h-4" />}
              Create
            </Button>
          </div>
        </div>

        {/* Wallets Grid */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold text-sm flex items-center gap-2">
              <Wallet className="w-4 h-4 text-purple-400" /> All Wallets & DIDs
            </h2>
            <span className="text-white/30 text-xs">{wallets.length} wallets</span>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            </div>
          ) : wallets.length === 0 ? (
            <div className="text-center py-12 text-white/30 text-sm">No wallets found. Create one above.</div>
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