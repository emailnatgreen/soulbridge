import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Globe, Loader2, CheckCircle, X, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function XummDIDSignPanel({ wallet, onComplete, onClose }) {
  const [step, setStep] = useState('idle'); // idle | qr | polling | done | error
  const [qrPng, setQrPng] = useState(null);
  const [deeplink, setDeeplink] = useState(null);
  const [payloadId, setPayloadId] = useState(null);
  const [txHash, setTxHash] = useState(null);
  const pollRef = useRef(null);

  const handleStartSign = async () => {
    setStep('qr');
    try {
      const res = await base44.functions.invoke('xummSignDIDSet', { wallet_id: wallet.id });
      const data = res?.data;
      if (!data?.uuid) {
        toast.error(data?.error || 'Failed to create DIDSet payload');
        setStep('idle');
        return;
      }
      setPayloadId(data.uuid);
      setQrPng(data.qr_png);
      setDeeplink(data.deeplink);
      setStep('polling');
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Xumm DIDSet failed');
      setStep('idle');
    }
  };

  useEffect(() => {
    if (step !== 'polling' || !payloadId) return;

    let attempts = 0;
    pollRef.current = setInterval(async () => {
      attempts++;
      if (attempts > 120) {
        clearInterval(pollRef.current);
        toast.error('DIDSet signing expired');
        setStep('idle');
        return;
      }
      try {
        const res = await base44.functions.invoke('xummCheckPayload', { payload_id: payloadId });
        const data = res?.data;
        if (data?.expired) {
          clearInterval(pollRef.current);
          toast.error('DIDSet signing expired');
          setStep('idle');
          return;
        }
        if (data?.resolved) {
          clearInterval(pollRef.current);
          // Update wallet record
          await base44.entities.Wallet.update(wallet.id, {
            is_published: true,
            published_at: new Date().toISOString(),
          });
          setStep('done');
          toast.success('DID published via Xaman!');
        }
      } catch (_) {}
    }, 1500);

    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [step, payloadId]);

  return (
    <div className="bg-purple-500/5 border border-purple-500/30 rounded-xl p-4 space-y-3 animate-in fade-in">
      <div className="flex items-center justify-between">
        <h4 className="text-white font-semibold text-xs flex items-center gap-1.5">
          <Globe className="w-3.5 h-3.5 text-purple-400" /> Publish DID via Xaman
        </h4>
        <button onClick={onClose} className="text-white/30 hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>

      {step === 'idle' && (
        <div className="space-y-2">
          <p className="text-white/50 text-[10px]">Sign a DIDSet transaction with your Xaman app to publish this wallet's DID on XRPL mainnet.</p>
          <Button onClick={handleStartSign}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white gap-2 text-sm">
            <Globe className="w-4 h-4" /> Sign DIDSet with Xaman
          </Button>
        </div>
      )}

      {(step === 'qr' || step === 'polling') && (
        <div className="space-y-3 text-center">
          {qrPng ? (
            <>
              <div className="bg-white rounded-xl p-3 inline-block mx-auto">
                <img src={qrPng} alt="DIDSet QR" className="w-40 h-40" />
              </div>
              <p className="text-purple-300/70 text-[10px]">Scan with Xaman to sign the DIDSet transaction</p>
              {deeplink && (
                <a href={deeplink} target="_blank" rel="noopener noreferrer"
                  className="text-purple-400 text-[10px] hover:text-purple-300 underline">
                  Open in Xaman →
                </a>
              )}
              <div className="flex items-center justify-center gap-2 text-white/40 text-[10px]">
                <Loader2 className="w-3 h-3 animate-spin" /> Waiting for signature...
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
            </div>
          )}
        </div>
      )}

      {step === 'done' && (
        <div className="space-y-2 text-center">
          <CheckCircle className="w-8 h-8 text-green-400 mx-auto" />
          <p className="text-green-300 text-xs font-semibold">DID Published via Xaman!</p>
          <a href={`https://xrpscan.com/account/${wallet.classic_address}`} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300">
            <ExternalLink className="w-3 h-3" /> Verify on XRPScan
          </a>
          <Button onClick={() => { onComplete?.(); }} size="sm"
            className="w-full bg-white/10 hover:bg-white/15 text-white text-xs mt-2">
            Done
          </Button>
        </div>
      )}
    </div>
  );
}