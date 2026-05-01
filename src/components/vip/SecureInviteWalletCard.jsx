import React from 'react';
import { Globe, CheckCircle, ExternalLink, Copy } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function SecureInviteWalletCard({ wallet }) {
  const copyAddress = () => {
    navigator.clipboard.writeText(wallet.classic_address);
    toast.success('Address copied');
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center flex-shrink-0">
            <Globe className="w-4 h-4 text-purple-300" />
          </div>
          <div className="min-w-0">
            <p className="text-white font-medium text-sm truncate">{wallet.name || 'VIP Wallet'}</p>
            <p className="text-white/30 text-[10px]">{wallet.network || 'mainnet'}</p>
          </div>
        </div>
        {wallet.is_published && wallet.published_txid && (
          <Badge className="bg-green-500/20 text-green-300 border-green-500/30 text-[9px] gap-1">
            <CheckCircle className="w-2.5 h-2.5" /> DID Published
          </Badge>
        )}
      </div>

      {/* Address */}
      <div className="bg-black/30 rounded-lg px-3 py-2 flex items-center justify-between gap-2">
        <code className="text-white/60 text-[10px] font-mono truncate select-all">{wallet.classic_address}</code>
        <button onClick={copyAddress} className="text-white/30 hover:text-white/60 transition-colors flex-shrink-0">
          <Copy className="w-3 h-3" />
        </button>
      </div>

      {/* Balance */}
      <div className="flex items-center justify-between">
        <span className="text-white/40 text-xs">XRP Balance</span>
        <span className="text-white font-semibold text-sm">{(wallet.balance || 0).toFixed(2)} XRP</span>
      </div>

      {/* DID Tx */}
      {wallet.published_txid && (
        <a
          href={`https://xrpscan.com/tx/${wallet.published_txid}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-purple-400 hover:text-purple-300 text-[10px] transition-colors"
        >
          <ExternalLink className="w-3 h-3" />
          View DID transaction on XRPScan
        </a>
      )}

      {/* XRPScan link for address */}
      {wallet.classic_address && (
        <a
          href={`https://xrpscan.com/account/${wallet.classic_address}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-white/30 hover:text-white/50 text-[10px] transition-colors"
        >
          <ExternalLink className="w-3 h-3" />
          View account on XRPScan
        </a>
      )}
    </div>
  );
}