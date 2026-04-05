import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { ArrowDownUp, Loader2, ExternalLink, CheckCircle, XCircle, QrCode, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const VILLAGE_FEE = 1; // 1%

export default function DexSwapPanel({ wallets }) {
  const [direction, setDirection] = useState('xrp_to_rlusd');
  const [amount, setAmount] = useState('');
  const [selectedWallet, setSelectedWallet] = useState('');
  const [preparing, setPreparing] = useState(false);
  const [payloadData, setPayloadData] = useState(null);
  const [polling, setPolling] = useState(false);
  const [result, setResult] = useState(null);
  const pollRef = useRef(null);

  // Pick wallet with a classic_address
  const validWallets = (wallets || []).filter(w => w.classic_address);

  useEffect(() => {
    if (validWallets.length > 0 && !selectedWallet) {
      setSelectedWallet(validWallets[0].classic_address);
    }
  }, [validWallets.length]);

  // Cleanup polling on unmount
  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const numAmount = parseFloat(amount) || 0;
  const feeAmount = numAmount * (VILLAGE_FEE / 100);
  const netAmount = numAmount - feeAmount;

  const fromLabel = direction === 'xrp_to_rlusd' ? 'XRP' : 'RLUSD';
  const toLabel = direction === 'xrp_to_rlusd' ? 'RLUSD' : 'XRP';

  const handleFlip = () => {
    setDirection(d => d === 'xrp_to_rlusd' ? 'rlusd_to_xrp' : 'xrp_to_rlusd');
    setPayloadData(null);
    setResult(null);
  };

  const handleSwap = async () => {
    if (numAmount <= 0) { toast.error('Enter an amount'); return; }
    if (!selectedWallet) { toast.error('Select a wallet'); return; }
    setPreparing(true);
    setPayloadData(null);
    setResult(null);

    const res = await base44.functions.invoke('prepareDexSwap', {
      wallet_address: selectedWallet,
      direction,
      amount: numAmount,
    });

    const data = res?.data;
    if (data?.error) {
      toast.error(data.error);
      setPreparing(false);
      return;
    }

    setPayloadData(data);
    setPreparing(false);

    // Open Xumm deeplink
    if (data.xumm_url) {
      window.open(data.xumm_url, '_blank');
    }

    // Start polling for result
    setPolling(true);
    let attempts = 0;
    pollRef.current = setInterval(async () => {
      attempts++;
      if (attempts > 120) { // 2 minutes max
        clearInterval(pollRef.current);
        setPolling(false);
        setResult({ expired: true });
        return;
      }
      const check = await base44.functions.invoke('checkDexSwapStatus', { payload_id: data.payload_id }).catch(() => null);
      const status = check?.data;
      if (status?.resolved || status?.expired || status?.cancelled) {
        clearInterval(pollRef.current);
        setPolling(false);
        setResult(status);
        if (status.success) {
          toast.success('Swap completed successfully!');
        } else if (status.expired) {
          toast.error('Swap request expired');
        } else if (status.cancelled) {
          toast.error('Swap was cancelled');
        } else {
          toast.error(`Swap failed: ${status.dispatched_result || 'Unknown error'}`);
        }
      }
    }, 1000);
  };

  const resetSwap = () => {
    setPayloadData(null);
    setResult(null);
    setAmount('');
    if (pollRef.current) clearInterval(pollRef.current);
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-white font-semibold text-sm flex items-center gap-2">
            <ArrowDownUp className="w-4 h-4 text-cyan-400" /> DEX Swap
          </h3>
          <p className="text-white/30 text-[10px] mt-0.5">XRPL Mainnet · Signed via Xumm · 1% Village Fee</p>
        </div>
        <span className="text-[9px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded-full">Live</span>
      </div>

      {/* Wallet selector */}
      {validWallets.length > 1 && (
        <div>
          <label className="text-white/40 text-[10px] uppercase tracking-widest mb-1 block">From Wallet</label>
          <select
            value={selectedWallet}
            onChange={e => setSelectedWallet(e.target.value)}
            className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-400/60 appearance-none"
          >
            {validWallets.map(w => (
              <option key={w.id} value={w.classic_address} className="bg-slate-900 text-white">
                {w.name || w.classic_address.slice(0, 16) + '…'}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Swap inputs */}
      {!payloadData && !result && (
        <>
          {/* From */}
          <div className="bg-black/30 border border-white/10 rounded-xl p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-white/40 text-[10px] uppercase tracking-widest">You Send</span>
              <span className="text-xs font-bold text-white/60">{fromLabel}</span>
            </div>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0.00"
              min="0"
              step="0.01"
              className="w-full bg-transparent text-white text-2xl font-bold placeholder:text-white/15 focus:outline-none"
            />
          </div>

          {/* Flip button */}
          <div className="flex justify-center -my-2 z-10 relative">
            <button
              onClick={handleFlip}
              className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center hover:bg-cyan-500/30 transition-colors"
            >
              <ArrowDownUp className="w-4 h-4 text-cyan-300" />
            </button>
          </div>

          {/* To */}
          <div className="bg-black/30 border border-white/10 rounded-xl p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-white/40 text-[10px] uppercase tracking-widest">You Receive (approx)</span>
              <span className="text-xs font-bold text-white/60">{toLabel}</span>
            </div>
            <p className="text-white text-2xl font-bold">{netAmount > 0 ? netAmount.toFixed(4) : '0.00'}</p>
          </div>

          {/* Fee breakdown */}
          {numAmount > 0 && (
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl px-3 py-2 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/40">Village Fee (1% · Law 6)</span>
                <span className="text-amber-300 font-mono">{feeAmount.toFixed(6)} {fromLabel}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/40">Net swap amount</span>
                <span className="text-white font-mono">{netAmount.toFixed(6)} {fromLabel}</span>
              </div>
              <div className="flex items-center gap-1 text-[9px] text-white/30 mt-1">
                <AlertTriangle className="w-2.5 h-2.5" />
                <span>Actual received amount depends on XRPL DEX order book liquidity</span>
              </div>
            </div>
          )}

          {/* Submit */}
          <Button
            onClick={handleSwap}
            disabled={preparing || numAmount <= 0}
            className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white gap-2 text-sm h-12"
          >
            {preparing ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Creating Xumm Payload…</>
            ) : (
              <><ArrowDownUp className="w-4 h-4" /> Swap {fromLabel} → {toLabel} via Xumm</>
            )}
          </Button>
        </>
      )}

      {/* Xumm signing state */}
      {payloadData && !result && (
        <div className="space-y-4 text-center">
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 space-y-3">
            <QrCode className="w-8 h-8 text-blue-300 mx-auto" />
            <p className="text-white font-semibold text-sm">Sign in Xumm</p>
            <p className="text-white/40 text-xs">Open Xumm on your device and approve the transaction.</p>
            {payloadData.qr_png && (
              <img src={payloadData.qr_png} alt="Xumm QR" className="w-40 h-40 mx-auto rounded-xl border border-white/10" />
            )}
            {polling && (
              <div className="flex items-center justify-center gap-2 text-xs text-blue-300">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Waiting for signature…
              </div>
            )}
          </div>
          {payloadData.xumm_url && (
            <a href={payloadData.xumm_url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300">
              <ExternalLink className="w-3 h-3" /> Open in Xumm
            </a>
          )}
          <Button variant="ghost" size="sm" onClick={resetSwap} className="text-white/30 hover:text-white text-xs">
            Cancel & Start Over
          </Button>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="space-y-3">
          {result.success ? (
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-center space-y-2">
              <CheckCircle className="w-8 h-8 text-green-400 mx-auto" />
              <p className="text-green-300 font-semibold text-sm">Swap Completed!</p>
              {result.txid && (
                <a href={`https://xrpscan.com/tx/${result.txid}`} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300">
                  <ExternalLink className="w-3 h-3" /> View on XRPScan
                </a>
              )}
            </div>
          ) : (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-center space-y-2">
              <XCircle className="w-8 h-8 text-red-400 mx-auto" />
              <p className="text-red-300 font-semibold text-sm">
                {result.expired ? 'Swap Expired' : result.cancelled ? 'Swap Cancelled' : 'Swap Failed'}
              </p>
              <p className="text-white/40 text-xs">{result.dispatched_result || 'Please try again.'}</p>
            </div>
          )}
          <Button onClick={resetSwap} className="w-full bg-white/10 hover:bg-white/15 text-white gap-2 text-sm">
            New Swap
          </Button>
        </div>
      )}
    </div>
  );
}