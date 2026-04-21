import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Shield, ExternalLink, RefreshCw, Loader2, Wallet, Fuel } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function EthTreasuryShield() {
  const [manualRefresh, setManualRefresh] = useState(0);

  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ['ethRLUSDTreasury', manualRefresh],
    queryFn: async () => {
      const res = await base44.functions.invoke('getEthRLUSDTreasuryBalance', {});
      return res.data;
    },
    staleTime: 30000,
    refetchInterval: 60000,
  });

  const handleRefresh = () => setManualRefresh(prev => prev + 1);

  if (isLoading) {
    return (
      <div className="bg-gradient-to-br from-indigo-900/30 to-purple-900/20 border border-indigo-500/30 rounded-lg sm:rounded-2xl p-3 sm:p-5 animate-pulse">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-indigo-400" />
          <span className="text-white/40 text-xs">Loading ETH Treasury…</span>
        </div>
      </div>
    );
  }

  if (error || !data?.success) {
    return (
      <div className="bg-gradient-to-br from-red-900/20 to-orange-900/10 border border-red-500/30 rounded-lg sm:rounded-2xl p-3 sm:p-5">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-red-400" />
          <span className="text-red-300 text-xs font-medium">ETH Treasury Offline</span>
        </div>
        <p className="text-white/30 text-[8px] sm:text-[10px] mt-1">{error?.message || data?.error || 'Unable to reach Ethereum network'}</p>
      </div>
    );
  }

  const shortAddr = data.address ? `${data.address.slice(0, 6)}…${data.address.slice(-4)}` : '—';
  const etherscanUrl = data.address ? `https://etherscan.io/address/${data.address}` : null;

  return (
    <div className="bg-gradient-to-br from-indigo-900/30 via-purple-900/20 to-slate-900/30 border border-indigo-500/30 rounded-lg sm:rounded-2xl p-3 sm:p-5 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-indigo-500/20 flex items-center justify-center">
            <Shield className="w-4 sm:w-5 h-4 sm:h-5 text-indigo-400" />
          </div>
          <div>
            <h3 className="text-indigo-200 font-semibold text-xs sm:text-sm">ETH RLUSD Treasury</h3>
            <p className="text-white/30 text-[7px] sm:text-[10px]">Ethereum Mainnet · Didit Bridge Receiver</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          disabled={isFetching}
          className="text-white/30 hover:text-white/60 h-7 w-7 p-0"
        >
          {isFetching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
        </Button>
      </div>

      {/* Balance Display */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <div className="bg-white/5 rounded-lg p-2 sm:p-3">
          <p className="text-white/40 text-[7px] sm:text-[10px] mb-0.5">RLUSD Balance</p>
          <p className="text-xl sm:text-2xl font-bold text-indigo-300">
            {data.balance_rlusd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-white/25 text-[7px] sm:text-[9px] mt-0.5">{data.symbol} · ERC-20</p>
        </div>
        <div className="bg-white/5 rounded-lg p-2 sm:p-3">
          <p className="text-white/40 text-[7px] sm:text-[10px] mb-0.5">ETH (Gas)</p>
          <p className="text-lg sm:text-xl font-bold text-emerald-300">
            {data.eth_balance.toFixed(4)}
          </p>
          <div className="flex items-center gap-1 mt-0.5">
            <Fuel className="w-2.5 h-2.5 text-white/25" />
            <p className="text-white/25 text-[7px] sm:text-[9px]">
              {data.eth_balance < 0.01 ? 'Low gas — top up needed' : 'Gas available'}
            </p>
          </div>
        </div>
      </div>

      {/* Address & Links */}
      <div className="flex items-center justify-between bg-white/5 rounded-lg p-2 sm:p-2.5">
        <div className="flex items-center gap-1.5">
          <Wallet className="w-3 h-3 text-white/30" />
          <span className="text-white/50 text-[8px] sm:text-xs font-mono">{shortAddr}</span>
        </div>
        <div className="flex items-center gap-2">
          {etherscanUrl && (
            <a
              href={etherscanUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-400 hover:text-indigo-300 text-[8px] sm:text-[10px] flex items-center gap-0.5"
            >
              Etherscan <ExternalLink className="w-2.5 h-2.5" />
            </a>
          )}
          <a
            href={`https://etherscan.io/token/${data.contract_address}?a=${data.address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-400 hover:text-purple-300 text-[8px] sm:text-[10px] flex items-center gap-0.5"
          >
            RLUSD <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </div>
      </div>

      {/* Status indicator */}
      <div className="flex items-center gap-1 text-[7px] sm:text-[9px] text-white/20">
        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
        Last checked: {data.checked_at ? new Date(data.checked_at).toLocaleTimeString() : '—'}
      </div>
    </div>
  );
}