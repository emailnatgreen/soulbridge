import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import {
  Wallet, Globe, Loader2, CheckCircle, AlertTriangle, ExternalLink, RefreshCw, Copy
} from 'lucide-react';
import { toast } from 'sonner';

export default function SeedWalletCard({ wallet, onRefresh }) {
  const [publishing, setPublishing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [liveBalance, setLiveBalance] = useState(wallet.balance ?? 0);
  const [copied, setCopied] = useState(false);
  const [publishResult, setPublishResult] = useState(null);

  const isPublished = wallet.is_published && wallet.published_txid;
  const isFunded = liveBalance >= 13;

  const handleRefreshBalance = async () => {
    setRefreshing(true);
    try {
      const res = await base44.functions.invoke('getBalance', { wallet_id: wallet.id });
      setLiveBalance(res?.data?.balance ?? liveBalance);
    } catch (_) {}
    setRefreshing(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(wallet.classic_address);
    setCopied(true);
    toast.success('Address copied');
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePublishDID = async () => {
    setPublishing(true);
    setPublishResult(null);
    try {
      const res = await base44.functions.invoke('publishDIDAuto', { wallet_id: wallet.id });
      const data = res?.data;
      if (data?.success) {
        setPublishResult({ success: true, txid: data.txid });
        toast.success(`DID published! TX: ${data.txid?.slice(0, 12)}…`);
        onRefresh?.();
      } else {
        setPublishResult({ error: data?.message || data?.error || 'Publication failed' });
        toast.error(data?.message || data?.error || 'Publication failed');
      }
    } catch (e) {
      const msg = e?.response?.data?.error || e.message || 'Publication failed';
      setPublishResult({ error: msg });
      toast.error(msg);
    }
    setPublishing(false);
  };

  return (
    <div className={`border rounded-2xl p-4 space-y-3 ${
      isPublished
        ? 'bg-green-500/5 border-green-500/20'
        : isFunded
          ? 'bg-purple-500/5 border-purple-500/20'
          : 'bg-amber-500/5 border-amber-500/20'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
            isPublished ? 'bg-green-500/20' : isFunded ? 'bg-purple-500/20' : 'bg-amber-500/20'
          }`}>
            <Wallet className={`w-4 h-4 ${
              isPublished ? 'text-green-400' : isFunded ? 'text-purple-400' : 'text-amber-400'
            }`} />
          </div>
          <div className="min-w-0">
            <p className="text-white font-semibold text-sm truncate">{wallet.name || 'Unnamed Wallet'}</p>
            <p className="text-white/30 text-[10px]">Mainnet · {wallet.id?.slice(0, 8)}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {isPublished ? (
            <span className="text-[9px] bg-green-500/20 text-green-300 border border-green-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
              <CheckCircle className="w-2.5 h-2.5" /> DID Live
            </span>
          ) : isFunded ? (
            <span className="text-[9px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full">
              Ready to Publish
            </span>
          ) : (
            <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full">
              Needs Funding
            </span>
          )}
        </div>
      </div>

      {/* Address */}
      <div className="bg-black/20 border border-white/10 rounded-xl px-3 py-2 flex items-center gap-2">
        <p className="text-purple-300 font-mono text-[11px] break-all flex-1 select-all">{wallet.classic_address}</p>
        <button onClick={handleCopy} className="text-white/30 hover:text-white transition flex-shrink-0">
          {copied ? <CheckCircle className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Balance */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-bold ${liveBalance >= 13 ? 'text-green-300' : liveBalance > 0 ? 'text-amber-300' : 'text-red-300'}`}>
            {liveBalance.toFixed(4)} XRP
          </span>
          {!isFunded && (
            <span className="text-red-300/60 text-[10px]">Need 13 XRP</span>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={handleRefreshBalance} disabled={refreshing}
          className="text-white/30 hover:text-white h-6 gap-1 text-[10px]">
          <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      {/* Actions based on state */}
      {isPublished || publishResult?.success ? (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-green-300 text-xs">
            <CheckCircle className="w-3.5 h-3.5" />
            <span className="font-semibold">DID Published on XRPL Mainnet</span>
          </div>
          {(wallet.published_txid || publishResult?.txid) && (
            <a href={`https://xrpscan.com/tx/${wallet.published_txid || publishResult.txid}`}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-[10px] text-blue-400 hover:text-blue-300">
              <ExternalLink className="w-3 h-3" /> View TX on XRPScan
            </a>
          )}
        </div>
      ) : !isFunded ? (
        <div className="space-y-2">
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-amber-300 text-xs font-semibold">Fund This Wallet</p>
              <p className="text-amber-200/50 text-[10px]">
                Send at least <strong>13 XRP</strong> to the address above (12 XRP reserve + 1 XRP for DID publishing). Then refresh and publish.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <Button
            onClick={handlePublishDID}
            disabled={publishing}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white gap-2"
          >
            {publishing ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Publishing DID on-chain…</>
            ) : (
              <><Globe className="w-4 h-4" /> Publish DID to Mainnet</>
            )}
          </Button>
          {publishResult?.error && (
            <p className="text-[10px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {publishResult.error}
            </p>
          )}
        </div>
      )}

      {/* Explorer link */}
      {liveBalance > 0 && (
        <a href={`https://xrpscan.com/account/${wallet.classic_address}`}
          target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-[10px] text-blue-400 hover:text-blue-300">
          <ExternalLink className="w-3 h-3" /> View on XRPScan
        </a>
      )}
    </div>
  );
}