import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link2, Loader2, CheckCircle, AlertTriangle, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

export default function TrustlineActivateButton({ wallet, compact = false }) {
  const [status, setStatus] = useState('unknown'); // unknown | checking | active | inactive | activating | error
  const [txHash, setTxHash] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const checkTrustline = async () => {
    if (!wallet?.id) return;
    setStatus('checking');
    try {
      const res = await base44.functions.invoke('getWalletTrustlines', { wallet_id: wallet.id });
      const lines = res?.data?.trustlines || res?.data || [];
      const hasRLUSD = lines.some(
        tl => tl.currency === 'RLUSD' || tl.currency === '524C555344000000000000000000000000000000'
      );
      setStatus(hasRLUSD ? 'active' : 'inactive');
    } catch (_) {
      setStatus('inactive');
    }
  };

  useEffect(() => {
    // Stagger trustline checks to avoid XRPL rate limits when many cards load
    const delay = Math.random() * 3000 + 500;
    const timer = setTimeout(checkTrustline, delay);
    return () => clearTimeout(timer);
  }, [wallet?.id]);

  const handleActivate = async () => {
    setStatus('activating');
    setErrorMsg(null);
    try {
      const res = await base44.functions.invoke('addRLUSDTrustlineManual', { wallet_id: wallet.id });
      const data = res?.data;
      if (data?.success) {
        if (data.already_exists) {
          setStatus('active');
          toast.info('RLUSD trustline already active');
        } else {
          setStatus('active');
          setTxHash(data.transaction_hash);
          toast.success('RLUSD trustline activated!');
        }
      } else {
        setStatus('error');
        setErrorMsg(data?.error || 'Activation failed');
        toast.error(data?.error || 'Failed to activate trustline');
      }
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || 'Activation failed';
      setStatus('error');
      setErrorMsg(msg);
      toast.error(msg);
    }
  };

  if (status === 'checking') {
    return (
      <div className={`flex items-center gap-1.5 ${compact ? 'text-[9px]' : 'text-xs'} text-white/30`}>
        <Loader2 className="w-3 h-3 animate-spin" /> Checking trustline…
      </div>
    );
  }

  if (status === 'active') {
    return (
      <div className={`flex items-center gap-2 ${compact ? '' : 'bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2'}`}>
        <div className="flex items-center gap-1.5">
          <CheckCircle className={`${compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-emerald-400`} />
          <span className={`text-emerald-300 font-semibold ${compact ? 'text-[9px]' : 'text-xs'}`}>RLUSD Trustline Active</span>
        </div>
        {txHash && !compact && (
          <a href={`https://xrpscan.com/tx/${txHash}`} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300 ml-auto">
            <ExternalLink className="w-2.5 h-2.5" /> TX
          </a>
        )}
      </div>
    );
  }

  if (status === 'activating') {
    return (
      <div className={`flex items-center gap-2 ${compact ? '' : 'bg-cyan-500/10 border border-cyan-500/20 rounded-xl px-3 py-2.5'}`}>
        <Loader2 className={`${compact ? 'w-3 h-3' : 'w-4 h-4'} text-cyan-400 animate-spin`} />
        <span className={`text-cyan-300 ${compact ? 'text-[9px]' : 'text-xs'} font-semibold`}>Activating RLUSD trustline on-chain…</span>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="space-y-2">
        <div className={`flex items-center gap-2 ${compact ? '' : 'bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2'}`}>
          <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
          <span className="text-red-300 text-xs">{errorMsg || 'Trustline activation failed'}</span>
        </div>
        <button onClick={handleActivate}
          className="flex items-center gap-1.5 text-[10px] text-cyan-400 hover:text-cyan-300 transition">
          <Link2 className="w-3 h-3" /> Retry Activation
        </button>
      </div>
    );
  }

  // inactive
  return (
    <button onClick={handleActivate}
      className={`flex items-center gap-2 w-full transition ${
        compact
          ? 'text-[10px] text-cyan-400 hover:text-cyan-300'
          : 'bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 rounded-xl px-3 py-2.5 text-xs text-cyan-300 font-semibold'
      }`}>
      <Link2 className={`${compact ? 'w-3 h-3' : 'w-4 h-4'}`} />
      Activate RLUSD Trustline
    </button>
  );
}