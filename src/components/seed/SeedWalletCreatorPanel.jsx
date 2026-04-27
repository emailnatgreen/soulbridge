import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Wallet, Plus, Loader2, CheckCircle, Coins, TreePine, AlertTriangle, ExternalLink, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

export default function SeedWalletCreatorPanel() {
  const [pricing, setPricing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [walletName, setWalletName] = useState('');
  const [lastCreated, setLastCreated] = useState(null);

  const loadPricing = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('seedWalletCreate', { action: 'price_check' });
      setPricing(res.data);
    } catch (e) {
      toast.error('Failed to load pricing');
    }
    setLoading(false);
  };

  useEffect(() => { loadPricing(); }, []);

  const handleCreate = async () => {
    if (!walletName.trim()) {
      toast.error('Enter a wallet name');
      return;
    }
    setCreating(true);
    setLastCreated(null);
    try {
      const res = await base44.functions.invoke('seedWalletCreate', {
        action: 'create',
        name: walletName.trim(),
      });
      setLastCreated(res.data);
      setWalletName('');
      toast.success(res.data.message);
      loadPricing();
    } catch (e) {
      const msg = e.response?.data?.error || e.message;
      toast.error(msg);
    }
    setCreating(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Pricing Info */}
      <div className="bg-gradient-to-br from-amber-900/30 to-yellow-900/20 border border-amber-500/30 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
            <TreePine className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-amber-200 font-bold text-base">Multi-Node Wallet Creator</h3>
            <p className="text-amber-200/40 text-xs">Create multiple XRPL wallets for publishing DIDs as nodes</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-black/20 border border-amber-500/20 rounded-xl p-3 text-center">
            <p className="text-white/40 text-[9px] uppercase tracking-widest">Wallets</p>
            <p className="text-white font-bold text-xl">{pricing?.wallet_count || 0}</p>
          </div>
          <div className="bg-black/20 border border-amber-500/20 rounded-xl p-3 text-center">
            <p className="text-white/40 text-[9px] uppercase tracking-widest">Next Cost</p>
            <p className="text-amber-300 font-bold text-xl">{pricing?.next_cost || 0} <span className="text-xs font-normal">RLUSD</span></p>
          </div>
          <div className="bg-black/20 border border-amber-500/20 rounded-xl p-3 text-center">
            <p className="text-white/40 text-[9px] uppercase tracking-widest">Balance</p>
            <p className={`font-bold text-xl ${pricing?.can_afford ? 'text-green-300' : 'text-red-300'}`}>
              {pricing?.balance?.toFixed(2) || '0'} <span className="text-xs font-normal">RLUSD</span>
            </p>
          </div>
        </div>

        {/* Pricing breakdown */}
        <div className="flex gap-3">
          <div className="flex-1 bg-white/5 border border-white/10 rounded-xl p-3 flex items-center gap-3">
            <Coins className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <div>
              <p className="text-white text-xs font-semibold">First Wallet</p>
              <p className="text-white/40 text-[10px]">{pricing?.first_wallet_cost || 12} RLUSD — your primary node</p>
            </div>
          </div>
          <div className="flex-1 bg-white/5 border border-white/10 rounded-xl p-3 flex items-center gap-3">
            <Plus className="w-4 h-4 text-green-400 flex-shrink-0" />
            <div>
              <p className="text-white text-xs font-semibold">Additional Wallets</p>
              <p className="text-white/40 text-[10px]">{pricing?.additional_wallet_cost || 2} RLUSD each — expand your nodes</p>
            </div>
          </div>
        </div>
      </div>

      {/* Create Wallet Form */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
        <h4 className="text-white font-semibold text-sm flex items-center gap-2">
          <Wallet className="w-4 h-4 text-purple-400" /> Create New Node Wallet
        </h4>

        {!pricing?.can_afford && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
            <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-red-300 text-xs font-semibold">Insufficient RLUSD Balance</p>
              <p className="text-red-200/50 text-[10px]">
                You need {pricing?.next_cost} RLUSD but only have {pricing?.balance?.toFixed(2)}. Use the RLUSD Faucet to top up.
              </p>
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <Label className="text-white/60 text-xs">Wallet Name</Label>
          <Input
            value={walletName}
            onChange={e => setWalletName(e.target.value)}
            placeholder={`e.g. Node Wallet #${(pricing?.wallet_count || 0) + 1}`}
            className="bg-white/5 border-white/10 text-white"
          />
        </div>

        <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg px-3 py-2 text-xs text-amber-300 flex items-start gap-2">
          <Coins className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <span>This will charge <strong>{pricing?.next_cost} RLUSD</strong> from your balance. The wallet will be auto-funded with 13 XRP for DID publication.</span>
        </div>

        <Button
          onClick={handleCreate}
          disabled={creating || !walletName.trim() || !pricing?.can_afford}
          className="w-full bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white gap-2"
        >
          {creating ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Creating Wallet & Charging {pricing?.next_cost} RLUSD…</>
          ) : (
            <><TreePine className="w-4 h-4" /> Create Wallet — {pricing?.next_cost} RLUSD</>
          )}
        </Button>
      </div>

      {/* Last Created Result */}
      {lastCreated?.success && (
        <div className="bg-green-500/5 border border-green-500/20 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <h4 className="text-green-300 font-semibold text-sm">Wallet #{lastCreated.wallet_number} Created!</h4>
          </div>
          <div className="bg-black/20 rounded-xl px-3 py-2 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-white/40 text-[10px]">Name</span>
              <span className="text-white text-xs">{lastCreated.wallet.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/40 text-[10px]">Address</span>
              <span className="text-purple-300 text-xs font-mono">{lastCreated.wallet.classic_address}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/40 text-[10px]">Balance</span>
              <span className="text-white text-xs">{lastCreated.wallet.balance} XRP</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/40 text-[10px]">Charged</span>
              <span className="text-amber-300 text-xs">{lastCreated.cost_charged} RLUSD</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/40 text-[10px]">Remaining Balance</span>
              <span className="text-green-300 text-xs">{lastCreated.balance_after?.toFixed(2)} RLUSD</span>
            </div>
          </div>
          <a
            href={`https://xrpscan.com/account/${lastCreated.wallet.classic_address}`}
            target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300"
          >
            <ExternalLink className="w-3 h-3" /> View on XRPScan
          </a>
        </div>
      )}

      {/* Refresh */}
      <div className="flex justify-center">
        <Button variant="ghost" size="sm" onClick={loadPricing} className="text-white/30 hover:text-white gap-1.5 text-[10px]">
          <RefreshCw className="w-3 h-3" /> Refresh Pricing
        </Button>
      </div>
    </div>
  );
}