import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useIdentity } from '@/hooks/useIdentity';
import { Shield, Coins, Wallet as WalletIcon, ArrowLeft, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import WalletTrustlineCard from '@/components/rlusd/WalletTrustlineCard';
import XummTrustlineFlow from '@/components/rlusd/XummTrustlineFlow';

export default function RLUSDTrustlineGate() {
  const { isRecognized, didSignal } = useIdentity();
  const [selectedWallet, setSelectedWallet] = useState(null);
  const [walletChecks, setWalletChecks] = useState({});
  const [checkingId, setCheckingId] = useState(null);

  // Fetch user wallets
  const { data: wallets = [], isLoading: walletsLoading, refetch: refetchWallets } = useQuery({
    queryKey: ['user-wallets-trustline'],
    queryFn: async () => {
      const user = await base44.auth.me();
      return base44.entities.Wallet.filter({ owner_id: user.id, network: 'mainnet' });
    },
    enabled: isRecognized,
  });

  // Fetch RLUSD balance
  const { data: ledgerData, refetch: refetchLedger } = useQuery({
    queryKey: ['rlusd-ledger-gate'],
    queryFn: async () => {
      const user = await base44.auth.me();
      const ledgers = await base44.entities.RLUSDLedger.filter({ user_email: user.email }, '-created_date', 1);
      return ledgers?.[0] || null;
    },
    enabled: isRecognized,
  });

  // Check each wallet's trustline status
  const checkWallet = async (wallet) => {
    setCheckingId(wallet.id);
    const res = await base44.functions.invoke('activateRLUSDGate', {
      action: 'check_wallet',
      wallet_id: wallet.id,
    });
    setWalletChecks(prev => ({ ...prev, [wallet.id]: res.data }));
    setCheckingId(null);
  };

  useEffect(() => {
    wallets.forEach(w => {
      if (!walletChecks[w.id]) {
        // Stagger requests
        setTimeout(() => checkWallet(w), Math.random() * 2000);
      }
    });
  }, [wallets]);

  const handleSelect = (wallet) => {
    const check = walletChecks[wallet.id];
    if (check?.has_trustline) return; // Already active
    setSelectedWallet(wallet);
  };

  const handleComplete = () => {
    // Refresh everything
    setSelectedWallet(null);
    setWalletChecks({});
    refetchWallets();
    refetchLedger();
  };

  const rlusdBalance = ledgerData?.balance || 0;
  const activeCount = Object.values(walletChecks).filter(c => c?.has_trustline).length;

  if (!isRecognized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <Shield className="w-12 h-12 text-cyan-400 mx-auto" />
          <p className="text-white font-semibold">Authentication Required</p>
          <p className="text-sm text-slate-400">Sign in to activate RLUSD trustlines</p>
          <Button onClick={() => base44.auth.redirectToLogin()} className="bg-cyan-600 hover:bg-cyan-500 text-white">
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 text-white">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <Link to="/widget-marketplace" className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition">
            <ArrowLeft className="w-4 h-4 text-slate-400" />
          </Link>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Coins className="w-5 h-5 text-cyan-400" />
              RLUSD Trustline Gate
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">1 Wallet = 1 Trustline · 12 RLUSD per activation</p>
          </div>
        </div>

        {/* Balance bar */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <WalletIcon className="w-4 h-4 text-slate-400" />
            <span className="text-sm text-slate-300">Your RLUSD Balance</span>
          </div>
          <span className={`text-lg font-bold ${rlusdBalance >= 12 ? 'text-emerald-400' : 'text-amber-400'}`}>
            {rlusdBalance.toFixed(2)} RLUSD
          </span>
        </div>

        {/* Info banner */}
        <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-3 flex gap-3">
          <Info className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-cyan-200/80 space-y-1">
            <p><strong>How it works:</strong> Each wallet needs its own trustline activation. Select a wallet, pay 12 RLUSD, then sign the TrustSet transaction via Xaman.</p>
            <p>The trustline allows your wallet to hold and receive RLUSD on the XRP Ledger with <strong>tfSetNoRipple</strong> enabled for safety.</p>
          </div>
        </div>

        {/* Selected wallet: show activation flow */}
        {selectedWallet ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-300">Activate Trustline</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedWallet(null)}
                className="text-xs text-slate-400 hover:text-white"
              >
                ← Back to wallets
              </Button>
            </div>
            <XummTrustlineFlow
              wallet={selectedWallet}
              rlusdBalance={rlusdBalance}
              onComplete={handleComplete}
            />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-300">
                Your Mainnet Wallets
                {activeCount > 0 && (
                  <span className="ml-2 text-xs text-emerald-400 font-normal">
                    {activeCount} active
                  </span>
                )}
              </h2>
            </div>

            {walletsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
              </div>
            ) : wallets.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <WalletIcon className="w-10 h-10 text-slate-600 mx-auto" />
                <p className="text-sm text-slate-400">No mainnet wallets found</p>
                <Link to="/wallets">
                  <Button size="sm" className="bg-cyan-600 hover:bg-cyan-500 text-white">
                    Create a Wallet
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {wallets.map(w => (
                  <WalletTrustlineCard
                    key={w.id}
                    wallet={w}
                    checkData={walletChecks[w.id]}
                    loading={checkingId === w.id && !walletChecks[w.id]}
                    selected={selectedWallet?.id === w.id}
                    onSelect={handleSelect}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-white/5 pt-4 text-center">
          <p className="text-[10px] text-slate-600">
            Powered by the XRP Ledger · RLUSD Issuer: rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De
          </p>
        </div>
      </div>
    </div>
  );
}