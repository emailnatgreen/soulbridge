import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, CheckCircle, XCircle, ExternalLink, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function XummTrustlineFlow({ wallet, rlusdBalance, onComplete }) {
  const [step, setStep] = useState('idle'); // idle | charging | signing | verifying | success | rejected | error
  const [payload, setPayload] = useState(null);
  const [txHash, setTxHash] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const pollRef = useRef(null);

  const cleanup = () => { if (pollRef.current) clearInterval(pollRef.current); };
  useEffect(() => cleanup, []);

  const handleActivate = async () => {
    setStep('charging');
    setErrorMsg(null);

    const res = await base44.functions.invoke('activateRLUSDGate', {
      action: 'activate',
      wallet_id: wallet.id,
    });
    const data = res.data;

    if (data.error) {
      setStep('error');
      setErrorMsg(data.error);
      toast.error(data.error);
      return;
    }

    setPayload(data);
    setStep('signing');
    toast.info('Open Xaman to sign the trustline transaction');

    // Poll for verification
    pollRef.current = setInterval(async () => {
      const vRes = await base44.functions.invoke('activateRLUSDGate', {
        action: 'verify',
        uuid: data.uuid,
        wallet_id: wallet.id,
      });
      const v = vRes.data;

      if (v.signed && v.success) {
        cleanup();
        setTxHash(v.tx_hash);
        setStep('success');
        toast.success('RLUSD trustline activated!');
        onComplete?.();
      } else if (v.rejected) {
        cleanup();
        setStep('rejected');
        toast.info('Transaction rejected — RLUSD refunded');
        onComplete?.();
      }
    }, 4000);
  };

  if (step === 'idle') {
    return (
      <div className="space-y-4">
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Activation Cost</span>
            <span className="text-white font-bold">12 RLUSD</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Your Balance</span>
            <span className={`font-bold ${rlusdBalance >= 12 ? 'text-emerald-400' : 'text-red-400'}`}>
              {rlusdBalance?.toFixed(2) || '0'} RLUSD
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Target Wallet</span>
            <span className="text-white font-mono text-xs">
              {wallet.classic_address?.slice(0, 8)}…{wallet.classic_address?.slice(-6)}
            </span>
          </div>
        </div>

        <Button
          onClick={handleActivate}
          disabled={rlusdBalance < 12}
          className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold"
        >
          {rlusdBalance < 12 ? 'Insufficient RLUSD' : 'Activate Trustline — 12 RLUSD'}
        </Button>

        {rlusdBalance < 12 && (
          <p className="text-xs text-red-400 text-center">
            You need {(12 - (rlusdBalance || 0)).toFixed(2)} more RLUSD to activate
          </p>
        )}
      </div>
    );
  }

  if (step === 'charging') {
    return (
      <div className="flex flex-col items-center gap-3 py-8">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
        <p className="text-sm text-slate-300">Charging 12 RLUSD & preparing Xaman payload…</p>
      </div>
    );
  }

  if (step === 'signing' && payload) {
    return (
      <div className="space-y-4">
        <div className="text-center space-y-2">
          <p className="text-sm text-slate-300 font-semibold">Scan with Xaman to sign</p>
          <p className="text-xs text-slate-500">12 RLUSD charged — awaiting your signature</p>
        </div>

        {payload.qr_png && (
          <div className="flex justify-center">
            <div className="bg-white rounded-2xl p-3">
              <img src={payload.qr_png} alt="Xaman QR" className="w-48 h-48" />
            </div>
          </div>
        )}

        {payload.deeplink && (
          <a
            href={payload.deeplink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 transition"
          >
            <ExternalLink className="w-4 h-4" /> Open in Xaman App
          </a>
        )}

        <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
          <Loader2 className="w-3 h-3 animate-spin" /> Waiting for signature…
        </div>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="flex flex-col items-center gap-3 py-8">
        <div className="p-3 rounded-full bg-emerald-500/20">
          <CheckCircle className="w-10 h-10 text-emerald-400" />
        </div>
        <p className="text-lg font-bold text-emerald-300">Trustline Activated!</p>
        <p className="text-xs text-slate-400">
          {wallet.classic_address?.slice(0, 8)}… now holds an RLUSD trustline
        </p>
        {txHash && (
          <a
            href={`https://xrpscan.com/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300"
          >
            <ExternalLink className="w-3 h-3" /> View on XRPScan
          </a>
        )}
      </div>
    );
  }

  if (step === 'rejected') {
    return (
      <div className="flex flex-col items-center gap-3 py-8">
        <div className="p-3 rounded-full bg-amber-500/20">
          <XCircle className="w-10 h-10 text-amber-400" />
        </div>
        <p className="text-lg font-bold text-amber-300">Transaction Rejected</p>
        <p className="text-xs text-slate-400">Your 12 RLUSD has been refunded</p>
        <Button onClick={() => setStep('idle')} variant="outline" size="sm" className="mt-2 border-white/10 text-white">
          Try Again
        </Button>
      </div>
    );
  }

  // error
  return (
    <div className="flex flex-col items-center gap-3 py-8">
      <div className="p-3 rounded-full bg-red-500/20">
        <XCircle className="w-10 h-10 text-red-400" />
      </div>
      <p className="text-sm text-red-300 font-semibold">Activation Failed</p>
      <p className="text-xs text-slate-400 text-center max-w-xs">{errorMsg}</p>
      <Button onClick={() => setStep('idle')} variant="outline" size="sm" className="mt-2 border-white/10 text-white">
        Try Again
      </Button>
    </div>
  );
}