import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Smartphone, Loader2, CheckCircle, X, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function XummImportWallet({ onComplete, onClose }) {
  const [step, setStep] = useState('idle'); // idle | qr | polling | done
  const [qrPng, setQrPng] = useState(null);
  const [deeplink, setDeeplink] = useState(null);
  const [payloadId, setPayloadId] = useState(null);
  const [walletName, setWalletName] = useState('');
  const [resolvedAddress, setResolvedAddress] = useState(null);
  const pollRef = useRef(null);

  const handleStartSignIn = async () => {
    setStep('qr');
    try {
      const res = await base44.functions.invoke('xummSignIn', {});
      const data = res?.data;
      if (!data?.payload_id) {
        toast.error('Failed to create Xumm sign-in request');
        setStep('idle');
        return;
      }
      setPayloadId(data.payload_id);
      setQrPng(data.qr_png);
      setDeeplink(data.deeplink);
      setStep('polling');
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Xumm connection failed');
      setStep('idle');
    }
  };

  // Poll for Xumm scan result
  useEffect(() => {
    if (step !== 'polling' || !payloadId) return;

    let attempts = 0;
    pollRef.current = setInterval(async () => {
      attempts++;
      if (attempts > 120) { // 2 minutes
        clearInterval(pollRef.current);
        toast.error('Xumm sign-in expired');
        setStep('idle');
        return;
      }
      try {
        const res = await base44.functions.invoke('xummCheckPayload', { payload_id: payloadId });
        const data = res?.data;
        if (data?.expired) {
          clearInterval(pollRef.current);
          toast.error('Xumm sign-in expired');
          setStep('idle');
          return;
        }
        if (data?.resolved && data?.account) {
          clearInterval(pollRef.current);
          setResolvedAddress(data.account);
          setStep('done');
        }
      } catch (_) {}
    }, 1500);

    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [step, payloadId]);

  const handleSaveWallet = async () => {
    if (!resolvedAddress || !walletName.trim()) {
      toast.error('Please enter a wallet name');
      return;
    }
    try {
      const user = await base44.auth.me();
      await base44.entities.Wallet.create({
        name: walletName.trim(),
        classic_address: resolvedAddress,
        network: 'mainnet',
        owner_id: user.id,
        balance: 0,
      });
      toast.success(`Wallet "${walletName}" imported from Xumm`);
      onComplete?.();
    } catch (e) {
      toast.error('Failed to save wallet');
    }
  };

  return (
    <div className="bg-white/5 border border-cyan-500/30 rounded-2xl p-4 sm:p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold text-sm flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-cyan-400" /> Import Wallet via Xaman (Xumm)
        </h3>
        <button onClick={onClose} className="text-white/30 hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>

      {step === 'idle' && (
        <div className="space-y-3">
          <p className="text-white/50 text-xs">Scan a QR code with the Xaman app to import your XRPL wallet address into SoulBridge.</p>
          <Button onClick={handleStartSignIn}
            className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white gap-2 text-sm">
            <QrCode className="w-4 h-4" /> Generate Xaman QR Code
          </Button>
        </div>
      )}

      {(step === 'qr' || step === 'polling') && (
        <div className="space-y-3 text-center">
          {qrPng ? (
            <>
              <div className="bg-white rounded-xl p-3 inline-block mx-auto">
                <img src={qrPng} alt="Xumm QR" className="w-48 h-48" />
              </div>
              <p className="text-cyan-300/70 text-xs">Scan with Xaman app to sign in</p>
              {deeplink && (
                <a href={deeplink} target="_blank" rel="noopener noreferrer"
                  className="text-cyan-400 text-xs hover:text-cyan-300 underline">
                  Or open in Xaman directly →
                </a>
              )}
              <div className="flex items-center justify-center gap-2 text-white/40 text-xs">
                <Loader2 className="w-3 h-3 animate-spin" /> Waiting for scan...
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
            </div>
          )}
        </div>
      )}

      {step === 'done' && resolvedAddress && (
        <div className="space-y-3">
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3 text-center space-y-1">
            <CheckCircle className="w-6 h-6 text-green-400 mx-auto" />
            <p className="text-green-300 text-xs font-semibold">Wallet Signed In!</p>
            <p className="text-green-300/60 font-mono text-[10px] break-all">{resolvedAddress}</p>
          </div>
          <div>
            <label className="text-white/40 text-[10px] mb-1 block">Wallet Name</label>
            <input type="text" value={walletName} onChange={e => setWalletName(e.target.value)}
              placeholder="e.g. My Xaman Wallet"
              className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-cyan-400/60" />
          </div>
          <Button onClick={handleSaveWallet} disabled={!walletName.trim()}
            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white gap-2 text-sm">
            <CheckCircle className="w-4 h-4" /> Save Wallet to SoulBridge
          </Button>
        </div>
      )}
    </div>
  );
}